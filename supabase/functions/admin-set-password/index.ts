import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const { user_id, password } = await req.json();
  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { error } = await admin.auth.admin.updateUserById(user_id, { password });
  return new Response(JSON.stringify({ ok: !error, error: error?.message }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status: error ? 400 : 200,
  });
});
