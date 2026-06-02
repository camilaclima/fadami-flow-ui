// @ts-nocheck
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { sprint, activities, members } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const memberMap: Record<string, string> = {};
    (members ?? []).forEach((m: any) => { memberMap[m.id] = m.name; });

    const summarized = (activities ?? []).map((a: any) => ({
      titulo: a.task,
      status: a.status,
      impacto: a.impact,
      prazo: a.deadline_date,
      responsavel: a.responsible_id ? memberMap[a.responsible_id] : "Não atribuído",
    }));

    const prompt = `Você é um Scrum Master sênior. Analise a sprint "${sprint?.name}" (período ${sprint?.start_date} a ${sprint?.end_date}). Atividades:\n${JSON.stringify(summarized, null, 2)}\n\nDevolva um JSON com: saude ("verde"|"amarelo"|"vermelho"), gargalos (array curto de strings descrevendo problemas reais ex.: "Lucas está com 3 tarefas travadas"), dicas (array curto de recomendações práticas).`;

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "Responda APENAS com JSON válido, sem markdown." },
          { role: "user", content: prompt },
        ],
      }),
    });

    if (resp.status === 429) return new Response(JSON.stringify({ error: "Limite de requisições. Tente em instantes." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    if (resp.status === 402) return new Response(JSON.stringify({ error: "Créditos esgotados. Adicione créditos no workspace." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    if (!resp.ok) {
      const t = await resp.text();
      return new Response(JSON.stringify({ error: "Erro IA", detail: t }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const data = await resp.json();
    let content: string = data.choices?.[0]?.message?.content ?? "{}";
    content = content.replace(/```json\n?|\n?```/g, "").trim();
    let parsed: any = {};
    try { parsed = JSON.parse(content); } catch { parsed = { saude: "amarelo", gargalos: [], dicas: [] }; }

    return new Response(JSON.stringify(parsed), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message ?? "Unknown error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});