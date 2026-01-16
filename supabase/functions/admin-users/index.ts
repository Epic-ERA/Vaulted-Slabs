// supabase/functions/admin-users/index.ts
import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

function envAny(keys: string[]): string {
  for (const k of keys) {
    const v = Deno.env.get(k);
    if (v && v.length > 0) return v;
  }
  return '';
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = envAny(['SUPABASE_URL', 'PROJECT_URL']);
    const serviceKey = envAny(['SUPABASE_SERVICE_ROLE_KEY', 'SERVICE_ROLE_KEY']);

    if (!supabaseUrl || !serviceKey) {
      return new Response(
        JSON.stringify({
          error:
            'Missing server env vars. Need SUPABASE_URL (or PROJECT_URL) and SUPABASE_SERVICE_ROLE_KEY (or SERVICE_ROLE_KEY).',
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseClient = createClient(supabaseUrl, serviceKey);

    const token = authHeader.replace('Bearer ', '').trim();
    const { data: userRes, error: userError } = await supabaseClient.auth.getUser(token);

    const user = userRes?.user;
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ✅ Admin check: app_metadata only (no DB dependency)
    const isAdmin = user.app_metadata?.role === 'admin';
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: 'Forbidden: Admin access required' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { action, userId, role } = await req.json();

    if (action === 'list') {
      const { data, error } = await supabaseClient.auth.admin.listUsers();
      if (error) throw error;

      const users = (data?.users || []).map((u) => ({
        id: u.id,
        email: u.email || '',
        created_at: u.created_at,
        last_sign_in_at: u.last_sign_in_at,
        app_metadata: { role: u.app_metadata?.role || 'user' },
      }));

      return new Response(JSON.stringify({ users }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'setRole') {
      if (!userId || !role) {
        return new Response(JSON.stringify({ error: 'Missing userId or role' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      if (role !== 'admin' && role !== 'user') {
        return new Response(JSON.stringify({ error: 'Invalid role. Must be "admin" or "user"' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // ✅ Primary source of truth: auth app_metadata.role
      const { error: updateError } = await supabaseClient.auth.admin.updateUserById(userId, {
        app_metadata: { role },
      });

      if (updateError) throw updateError;

      // Optional: if you later add user_roles table, keep it in sync (best effort, no hard dependency)
      try {
        await supabaseClient.from('user_roles').upsert({ user_id: userId, role }, { onConflict: 'user_id' });
      } catch {}

      return new Response(JSON.stringify({ success: true, message: `User role updated to ${role}` }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Invalid action' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('Error in admin-users:', error);
    return new Response(JSON.stringify({ error: error?.message || 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
