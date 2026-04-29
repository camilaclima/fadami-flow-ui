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
    const { todaySummary, presentMembers, history } = await req.json() as {
      todaySummary: string;
      presentMembers: string[];
      history: HistoryItem[];
    };

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const systemPrompt = `Você é um PMO especialista em gestão ágil. Analise a daily de hoje comparando com o histórico do projeto.
Identifique e categorize obrigatoriamente:
- NÍVEL DE BLOQUEIO da equipe (1 a 5) avaliado PURAMENTE pelo conteúdo dos relatos: 1 = fluxo livre sem impedimentos, 2 = pequenos atritos, 3 = impedimentos relevantes mas contornáveis, 4 = bloqueios sérios afetando entregas, 5 = paralisia / múltiplos bloqueios críticos. Esse valor SUBSTITUI qualquer estimativa humana.
- Avanços do dia e avanços consolidados ao longo da sprint
- Riscos imediatos e prospecção de riscos futuros (baseado em tendências)
- RECORRÊNCIAS: qualquer tarefa, impedimento ou ociosidade que apareça em 2+ dias seguidos é GARGALO PRIORITÁRIO
- Colaboradores OCIOSOS: use EXATAMENTE os nomes dos membros conforme aparecem no relato individual ("=== NOME ===") quando citados como sem tarefas, parados, aguardando algo
- Colaboradores SOBRECARREGADOS: use EXATAMENTE os nomes dos membros conforme aparecem no relato individual quando citados com excesso de tarefas, atrasos acumulados, sinais de estresse — atribua nível de risco baixo/medio/alto
- Dependências EXTERNAS (ex: Aguardando Cliente, TI, Financeiro, Fornecedor) vs INTERNAS (outras áreas internas)
- Resumo curto de 1 frase (máx 140 chars) e resumo executivo completo
- Próximos passos práticos para o coordenador
Retorne SEMPRE em JSON estruturado via tool call.`;

    const historyText = history.length
      ? history
          .map(
            (h) =>
              `Data: ${h.status_date} | Bloqueio: ${h.blocker_level}/5\nResumo: ${h.summary}`,
          )
          .join("\n---\n")
      : "Nenhum histórico anterior.";

    const userPrompt = `## DAILY DE HOJE\nMembros presentes: ${presentMembers.join(", ") || "—"}\n\nRelatos:\n${todaySummary}\n\n## HISTÓRICO DE DAILYS ANTERIORES (mesmo projeto)\n${historyText}`;

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
                  blocker_level: {
                    type: "number",
                    description: "Nível de bloqueio da equipe (1 a 5) calculado APENAS a partir do conteúdo dos relatos.",
                  },
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
                  resumo_curto: {
                    type: "string",
                    description: "Uma única frase curta (máx 140 caracteres) resumindo a daily de hoje.",
                  },
                  colaboradores_ociosos: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        nome: { type: "string" },
                        motivo: { type: "string" },
                      },
                      required: ["nome", "motivo"],
                      additionalProperties: false,
                    },
                    description: "Colaboradores citados como ociosos, sem tarefas ou aguardando algo.",
                  },
                  colaboradores_sobrecarregados: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        nome: { type: "string" },
                        motivo: { type: "string" },
                        nivel_risco: { type: "string", enum: ["baixo", "medio", "alto"] },
                      },
                      required: ["nome", "motivo", "nivel_risco"],
                      additionalProperties: false,
                    },
                    description: "Colaboradores com sinais de sobrecarga, excesso de tarefas ou estresse.",
                  },
                  dependencias_externas: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        item: { type: "string" },
                        bloqueador: { type: "string", description: "Quem está segurando: Cliente, TI, Financeiro, Fornecedor, etc." },
                        tipo: { type: "string", enum: ["externo", "interno"] },
                      },
                      required: ["item", "bloqueador", "tipo"],
                      additionalProperties: false,
                    },
                    description: "Itens travados aguardando agentes externos ou áreas internas.",
                  },
                  avancos_consolidados: {
                    type: "array",
                    items: { type: "string" },
                    description: "Principais marcos/conquistas consolidados ao longo da sprint considerando o histórico.",
                  },
                  prospeccao_riscos: {
                    type: "array",
                    items: { type: "string" },
                    description: "Previsão de possíveis atrasos ou problemas futuros baseado nas tendências.",
                  },
                },
                required: ["blocker_level", "avancos", "riscos", "recorrencias", "status_geral", "resumo_executivo", "vibe_equipe", "proximos_passos", "resumo_curto", "colaboradores_ociosos", "colaboradores_sobrecarregados", "dependencias_externas", "avancos_consolidados", "prospeccao_riscos"],
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