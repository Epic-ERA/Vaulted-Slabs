// supabase/functions/pokemon-sync/index.ts
import { createClient } from 'npm:@supabase/supabase-js@2.58.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface SyncRequest {
  sets?: string[];
  fullSync?: boolean;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

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

    // Check if user is admin by querying the user_roles table
    const { data: roleData, error: roleError } = await supabaseClient
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .maybeSingle();

    const isAdmin = !roleError && roleData !== null;
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: 'Admin access required' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const syncLogId = crypto.randomUUID();
    await supabaseClient.from('sync_logs').insert({
      id: syncLogId,
      job_name: 'pokemon_tcg_sync',
      status: 'running',
      details: { started_by: user.id },
    });

    const body: SyncRequest = req.method === 'POST' ? await req.json() : {};
    const pokemonApiKey = Deno.env.get('POKEMONTCG_API_KEY') || '';

    const starterSets = ['base1', 'base2', 'base3', 'base4', 'base5', 'gym1', 'gym2', 'basep'];

    const setsToSync = body.fullSync ? null : body.sets || starterSets;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (pokemonApiKey) {
      headers['X-Api-Key'] = pokemonApiKey;
    }

    let allSets: any[] = [];
    let page = 1;
    let hasMore = true;

    while (hasMore) {
      const setsUrl = `https://api.pokemontcg.io/v2/sets?page=${page}&pageSize=250`;
      const setsResponse = await fetch(setsUrl, { headers });
      const setsData = await setsResponse.json();

      if (setsData.data && setsData.data.length > 0) {
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
      updated_at_api: set.updatedAt,
      symbol_url: set.images?.symbol,
      logo_url: set.images?.logo,
      raw: set,
    }));

    if (setsToUpsert.length > 0) {
      await supabaseClient.from('tcg_sets').upsert(setsToUpsert);
    }

    let totalCards = 0;
    for (const set of filteredSets) {
      let cardPage = 1;
      let hasMoreCards = true;

      while (hasMoreCards) {
        const cardsUrl = `https://api.pokemontcg.io/v2/cards?q=set.id:${set.id}&page=${cardPage}&pageSize=250`;
        const cardsResponse = await fetch(cardsUrl, { headers });
        const cardsData = await cardsResponse.json();

        if (cardsData.data && cardsData.data.length > 0) {
          const cardsToUpsert = cardsData.data.map((card: any) => ({
            id: card.id,
            set_id: set.id,
            number: card.number,
            name: card.name,
            rarity: card.rarity,
            supertype: card.supertype,
            subtypes: card.subtypes || [],
            types: card.types || [],
            national_pokedex_numbers: card.nationalPokedexNumbers || [],
            small_image_url: card.images?.small,
            large_image_url: card.images?.large,
            api_updated_at: card.updatedAt,
            raw: card,
          }));

          await supabaseClient.from('tcg_cards').upsert(cardsToUpsert);
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
  } catch (error) {
    console.error('Error in pokemon-sync:', error);
    return new Response(JSON.stringify({ error: error.message || 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
