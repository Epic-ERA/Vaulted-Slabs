//supabase/functions/admin-users/index.ts
import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey);

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);

    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    const isAdmin = user.app_metadata?.role === 'admin';
    if (!isAdmin) {
      throw new Error('Forbidden: Admin access required');
    }

    const { action, userId, role } = await req.json();

    if (action === 'list') {
      const { data: { users }, error: listError } = await supabaseClient.auth.admin.listUsers();

      if (listError) {
        throw listError;
      }

      const usersData = users.map((u) => ({
        id: u.id,
        email: u.email || '',
        created_at: u.created_at,
        last_sign_in_at: u.last_sign_in_at,
        app_metadata: u.app_metadata,
      }));

      return new Response(
        JSON.stringify({
          users: usersData,
        }),
        {
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    }

    if (action === 'setRole') {
      if (!userId || !role) {
        throw new Error('Missing userId or role');
      }

      if (role !== 'admin' && role !== 'user') {
        throw new Error('Invalid role. Must be "admin" or "user"');
      }

      const { error: updateError } = await supabaseClient.auth.admin.updateUserById(
        userId,
        {
          app_metadata: {
            role: role,
          },
        }
      );

      if (updateError) {
        throw updateError;
      }

      return new Response(
        JSON.stringify({
          success: true,
          message: `User role updated to ${role}`,
        }),
        {
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    }

    throw new Error('Invalid action');
  } catch (error: any) {
    console.error('Error in admin-users:', error);
    return new Response(
      JSON.stringify({
        error: error.message || 'Internal server error',
      }),
      {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  }
});
