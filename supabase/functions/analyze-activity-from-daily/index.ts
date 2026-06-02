import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface DailyItem {
  status_date: string;
  summary: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { activityTask, activityDescription, dailies } = await req.json() as {
      activityTask: string;
      activityDescription?: string;
      dailies: DailyItem[];
    };

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    if (!dailies?.length) {
      return new Response(JSON.stringify({ updates: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const systemPrompt = `Você é um PMO. Recebe uma atividade e o histórico de dailies de uma sprint. Sua tarefa: extrair APENAS as menções relevantes à atividade (avanços, bloqueios, decisões, mudanças de escopo, riscos). Ignore o que não tem relação direta. Para cada menção, retorne data, tipo (avanco|bloqueio|decisao|risco|mudanca) e texto curto (1-2 frases). Se nada for relacionado, devolva updates: [].`;

    const dailiesText = dailies
      .map((d) => `Data: ${d.status_date}\n${d.summary}`)
      .join("\n---\n");

    const userPrompt = `## ATIVIDADE\nTítulo: ${activityTask}\nDescrição: ${activityDescription || "—"}\n\n## DAILIES DA SPRINT\n${dailiesText}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "report_activity_updates",
              description: "Retorna as atualizações extraídas das dailies relacionadas à atividade.",
              parameters: {
                type: "object",
                properties: {
                  updates: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        date: { type: "string", description: "Data ISO YYYY-MM-DD da daily." },
                        type: { type: "string", enum: ["avanco", "bloqueio", "decisao", "risco", "mudanca"] },
                        text: { type: "string", description: "Resumo da menção (1-2 frases)." },
                      },
                      required: ["date", "type", "text"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["updates"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "report_activity_updates" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Limite de requisições atingido. Tente novamente em instantes." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos de IA insuficientes." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "Falha ao chamar IA" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      return new Response(JSON.stringify({ updates: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const parsed = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("analyze-activity-from-daily error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});