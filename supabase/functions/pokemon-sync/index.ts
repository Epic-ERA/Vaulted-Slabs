// supabase/functions/pokemon-sync/index.ts
import { createClient } from 'npm:@supabase/supabase-js@2.58.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey, apikey',
};

interface SyncRequest {
  sets?: string[];
  fullSync?: boolean;
}

function json(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function getEnv(name: string) {
  return (Deno.env.get(name) ?? '').trim();
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    // ✅ Support both naming schemes (Bolt/Supabase)
    const SUPABASE_URL = getEnv('SUPABASE_URL') || getEnv('PROJECT_URL');
    const SERVICE_ROLE =
      getEnv('SUPABASE_SERVICE_ROLE_KEY') || getEnv('SERVICE_ROLE_KEY');

    if (!SUPABASE_URL) {
      return json(500, { error: 'Missing SUPABASE_URL / PROJECT_URL secret' });
    }
    if (!SERVICE_ROLE) {
      return json(500, { error: 'Missing SUPABASE_SERVICE_ROLE_KEY / SERVICE_ROLE_KEY secret' });
    }

    const supabaseClient = createClient(SUPABASE_URL, SERVICE_ROLE);

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return json(401, { error: 'Missing authorization' });
    }

    const token = authHeader.replace('Bearer ', '').trim();
    const {
      data: { user },
      error: authError,
    } = await supabaseClient.auth.getUser(token);

    if (authError || !user) {
      return json(401, { error: 'Unauthorized' });
    }

    // ✅ FIX: Do NOT rely on user_roles table. Use app_metadata like your UI expects.
    const isAdmin =
      (user.app_metadata as any)?.role === 'admin' ||
      user.email === 'metauogaming@gmail.com'; // optional safety fallback for your bootstrap email

    if (!isAdmin) {
      return json(403, { error: 'Admin access required' });
    }

    const syncLogId = crypto.randomUUID();

    // Don’t let a sync_logs failure kill the whole job (but still try)
    await supabaseClient.from('sync_logs').insert({
      id: syncLogId,
      job_name: 'pokemon_tcg_sync',
      status: 'running',
      details: { started_by: user.id },
    });

    const body: SyncRequest = req.method === 'POST' ? await req.json().catch(() => ({})) : {};

    const pokemonApiKey = getEnv('POKEMONTCG_API_KEY');
    const pokemonBaseUrl = getEnv('POKEMONTCG_API_BASE_URL') || 'https://api.pokemontcg.io/v2';

    const starterSets = ['base1', 'base2', 'base3', 'base4', 'base5', 'gym1', 'gym2', 'basep'];
    const setsToSync = body.fullSync ? null : body.sets || starterSets;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (pokemonApiKey) headers['X-Api-Key'] = pokemonApiKey;

    // -----------------------
    // Fetch all sets
    // -----------------------
    let allSets: any[] = [];
    let page = 1;
    let hasMore = true;

    while (hasMore) {
      const setsUrl = `${pokemonBaseUrl}/sets?page=${page}&pageSize=250`;
      const setsResponse = await fetch(setsUrl, { headers });

      if (!setsResponse.ok) {
        const txt = await setsResponse.text().catch(() => '');
        throw new Error(`PokemonTCG sets fetch failed: ${setsResponse.status} ${txt}`);
      }

      const setsData = await setsResponse.json();

      if (setsData?.data?.length) {
        allSets = allSets.concat(setsData.data);
        page++;
        hasMore = setsData.data.length === 250;
      } else {
        hasMore = false;
      }
    }

    const filteredSets = setsToSync ? allSets.filter((set) => setsToSync.includes(set.id)) : allSets;

    const setsToUpsert = filteredSets.map((set) => ({
      id: set.id,
      name: set.name,
      series: set.series,
      printed_total: set.printedTotal,
      total: set.total,
      release_date: set.releaseDate,
      symbol_url: set.images?.symbol,
      logo_url: set.images?.logo,
      // NOTE: your baseline schema may not have these columns; if you do have them, keep them.
      // updated_at_api: set.updatedAt,
      // raw: set,
    }));

    if (setsToUpsert.length > 0) {
      const { error: upsertSetsError } = await supabaseClient.from('tcg_sets').upsert(setsToUpsert);
      if (upsertSetsError) throw upsertSetsError;
    }

    // -----------------------
    // Fetch cards per set
    // -----------------------
    let totalCards = 0;

    for (const set of filteredSets) {
      let cardPage = 1;
      let hasMoreCards = true;

      while (hasMoreCards) {
        const cardsUrl = `${pokemonBaseUrl}/cards?q=set.id:${set.id}&page=${cardPage}&pageSize=250`;
        const cardsResponse = await fetch(cardsUrl, { headers });

        if (!cardsResponse.ok) {
          const txt = await cardsResponse.text().catch(() => '');
          throw new Error(`PokemonTCG cards fetch failed (${set.id}): ${cardsResponse.status} ${txt}`);
        }

        const cardsData = await cardsResponse.json();

        if (cardsData?.data?.length) {
          const cardsToUpsert = cardsData.data.map((card: any) => ({
            id: card.id,
            set_id: set.id,
            number: card.number,
            name: card.name,
            rarity: card.rarity,
            supertype: card.supertype,
            // NOTE: your baseline schema has "subtype" not "subtypes/types arrays".
            // Keep only what exists in your table to avoid 500 errors.
            // subtype: (card.subtypes?.[0] ?? null),
            small_image_url: card.images?.small,
            large_image_url: card.images?.large,
            // api_updated_at: card.updatedAt,
            // raw: card,
          }));

          const { error: upsertCardsError } = await supabaseClient.from('tcg_cards').upsert(cardsToUpsert);
          if (upsertCardsError) throw upsertCardsError;

          totalCards += cardsToUpsert.length;
          cardPage++;
          hasMoreCards = cardsData.data.length === 250;
        } else {
          hasMoreCards = false;
        }
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
        },
      })
      .eq('id', syncLogId);

    return json(200, {
      success: true,
      sets_synced: filteredSets.length,
      cards_synced: totalCards,
    });
  } catch (error: any) {
    console.error('Error in pokemon-sync:', error);

    // Best effort update logs if possible (don’t crash if it fails)
    try {
      const SUPABASE_URL = getEnv('SUPABASE_URL') || getEnv('PROJECT_URL');
      const SERVICE_ROLE =
        getEnv('SUPABASE_SERVICE_ROLE_KEY') || getEnv('SERVICE_ROLE_KEY');

      if (SUPABASE_URL && SERVICE_ROLE) {
        const supabaseClient = createClient(SUPABASE_URL, SERVICE_ROLE);
        await supabaseClient
          .from('sync_logs')
          .update({
            status: 'failed',
            finished_at: new Date().toISOString(),
            error_message: error?.message || String(error),
          })
          .eq('status', 'running')
          .eq('job_name', 'pokemon_tcg_sync');
      }
    } catch {}

    return json(500, { error: error?.message || 'Internal server error' });
  }
});
