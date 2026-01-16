// supabase/functions/psa-verify-cert/index.ts
import { createClient } from 'npm:@supabase/supabase-js@2.58.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface VerifyRequest {
  collection_item_id: string;
  cert_number: string;
  expected_card_id: string;
}

function getEnv(name: string): string {
  return Deno.env.get(name) ?? '';
}

function getSupabaseUrl(): string {
  return getEnv('SUPABASE_URL') || getEnv('PROJECT_URL');
}

function getServiceRoleKey(): string {
  return getEnv('SUPABASE_SERVICE_ROLE_KEY') || getEnv('SERVICE_ROLE_KEY');
}

function normalizeString(str: string): string {
  return str.toLowerCase().replace(/[^a-z0-9]/g, '').trim();
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = getSupabaseUrl();
    const serviceKey = getServiceRoleKey();

    if (!supabaseUrl || !serviceKey) {
      return new Response(
        JSON.stringify({
          error:
            'Missing Supabase secrets. Set SUPABASE_URL (or PROJECT_URL) and SUPABASE_SERVICE_ROLE_KEY (or SERVICE_ROLE_KEY) in your Edge Function secrets.',
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseClient = createClient(supabaseUrl, serviceKey);

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const {
      data: { user },
      error: authError,
    } = await supabaseClient.auth.getUser(token);

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body: VerifyRequest = await req.json();
    const { collection_item_id, cert_number, expected_card_id } = body;

    if (!collection_item_id || !cert_number || !expected_card_id) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: item, error: itemError } = await supabaseClient
      .from('collection_items')
      .select('user_id, card_id')
      .eq('id', collection_item_id)
      .maybeSingle();

    if (itemError || !item) {
      return new Response(JSON.stringify({ error: 'Collection item not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (item.user_id !== user.id) {
      return new Response(JSON.stringify({ error: 'Not authorized to verify this item' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: cardData, error: cardError } = await supabaseClient
      .from('tcg_cards')
      .select('id, name, set_id, number, raw')
      .eq('id', expected_card_id)
      .maybeSingle();

    if (cardError || !cardData) {
      return new Response(JSON.stringify({ error: 'Card not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: setData } = await supabaseClient
      .from('tcg_sets')
      .select('name, release_date')
      .eq('id', cardData.set_id)
      .maybeSingle();

    const psaApiBase = getEnv('PSA_API_BASE_URL') || 'https://api.psacard.com/publicapi';
    const psaBearerToken = getEnv('PSA_BEARER_TOKEN');

    const psaUrl = `${psaApiBase}/cert/GetByCertNumber/${cert_number}`;
    const psaHeaders: Record<string, string> = { 'Content-Type': 'application/json' };
    if (psaBearerToken) psaHeaders['Authorization'] = `Bearer ${psaBearerToken}`;

    const psaResponse = await fetch(psaUrl, { headers: psaHeaders });

    if (!psaResponse.ok) {
      await supabaseClient
        .from('collection_items')
        .update({ psa_verified: false, psa_verified_at: null, psa_payload: null })
        .eq('id', collection_item_id);

      return new Response(JSON.stringify({ verified: false, error: 'PSA certificate not found or API error' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const psaData = await psaResponse.json();

    const psaCardName = psaData.CardName || psaData.Subject || '';
    const psaYear = psaData.Year || '';
    const psaImageUrl = psaData.FrontImageURL || psaData.ImageURL || null;

    const normalizedExpectedName = normalizeString(cardData.name);
    const normalizedPsaName = normalizeString(psaCardName);

    let nameMatch = normalizedExpectedName === normalizedPsaName;
    if (!nameMatch) {
      nameMatch =
        normalizedExpectedName.includes(normalizedPsaName) || normalizedPsaName.includes(normalizedExpectedName);
    }

    let yearMatch = true;
    if (psaYear && setData?.release_date) {
      const releaseYear = new Date(setData.release_date).getFullYear();
      yearMatch = psaYear.toString() === releaseYear.toString();
    }

    const isMatch = nameMatch && yearMatch;

    await supabaseClient
      .from('collection_items')
      .update({
        psa_verified: isMatch,
        psa_verified_at: isMatch ? new Date().toISOString() : null,
        psa_image_url: isMatch ? psaImageUrl : null,
        psa_payload: psaData,
      })
      .eq('id', collection_item_id);

    return new Response(
      JSON.stringify({
        verified: isMatch,
        psa_image_url: isMatch ? psaImageUrl : null,
        psa_payload: {
          card_name: psaCardName,
          year: psaYear,
          grade: psaData.Grade,
          cert_number: psaData.CertNumber,
        },
        match_details: {
          name_match: nameMatch,
          year_match: yearMatch,
          expected_name: cardData.name,
          psa_name: psaCardName,
        },
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error in psa-verify-cert:', error);
    return new Response(JSON.stringify({ error: error.message || 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
