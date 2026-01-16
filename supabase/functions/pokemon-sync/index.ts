// supabase/functions/pokemon-sync/index.ts
import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'npm:@supabase/supabase-js@2.58.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SyncRequest {
  sets?: string[];
  fullSync?: boolean;
}

function getEnv(name: string, fallback?: string) {
  return Deno.env.get(name) ?? fallback ?? '';
}

function getSupabaseAdminClient() {
  const supabaseUrl =
    getEnv('PROJECT_URL') || getEnv('SUPABASE_URL'); // support both
  const serviceKey =
    getEnv('SERVICE_ROLE_KEY') || getEnv('SUPABASE_SERVICE_ROLE_KEY'); // support both

  if (!supabaseUrl || !serviceKey) {
    throw new Error('Missing Supabase server env (PROJECT_URL/SERVICE_ROLE_KEY)');
  }

  return createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false },
  });
}

function isAdminUser(user: any) {
  return user?.app_metadata?.role === 'admin';
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { status: 200, headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const supabaseClient = getSupabaseAdminClient();

    const authHeader = req.headers.get('authorization') || req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const token = authHeader.replace('Bearer ', '').trim();
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

    if (!isAdminUser(user)) {
      return new Response(JSON.stringify({ error: 'Admin access required' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body: SyncRequest = await req.json().catch(() => ({}));

    const pokemonApiKey = getEnv('POKEMONTCG_API_KEY');
    const pokemonBaseUrl = getEnv('POKEMONTCG_API_BASE_URL', 'https://api.pokemontcg.io/v2').replace(
      /\/+$/,
      ''
    );

    const starterSets = ['base1', 'base2', 'base3', 'base4', 'base5', 'gym1', 'gym2', 'basep'];
    const requestedSets = body.fullSync ? null : (body.sets && body.sets.length ? body.sets : starterSets);

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (pokemonApiKey) headers['X-Api-Key'] = pokemonApiKey;

    // log start
    const syncLogId = crypto.randomUUID();
    await supabaseClient.from('sync_logs').insert({
      id: syncLogId,
      job_name: 'pokemon-sync',
      status: 'running',
      started_at: new Date().toISOString(),
      details: { started_by: user.id, fullSync: Boolean(body.fullSync) },
      triggered_by: user.id,
    });

    // ---- fetch sets (paged)
    let allSets: any[] = [];
    let page = 1;

    while (true) {
      const setsUrl = `${pokemonBaseUrl}/sets?page=${page}&pageSize=250`;
      const setsResponse = await fetch(setsUrl, { headers });
      if (!setsResponse.ok) throw new Error(`PokemonTCG sets fetch failed: ${setsResponse.status}`);

      const setsJson = await setsResponse.json();
      const batch = setsJson?.data ?? [];
      if (!batch.length) break;

      allSets = allSets.concat(batch);
      if (batch.length < 250) break;
      page++;
    }

    const filteredSets = requestedSets
      ? allSets.filter((s) => requestedSets.includes(s.id))
      : allSets;

    // ✅ Only upsert columns that exist in your current schema
    // tcg_sets: id, name, series, printed_total, total, release_date, logo_url, symbol_url
    const setsToUpsert = filteredSets.map((set) => ({
      id: set.id,
      name: set.name ?? null,
      series: set.series ?? null,
      printed_total: set.printedTotal ?? null,
      total: set.total ?? null,
      release_date: set.releaseDate ?? null,
      logo_url: set.images?.logo ?? null,
      symbol_url: set.images?.symbol ?? null,
    }));

    if (setsToUpsert.length) {
      const { error: upsertSetsError } = await supabaseClient.from('tcg_sets').upsert(setsToUpsert);
      if (upsertSetsError) throw upsertSetsError;
    }

    // ---- fetch cards per set
    let totalCards = 0;

    for (const set of filteredSets) {
      let cardPage = 1;

      while (true) {
        const cardsUrl = `${pokemonBaseUrl}/cards?q=set.id:${set.id}&page=${cardPage}&pageSize=250`;
        const cardsResponse = await fetch(cardsUrl, { headers });
        if (!cardsResponse.ok) throw new Error(`PokemonTCG cards fetch failed: ${cardsResponse.status}`);

        const cardsJson = await cardsResponse.json();
        const batch = cardsJson?.data ?? [];
        if (!batch.length) break;

        // ✅ Only upsert columns that exist in your current schema
        // tcg_cards: id, set_id, name, number, rarity, supertype, subtype, small_image_url, large_image_url
        const cardsToUpsert = batch.map((card: any) => ({
          id: card.id,
          set_id: set.id,
          name: card.name ?? null,
          number: card.number ?? null,
          rarity: card.rarity ?? null,
          supertype: card.supertype ?? null,
          subtype: Array.isArray(card.subtypes) ? (card.subtypes[0] ?? null) : (card.subtype ?? null),
          small_image_url: card.images?.small ?? null,
          large_image_url: card.images?.large ?? null,
        }));

        const { error: upsertCardsError } = await supabaseClient.from('tcg_cards').upsert(cardsToUpsert);
        if (upsertCardsError) throw upsertCardsError;

        totalCards += cardsToUpsert.length;

        if (batch.length < 250) break;
        cardPage++;
      }
    }

    await supabaseClient
      .from('sync_logs')
      .update({
        status: 'success',
        finished_at: new Date().toISOString(),
        details: {
          started_by: user.id,
          sets_synced: filteredSets.length,
          cards_synced: totalCards,
          fullSync: Boolean(body.fullSync),
        },
      })
      .eq('id', syncLogId);

    return new Response(
      JSON.stringify({
        success: true,
        sets_synced: filteredSets.length,
        cards_synced: totalCards,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error: any) {
    console.error('Error in pokemon-sync:', error);
    return new Response(JSON.stringify({ error: error?.message || 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
