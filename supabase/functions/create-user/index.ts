import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Auth check: only users with 'users' permission can create accounts
    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace("Bearer ", "");
    if (!token) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: `Bearer ${token}` } } });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: callerProfile } = await supabase
      .from("profiles").select("id").eq("user_id", userData.user.id).maybeSingle();
    if (!callerProfile) {
      return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const { data: pGroups } = await supabase
      .from("profile_groups").select("group_id").eq("profile_id", callerProfile.id);
    const groupIds = (pGroups ?? []).map((g: any) => g.group_id);
    let perms: string[] = [];
    if (groupIds.length) {
      const { data: groups } = await supabase.from("access_groups").select("permissions").in("id", groupIds);
      perms = (groups ?? []).flatMap((g: any) => (g.permissions as string[]) ?? []);
    }
    if (!perms.includes("users")) {
      return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { email, password, firstName, lastName, productId, roleId, groupId } = await req.json();

    // Create auth user
    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (authError) throw authError;

    // Update profile
    const { error: profileError } = await supabase.from("profiles").update({
      first_name: firstName,
      last_name: lastName,
      product_id: productId,
      role_id: roleId,
      group_id: groupId,
      first_access: true,
    }).eq("user_id", authUser.user.id);

    if (profileError) throw profileError;

    return new Response(JSON.stringify({ userId: authUser.user.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
