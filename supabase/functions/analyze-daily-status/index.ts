import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface HistoryItem {
  status_date: string;
  summary: string;
  blocker_level: number;
  ai_insights?: any;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { todaySummary, blockerLevel, presentMembers, history } = await req.json() as {
      todaySummary: string;
      blockerLevel: number;
      presentMembers: string[];
      history: HistoryItem[];
    };

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const systemPrompt = `Você é um PMO especialista. Compare a daily de hoje com o histórico enviado. Identifique avanços, riscos e, principalmente, RECORRÊNCIAS. Se uma tarefa, impedimento ou ociosidade de um desenvolvedor aparecer em 2 ou mais dias seguidos, destaque como um GARGALO PRIORITÁRIO. Retorne a resposta em um formato JSON estruturado.`;

    const historyText = history.length
      ? history
          .map(
            (h) =>
              `Data: ${h.status_date} | Bloqueio: ${h.blocker_level}/5\nResumo: ${h.summary}`,
          )
          .join("\n---\n")
      : "Nenhum histórico anterior.";

    const userPrompt = `## DAILY DE HOJE\nMembros presentes: ${presentMembers.join(", ") || "—"}\nNível de bloqueio: ${blockerLevel}/5\nResumo:\n${todaySummary}\n\n## HISTÓRICO DE DAILYS ANTERIORES (mesmo projeto)\n${historyText}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "report_daily_analysis",
              description: "Retorna a análise estruturada da daily.",
              parameters: {
                type: "object",
                properties: {
                  avancos: {
                    type: "array",
                    items: { type: "string" },
                    description: "Lista de avanços identificados na sprint.",
                  },
                  riscos: {
                    type: "array",
                    items: { type: "string" },
                    description: "Lista de riscos detectados.",
                  },
                  recorrencias: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        descricao: { type: "string" },
                        dias_consecutivos: { type: "number" },
                        responsavel: { type: "string" },
                      },
                      required: ["descricao", "dias_consecutivos"],
                      additionalProperties: false,
                    },
                    description: "Itens recorrentes que viram gargalos prioritários.",
                  },
                  status_geral: {
                    type: "string",
                    enum: ["saudavel", "atencao", "critico"],
                    description: "Status geral da sprint.",
                  },
                  resumo_executivo: { type: "string" },
                  vibe_equipe: {
                    type: "string",
                    enum: ["motivada", "neutra", "desgastada", "frustrada"],
                    description: "Percepção do clima/moral da equipe baseado no resumo.",
                  },
                  proximos_passos: {
                    type: "array",
                    items: { type: "string" },
                    description: "3 a 5 próximos passos sugeridos para o coordenador.",
                  },
                },
                required: ["avancos", "riscos", "recorrencias", "status_geral", "resumo_executivo", "vibe_equipe", "proximos_passos"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "report_daily_analysis" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Limite de requisições atingido. Tente novamente em instantes." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos de IA insuficientes. Adicione fundos no workspace." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "Falha ao chamar IA" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      return new Response(JSON.stringify({ error: "Resposta da IA inválida" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const insights = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify({ insights }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("analyze-daily-status error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});