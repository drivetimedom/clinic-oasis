import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Não autorizado");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    // Verify caller is authenticated
    const anonKey = Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!;
    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user: caller } } = await callerClient.auth.getUser();
    if (!caller) throw new Error("Não autorizado");

    const { email, role, clinic_id } = await req.json();
    if (!email || !role || !clinic_id) throw new Error("Campos obrigatórios: email, role, clinic_id");

    // Verify caller is admin of this clinic
    const { data: callerRole } = await supabaseAdmin.rpc("get_clinic_role", {
      _user_id: caller.id,
      _clinic_id: clinic_id,
    });
    const { data: isSuperAdmin } = await supabaseAdmin.rpc("is_super_admin", { _user_id: caller.id });
    
    if (callerRole !== "admin" && !isSuperAdmin) {
      throw new Error("Apenas administradores podem convidar membros");
    }

    // Look up user by email
    const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers();
    if (listError) throw listError;

    const targetUser = users.find((u: any) => u.email?.toLowerCase() === email.toLowerCase());
    if (!targetUser) {
      throw new Error("Nenhum usuário encontrado com este email. O usuário precisa criar uma conta primeiro.");
    }

    // Check if already a member
    const { data: existing } = await supabaseAdmin
      .from("clinic_members")
      .select("id")
      .eq("clinic_id", clinic_id)
      .eq("user_id", targetUser.id)
      .maybeSingle();

    if (existing) {
      throw new Error("Este usuário já é membro desta clínica.");
    }

    // Add as member
    const { error: insertError } = await supabaseAdmin
      .from("clinic_members")
      .insert({ clinic_id, user_id: targetUser.id, role });

    if (insertError) throw insertError;

    return new Response(JSON.stringify({ success: true, user_name: targetUser.user_metadata?.full_name || email }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
