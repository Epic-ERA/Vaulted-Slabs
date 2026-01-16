// supabase/functions/admin-bootstrap/index.ts
import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

function getEnv(name: string): string {
  return Deno.env.get(name) ?? '';
}

function getSupabaseUrl(): string {
  return getEnv('SUPABASE_URL') || getEnv('PROJECT_URL');
}

function getServiceRoleKey(): string {
  return getEnv('SUPABASE_SERVICE_ROLE_KEY') || getEnv('SERVICE_ROLE_KEY');
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('Missing authorization header');

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

    const token = authHeader.replace('Bearer ', '');
    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser(token);

    if (userError || !user) throw new Error('Unauthorized');

    // Only bootstrap THIS email as admin
    if (user.email === 'metauogaming@gmail.com') {
      const { error: updateError } = await supabaseClient.auth.admin.updateUserById(user.id, {
        app_metadata: { role: 'admin' },
      });

      if (updateError) throw updateError;

      // Optional: also persist in user_roles if present
      try {
        await supabaseClient
          .from('user_roles')
          .upsert({ user_id: user.id, role: 'admin' }, { onConflict: 'user_id' });
      } catch {
        // ignore
      }

      return new Response(JSON.stringify({ success: true, message: 'Admin role granted' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ success: true, message: 'Bootstrap check completed' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('Error in admin-bootstrap:', error);
    return new Response(JSON.stringify({ error: error.message || 'Internal server error' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
