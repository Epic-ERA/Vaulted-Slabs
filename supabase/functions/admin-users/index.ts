// supabase/functions/admin-users/index.ts
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

async function isAdminUser(supabaseClient: any, user: any): Promise<boolean> {
  if (user?.app_metadata?.role === 'admin') return true;

  try {
    const { data, error } = await supabaseClient
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .maybeSingle();

    return !error && data !== null;
  } catch {
    return false;
  }
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

    const isAdmin = await isAdminUser(supabaseClient, user);
    if (!isAdmin) throw new Error('Forbidden: Admin access required');

    const { action, userId, role } = await req.json();

    if (action === 'list') {
      const { data, error: listError } = await supabaseClient.auth.admin.listUsers();
      if (listError) throw listError;

      // Optional roles table mapping (if it exists)
      let roleMap = new Map<string, string>();
      try {
        const { data: userRoles } = await supabaseClient.from('user_roles').select('user_id, role');
        roleMap = new Map(userRoles?.map((r: any) => [r.user_id, r.role]) || []);
      } catch {
        // ignore if user_roles doesn't exist
      }

      const usersData = (data?.users || []).map((u: any) => ({
        id: u.id,
        email: u.email || '',
        created_at: u.created_at,
        last_sign_in_at: u.last_sign_in_at,
        app_metadata: { ...(u.app_metadata || {}), role: roleMap.get(u.id) || u.app_metadata?.role || 'user' },
      }));

      return new Response(JSON.stringify({ users: usersData }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'setRole') {
      if (!userId || !role) throw new Error('Missing userId or role');
      if (role !== 'admin' && role !== 'user') throw new Error('Invalid role. Must be "admin" or "user"');

      // Always update app_metadata so your auth-based admin check works
      const { error: metaError } = await supabaseClient.auth.admin.updateUserById(userId, {
        app_metadata: { role },
      });
      if (metaError) throw metaError;

      // Also try to persist in user_roles if present (no hard fail)
      try {
        await supabaseClient.from('user_roles').upsert({ user_id: userId, role }, { onConflict: 'user_id' });
      } catch {
        // ignore
      }

      return new Response(
        JSON.stringify({ success: true, message: `User role updated to ${role}` }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    throw new Error('Invalid action');
  } catch (error: any) {
    console.error('Error in admin-users:', error);
    return new Response(JSON.stringify({ error: error.message || 'Internal server error' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
