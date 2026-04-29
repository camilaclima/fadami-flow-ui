import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { documentation, productName } = await req.json() as {
      documentation: string;
      productName?: string;
    };

    if (!documentation || documentation.trim().length < 20) {
      return new Response(JSON.stringify({ error: "Documentação muito curta para análise." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const systemPrompt = `Você é um PMO sênior especialista em quebra de escopo. Receba a documentação de um projeto e extraia um BACKLOG ESTRUTURADO com tarefas/entregas claras.
Para cada item identifique:
- task: descrição clara e acionável da tarefa/entrega (curta)
- likely_owner: papel ou pessoa provavelmente responsável (ex: "Front-end", "Back-end", "Cliente", "PO", nome se citado). Se não houver pista, use "A definir".
- deadline: prazo se mencionado (ex: "Sprint 3", "15/05", "fim do mês"); senão deixe vazio.
- risk_mitigation: principal risco e como mitigar (1 frase prática)
- category: categoria curta (ex: "Frontend", "Backend", "Integração", "Infra", "UX", "Documentação", "Validação", "Negócio")
Também produza um SUMMARY executivo curto (3-5 frases) explicando o escopo geral do projeto.
Seja exaustivo mas evite duplicatas. Mínimo 5, máximo 40 itens. Retorne SEMPRE via tool call.`;

    const userPrompt = `Projeto: ${productName ?? "—"}\n\nDocumentação:\n${documentation}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        tools: [{
          type: "function",
          function: {
            name: "report_project_backlog",
            description: "Retorna backlog estruturado e resumo do projeto.",
            parameters: {
              type: "object",
              properties: {
                summary: { type: "string", description: "Resumo executivo curto do escopo." },
                items: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      task: { type: "string" },
                      likely_owner: { type: "string" },
                      deadline: { type: "string" },
                      risk_mitigation: { type: "string" },
                      category: { type: "string" },
                    },
                    required: ["task", "likely_owner", "deadline", "risk_mitigation", "category"],
                    additionalProperties: false,
                  },
                },
              },
              required: ["summary", "items"],
              additionalProperties: false,
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "report_project_backlog" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) return new Response(JSON.stringify({ error: "Limite de requisições atingido." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (response.status === 402) return new Response(JSON.stringify({ error: "Créditos de IA insuficientes." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "Falha ao chamar IA" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      return new Response(JSON.stringify({ error: "Resposta da IA inválida" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const result = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify({ result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("extract-project-backlog error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});