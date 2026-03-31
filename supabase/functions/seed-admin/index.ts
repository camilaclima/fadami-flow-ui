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
    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Check if admin already exists
    const { data: existingProfile } = await supabase
      .from("profiles")
      .select("id")
      .eq("email", "admin@fadami.com.br")
      .maybeSingle();

    if (existingProfile) {
      return new Response(JSON.stringify({ message: "Admin already exists" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create admin auth user
    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
      email: "admin@fadami.com.br",
      password: "admin123",
      email_confirm: true,
    });

    if (authError) throw authError;
    const adminUserId = authUser.user.id;

    // Seed products
    const { data: products } = await supabase.from("products").insert([
      { name: "FadamiFlow Web", description: "Plataforma web de gestão de backlogs", status: "active", color: "hsl(243 75% 59%)" },
      { name: "FadamiFlow Mobile", description: "App mobile para acompanhamento", status: "active", color: "hsl(160 84% 39%)" },
      { name: "FadamiFlow API", description: "API REST para integrações", status: "active", color: "hsl(38 92% 50%)" },
    ]).select();

    // Seed roles
    const { data: roles } = await supabase.from("roles").insert([
      { title: "Diretor" },
      { title: "Analista Sênior" },
      { title: "Product Owner" },
      { title: "Desenvolvedor" },
    ]).select();

    // Seed access groups
    const allPerms = ["dashboard", "backlogs", "products", "clients", "users", "roles", "groups", "settings"];
    const { data: groups } = await supabase.from("access_groups").insert([
      { name: "Administradores", permissions: allPerms },
      { name: "Diretoria", permissions: ["dashboard", "backlogs", "products", "clients", "settings"] },
      { name: "PMO", permissions: ["dashboard", "backlogs"] },
    ]).select();

    // Update admin profile with full data
    const adminGroup = groups?.find((g: any) => g.name === "Administradores");
    const directorRole = roles?.find((r: any) => r.title === "Diretor");
    const webProduct = products?.find((p: any) => p.name === "FadamiFlow Web");

    await supabase.from("profiles").update({
      first_name: "Admin",
      last_name: "Sistema",
      product_id: webProduct?.id,
      role_id: directorRole?.id,
      group_id: adminGroup?.id,
      first_access: false,
    }).eq("user_id", adminUserId);

    // Seed clients
    const { data: clients } = await supabase.from("clients").insert([
      { name: "TechCorp", email: "contato@techcorp.com", contact_name: "João Silva", contact_email: "joao@techcorp.com", phone: "(11) 99999-0001" },
      { name: "StartupXYZ", email: "hello@startupxyz.com", contact_name: "Maria Santos", contact_email: "maria@startupxyz.com", phone: "(21) 99999-0002" },
      { name: "MegaSoft", email: "info@megasoft.com", contact_name: "Carlos Lima", contact_email: "carlos@megasoft.com", phone: "(31) 99999-0003" },
    ]).select();

    // Seed backlogs
    const techCorp = clients?.find((c: any) => c.name === "TechCorp");
    const startupXYZ = clients?.find((c: any) => c.name === "StartupXYZ");
    const megaSoft = clients?.find((c: any) => c.name === "MegaSoft");
    const mobileProduct = products?.find((p: any) => p.name === "FadamiFlow Mobile");
    const apiProduct = products?.find((p: any) => p.name === "FadamiFlow API");

    const { data: backlogs } = await supabase.from("backlogs").insert([
      {
        title: "Implementar autenticação OAuth2",
        type: "functional",
        description: "Adicionar suporte a login com Google e GitHub para simplificar o onboarding dos usuários.",
        product_id: webProduct?.id,
        client_id: techCorp?.id,
        thermometer: "high",
        phase: "refinement",
        created_by: adminUserId,
        prioritization: { businessValue: 5, opportunityCost: 4, estimate: 16, priority: "high" },
        approval: { observation: "Aprovado. Essencial para o lançamento." },
      },
      {
        title: "Redesign da página de dashboard",
        type: "functional",
        description: "Atualizar o layout do dashboard com novos gráficos e métricas de performance.",
        product_id: webProduct?.id,
        thermometer: "medium",
        phase: "prioritization",
        created_by: adminUserId,
      },
      {
        title: "API de exportação de relatórios",
        type: "technical",
        description: "Criar endpoints para exportação de dados em CSV e PDF.",
        product_id: apiProduct?.id,
        client_id: startupXYZ?.id,
        thermometer: "low",
        phase: "prioritization",
        created_by: adminUserId,
      },
      {
        title: "Notificações push mobile",
        type: "technical",
        description: "Sistema de notificações em tempo real para o app mobile com suporte a deep linking.",
        product_id: mobileProduct?.id,
        thermometer: "high",
        phase: "approval",
        created_by: adminUserId,
        prioritization: { businessValue: 4, opportunityCost: 3, estimate: 24, priority: "medium" },
      },
      {
        title: "Integração com Slack",
        type: "functional",
        description: "Enviar atualizações de backlog automaticamente para canais do Slack.",
        product_id: webProduct?.id,
        client_id: megaSoft?.id,
        thermometer: "medium",
        phase: "prioritization",
        created_by: adminUserId,
      },
      {
        title: "Modo offline para mobile",
        type: "functional",
        description: "Permitir que usuários acessem e editem backlogs sem conexão à internet.",
        product_id: mobileProduct?.id,
        client_id: techCorp?.id,
        thermometer: "low",
        phase: "finished",
        created_by: adminUserId,
        prioritization: { businessValue: 3, opportunityCost: 2, estimate: 40, priority: "low" },
        approval: { observation: "Aprovado com ressalvas sobre performance." },
        refinement: {
          functionalRefinement: "Sincronizar ao reconectar",
          technicalRefinement: "IndexedDB + service worker",
          acceptanceCriteria: "Funcionar offline por até 72h",
          definitionOfDone: "Testes E2E passando, docs atualizados",
          estimate: 40,
        },
      },
    ]).select();

    // Seed phase history for backlogs
    if (backlogs) {
      const phaseHistoryEntries: any[] = [];
      for (const b of backlogs) {
        if (b.title === "Implementar autenticação OAuth2") {
          phaseHistoryEntries.push(
            { backlog_id: b.id, phase: "prioritization", entered_at: "2024-03-10T10:00:00Z", completed_at: "2024-03-14T09:00:00Z" },
            { backlog_id: b.id, phase: "approval", entered_at: "2024-03-14T09:00:00Z", completed_at: "2024-03-15T11:00:00Z" },
            { backlog_id: b.id, phase: "refinement", entered_at: "2024-03-15T11:00:00Z" },
          );
        } else if (b.title === "Notificações push mobile") {
          phaseHistoryEntries.push(
            { backlog_id: b.id, phase: "prioritization", entered_at: "2024-03-08T14:00:00Z", completed_at: "2024-03-11T16:00:00Z" },
            { backlog_id: b.id, phase: "approval", entered_at: "2024-03-11T16:00:00Z" },
          );
        } else if (b.title === "Modo offline para mobile") {
          phaseHistoryEntries.push(
            { backlog_id: b.id, phase: "prioritization", entered_at: "2024-02-01T10:00:00Z", completed_at: "2024-02-05T10:00:00Z" },
            { backlog_id: b.id, phase: "approval", entered_at: "2024-02-05T10:00:00Z", completed_at: "2024-02-06T10:00:00Z" },
            { backlog_id: b.id, phase: "refinement", entered_at: "2024-02-06T10:00:00Z", completed_at: "2024-02-10T10:00:00Z" },
            { backlog_id: b.id, phase: "available", entered_at: "2024-02-10T10:00:00Z", completed_at: "2024-02-12T10:00:00Z" },
            { backlog_id: b.id, phase: "planned", entered_at: "2024-02-12T10:00:00Z", completed_at: "2024-02-20T10:00:00Z" },
            { backlog_id: b.id, phase: "finished", entered_at: "2024-02-20T10:00:00Z" },
          );
        } else {
          phaseHistoryEntries.push(
            { backlog_id: b.id, phase: "prioritization", entered_at: b.created_at },
          );
        }
      }
      await supabase.from("backlog_phase_history").insert(phaseHistoryEntries);
    }

    return new Response(JSON.stringify({ message: "Seed completed successfully", adminUserId }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
