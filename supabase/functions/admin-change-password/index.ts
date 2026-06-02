import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function validatePassword(pw: string): string | null {
  if (!pw || pw.length < 8) return "A senha deve ter no mínimo 8 caracteres.";
  if (!/[A-Z]/.test(pw)) return "Inclua ao menos uma letra maiúscula.";
  if (!/[a-z]/.test(pw)) return "Inclua ao menos uma letra minúscula.";
  if (!/[0-9]/.test(pw)) return "Inclua ao menos um número.";
  if (!/[^A-Za-z0-9]/.test(pw)) return "Inclua ao menos um caractere especial.";
  return null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace("Bearer ", "");
    if (!token) throw new Error("Não autenticado.");

    // Identifica o chamador
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) throw new Error("Sessão inválida.");
    const caller = userData.user;

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Valida que o chamador é admin (possui permissão "users" em algum grupo)
    const { data: callerProfile } = await admin
      .from("profiles")
      .select("id, email")
      .eq("user_id", caller.id)
      .maybeSingle();
    if (!callerProfile) throw new Error("Perfil do administrador não encontrado.");

    const { data: pGroups } = await admin
      .from("profile_groups")
      .select("group_id")
      .eq("profile_id", callerProfile.id);
    const groupIds = (pGroups ?? []).map((g: any) => g.group_id);
    let perms: string[] = [];
    if (groupIds.length) {
      const { data: groups } = await admin
        .from("access_groups")
        .select("permissions")
        .in("id", groupIds);
      perms = (groups ?? []).flatMap((g: any) => (g.permissions as string[]) ?? []);
    }
    if (!perms.includes("users")) {
      return new Response(JSON.stringify({ error: "Acesso negado." }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { targetUserId, newPassword } = await req.json();
    if (!targetUserId) throw new Error("Usuário alvo é obrigatório.");
    const v = validatePassword(newPassword);
    if (v) throw new Error(v);

    // Atualiza a senha
    const { data: updated, error: updErr } = await admin.auth.admin.updateUserById(
      targetUserId,
      { password: newPassword },
    );
    if (updErr) throw updErr;

    // Marca primeiro acesso para forçar troca? Mantemos o fluxo atual; apenas registramos.
    await admin.from("password_change_logs").insert({
      target_user_id: targetUserId,
      target_email: updated.user?.email ?? "",
      changed_by: caller.id,
      changed_by_email: callerProfile.email,
    });

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});