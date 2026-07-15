import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface DevHistory {
  dev_name: string;
  entries: { date: string; will_do_today?: string; did_yesterday?: string }[];
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

    const { devs } = (await req.json()) as { devs: DevHistory[] };
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const validDevs = (devs ?? []).filter((d) => (d.entries ?? []).length >= 2);
    if (validDevs.length === 0) {
      return new Response(JSON.stringify({ alerts: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const systemPrompt = `Você é um Analista de Projetos sênior. Receberá o histórico recente das dailies de cada desenvolvedor (campo "Hoje" — o que ele se comprometeu a fazer naquele dia, e "Ontem" — o que reportou ter feito).

Sua missão é identificar SCOPE LOCK: desenvolvedores que aparentam estar travados na MESMA tarefa por VÁRIOS dias consecutivos (2 ou mais), mesmo que não tenham reportado impedimento formal.

Regras:
- Compare as descrições semanticamente (não exija texto idêntico). Ex: "Ajustar API de pagamento" e "Continuar fix da API de pagto" são a MESMA tarefa.
- Só gere alerta se houver pelo menos 2 dias consecutivos (ou quase consecutivos) na mesma tarefa.
- Identifique o nome curto/resumido da tarefa (ex: "Fix y", "Integração Stripe", "Tela de login").
- Conte os dias corridos em que a tarefa apareceu.
- Para cada alerta, escreva uma mensagem curta no formato: "{Nome} está na mesma tarefa de \\"{Tarefa}\\" há {N} dias."
- Se nenhum dev estiver travado, retorne lista vazia.`;

    const userPrompt = validDevs
      .map((d) => {
        const lines = d.entries
          .slice()
          .sort((a, b) => a.date.localeCompare(b.date))
          .map((e) => `  [${e.date}] Hoje: ${e.will_do_today ?? "-"} | Ontem: ${e.did_yesterday ?? "-"}`)
          .join("\n");
        return `=== ${d.dev_name} ===\n${lines}`;
      })
      .join("\n\n");

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
              name: "report_scope_alerts",
              description: "Retorna alertas de devs travados na mesma tarefa por vários dias.",
              parameters: {
                type: "object",
                properties: {
                  alerts: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        dev_name: { type: "string" },
                        task: { type: "string", description: "Nome curto da tarefa" },
                        days: { type: "number", description: "Quantos dias consecutivos na mesma tarefa" },
                        message: { type: "string", description: "Frase no formato: {Nome} está na mesma tarefa de \"{Tarefa}\" há {N} dias." },
                      },
                      required: ["dev_name", "task", "days", "message"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["alerts"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "report_scope_alerts" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Limite de requisições atingido." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos de IA insuficientes." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "Falha ao chamar IA" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    const parsed = toolCall ? JSON.parse(toolCall.function.arguments) : { alerts: [] };

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("analyze-scope-stuck error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});