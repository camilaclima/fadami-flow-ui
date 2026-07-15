// @ts-nocheck
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function sha(text: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const supabaseAuth = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!);
    const { data: userData, error: userErr } = await supabaseAuth.auth.getUser(authHeader.replace("Bearer ", ""));
    if (userErr || !userData.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const caller = userData.user;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const { productIds } = await req.json().catch(() => ({ productIds: null }));

    const db = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Permission check: caller must have sprints or painel_gp permission
    const { data: callerProfile } = await db
      .from("profiles").select("id").eq("user_id", caller.id).maybeSingle();
    if (!callerProfile) {
      return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const { data: pGroups } = await db
      .from("profile_groups").select("group_id").eq("profile_id", callerProfile.id);
    const groupIds = (pGroups ?? []).map((g: any) => g.group_id);
    let perms: string[] = [];
    if (groupIds.length) {
      const { data: groups } = await db.from("access_groups").select("permissions").in("id", groupIds);
      perms = (groups ?? []).flatMap((g: any) => (g.permissions as string[]) ?? []);
    }
    if (!perms.includes("sprints") && !perms.includes("painel_gp")) {
      return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Last 7 days dailys
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    let dailyQ = db.from("daily_status").select("*").gte("status_date", sevenDaysAgo.toISOString().slice(0, 10));
    if (Array.isArray(productIds) && productIds.length) dailyQ = dailyQ.in("product_id", productIds);
    const { data: dailys = [] } = await dailyQ;

    // Activities (open, with deadline or sprint)
    let actQ = db.from("project_backlog_items").select("*").neq("status", "done");
    if (Array.isArray(productIds) && productIds.length) actQ = actQ.in("product_id", productIds);
    const { data: activities = [] } = await actQ;

    // Products & sprints for naming
    const { data: products = [] } = await db.from("products").select("id,name");
    const { data: sprints = [] } = await db.from("sprints").select("id,name,start_date,end_date");
    const { data: members = [] } = await db.from("team_members").select("id,name");

    const prodName = (id: string | null) => products.find((p: any) => p.id === id)?.name ?? "—";
    const sprintName = (id: string | null) => sprints.find((s: any) => s.id === id)?.name ?? null;
    const memberName = (id: string | null) => members.find((m: any) => m.id === id)?.name ?? null;

    const today = new Date().toISOString().slice(0, 10);
    const overdue = activities.filter((a: any) => a.deadline_date && a.deadline_date < today);

    // Member workload
    const workload: Record<string, number> = {};
    activities.forEach((a: any) => {
      (a.responsible_ids ?? []).forEach((rid: string) => { workload[rid] = (workload[rid] ?? 0) + 1; });
    });
    const overloaded = Object.entries(workload).filter(([, n]) => n >= 4).map(([id, n]) => ({ id, name: memberName(id), count: n }));

    const ctx = {
      hoje: today,
      dailys: dailys.map((d: any) => ({
        id: d.id,
        data: d.status_date,
        projeto: prodName(d.product_id),
        product_id: d.product_id,
        sprint_id: d.sprint_id,
        nivel_bloqueio: d.blocker_level,
        resumo: d.summary?.slice(0, 800),
        ai: d.ai_insights,
      })),
      atividades_abertas: activities.map((a: any) => ({
        id: a.id,
        titulo: a.task,
        projeto: prodName(a.product_id),
        product_id: a.product_id,
        sprint: sprintName(a.sprint_id),
        sprint_id: a.sprint_id,
        prazo: a.deadline_date,
        status: a.status,
        impacto: a.impact,
        responsaveis: (a.responsible_ids ?? []).map((rid: string) => memberName(rid)).filter(Boolean),
        responsible_ids: a.responsible_ids ?? [],
      })),
      atividades_atrasadas: overdue.map((a: any) => ({ id: a.id, titulo: a.task, prazo: a.deadline_date })),
      membros_sobrecarregados: overloaded,
    };

    const tools = [{
      type: "function",
      function: {
        name: "suggest_coordinator_tasks",
        description: "Sugere ações para o coordenador a partir das dailys e atividades.",
        parameters: {
          type: "object",
          properties: {
            tasks: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  title: { type: "string" },
                  description: { type: "string" },
                  category: { type: "string", enum: ["blocker", "schedule_risk"] },
                  urgency: { type: "string", enum: ["critical", "high", "medium", "low"] },
                  product_id: { type: "string" },
                  sprint_id: { type: "string" },
                  activity_id: { type: "string" },
                  daily_status_id: { type: "string" },
                  responsible_member_id: { type: "string" },
                  ai_message: { type: "string", description: "Mensagem pronta de cobrança/ação para Slack/Teams (somente para blocker)." },
                },
                required: ["title", "description", "category", "urgency"],
              },
            },
          },
          required: ["tasks"],
        },
      },
    }];

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "Você é um coordenador sênior de projetos. Identifique até 8 ações REAIS e acionáveis para o coordenador, com base nos dados fornecidos. Para 'blocker' inclua sempre um ai_message pronto para enviar ao responsável/fornecedor cobrando solução, em português, tom profissional e direto. Use IDs exatamente como aparecem nos dados (product_id, sprint_id, activity_id, daily_status_id, responsible_member_id). Não invente dados." },
          { role: "user", content: `Dados do projeto:\n${JSON.stringify(ctx).slice(0, 60000)}` },
        ],
        tools,
        tool_choice: { type: "function", function: { name: "suggest_coordinator_tasks" } },
      }),
    });

    if (resp.status === 429) return new Response(JSON.stringify({ error: "Limite de requisições. Tente em instantes." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    if (resp.status === 402) return new Response(JSON.stringify({ error: "Créditos esgotados. Adicione créditos no workspace." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    if (!resp.ok) {
      const t = await resp.text();
      return new Response(JSON.stringify({ error: "Erro IA", detail: t }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const data = await resp.json();
    const args = data.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments ?? "{}";
    let parsed: any = {};
    try { parsed = JSON.parse(args); } catch { parsed = { tasks: [] }; }
    const tasks: any[] = Array.isArray(parsed.tasks) ? parsed.tasks : [];

    let inserted = 0;
    for (const t of tasks) {
      const hashKey = await sha(`${t.category}|${t.title}|${t.product_id ?? ""}|${t.activity_id ?? ""}|${t.daily_status_id ?? ""}`);
      // Skip if a pending task with same hash already exists
      const { data: existing } = await db.from("coordinator_tasks").select("id").eq("dedup_hash", hashKey).eq("status", "pending").maybeSingle();
      if (existing) continue;
      await db.from("coordinator_tasks").insert({
        title: t.title,
        description: t.description ?? "",
        category: t.category,
        urgency: t.urgency ?? "medium",
        source: "ai",
        status: "pending",
        product_id: t.product_id ?? null,
        sprint_id: t.sprint_id ?? null,
        activity_id: t.activity_id ?? null,
        daily_status_id: t.daily_status_id ?? null,
        responsible_member_id: t.responsible_member_id ?? null,
        ai_message: t.ai_message ?? "",
        dedup_hash: hashKey,
        context_payload: { generated_after: t.daily_status_id ? "daily" : "schedule" },
      });
      inserted++;
    }

    return new Response(JSON.stringify({ inserted, total_suggested: tasks.length }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message ?? "Unknown error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});