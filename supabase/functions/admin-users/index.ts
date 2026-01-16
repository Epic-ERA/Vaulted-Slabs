// supabase/functions/admin-users/index.ts
import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'npm:@supabase/supabase-js@2.58.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function getEnv(name: string, fallback?: string) {
  return Deno.env.get(name) ?? fallback ?? '';
}

function getSupabaseAdminClient() {
  const supabaseUrl = getEnv('PROJECT_URL') || getEnv('SUPABASE_URL');
  const serviceKey = getEnv('SERVICE_ROLE_KEY') || getEnv('SUPABASE_SERVICE_ROLE_KEY');

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
    const authHeader = req.headers.get('authorization') || req.headers.get('Authorization');
    if (!authHeader) throw new Error('Missing authorization header');

    const supabaseClient = getSupabaseAdminClient();

    const token = authHeader.replace('Bearer ', '').trim();
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);

    if (userError || !user) throw new Error('Unauthorized');
    if (!isAdminUser(user)) throw new Error('Forbidden: Admin access required');

    const { action, userId, role } = await req.json();

    if (action === 'list') {
      const { data: { users }, error: listError } = await supabaseClient.auth.admin.listUsers();
      if (listError) throw listError;

      const usersData = users.map((u) => ({
        id: u.id,
        email: u.email || '',
        created_at: u.created_at,
        last_sign_in_at: u.last_sign_in_at,
        app_metadata: u.app_metadata || {},
      }));

      return new Response(JSON.stringify({ users: usersData }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'setRole') {
      if (!userId || !role) throw new Error('Missing userId or role');
      if (role !== 'admin' && role !== 'user') throw new Error('Invalid role. Must be "admin" or "user"');

      const { error: updateError } = await supabaseClient.auth.admin.updateUserById(userId, {
        app_metadata: { role },
      });

      if (updateError) throw updateError;

      return new Response(JSON.stringify({ success: true, message: `User role updated to ${role}` }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    throw new Error('Invalid action');
  } catch (error: any) {
    console.error('Error in admin-users:', error);
    return new Response(JSON.stringify({ error: error?.message || 'Internal server error' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
