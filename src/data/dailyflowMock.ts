// Mock data para o DailyFlow — Visão diária de atividades por colaborador.
// Estrutura preparada para ser substituída por API/banco futuramente.

export type TaskStatus = "executado" | "nao_planejado" | "nao_executado";

export interface Task {
  id: string;
  title: string;
  status: TaskStatus;
  hasNote?: boolean;
  hasImpediment?: boolean;
  isRework?: boolean;
  isRecurrent?: boolean;
}

export interface DayCell {
  dayId: string;
  tasks: Task[];
}

export interface EffortSlice {
  key: "melhoria" | "bug" | "suporte" | "implantacao" | "outros";
  value: number;
}

export interface Collaborator {
  id: string;
  name: string;
  role: string;
  avatar: string;
  counts: { green: number; yellow: number; red: number };
  metrics: { capacity: number; adherence: number; unplanned: number; notExecuted: number; attention: number };
  effort: EffortSlice[];
  days: DayCell[];
}

export interface SprintDay {
  id: string;
  weekday: string;
  label: string;
  counts: { green: number; yellow: number; red: number };
}

export interface Squad { id: string; name: string }
export interface Sprint { id: string; name: string; start: string; end: string }

export const squads: Squad[] = [
  { id: "smartflow", name: "SmartFlow" },
  { id: "tor", name: "TOR+" },
  { id: "saga", name: "SAGA" },
  { id: "automacao", name: "Automação" },
  { id: "portais", name: "Portais de Pagamento" },
  { id: "sustentacao", name: "Sustentação" },
];

export const sprints: Sprint[] = [
  { id: "s16", name: "Sprint 16", start: "09/06/2026", end: "23/06/2026" },
  { id: "s17", name: "Sprint 17", start: "24/06/2026", end: "08/07/2026" },
  { id: "s18", name: "Sprint 18", start: "09/07/2026", end: "23/07/2026" },
  { id: "s19", name: "Sprint 19", start: "04/08/2026", end: "18/08/2026" },
];

export const days: SprintDay[] = [
  { id: "d1", weekday: "Seg", label: "04/08", counts: { green: 8, yellow: 2, red: 1 } },
  { id: "d2", weekday: "Ter", label: "05/08", counts: { green: 7, yellow: 1, red: 2 } },
  { id: "d3", weekday: "Qua", label: "06/08", counts: { green: 6, yellow: 2, red: 1 } },
  { id: "d4", weekday: "Qui", label: "07/08", counts: { green: 7, yellow: 2, red: 1 } },
  { id: "d5", weekday: "Sex", label: "08/08", counts: { green: 6, yellow: 3, red: 1 } },
];

export const teamKpis = [
  {
    id: "capacity",
    label: "CAPACITY DO TIME",
    icon: "users" as const,
    value: "84%",
    caption: "336h planejadas / 400h disponíveis",
    color: "#22C55E",
    progress: 84,
  },
  {
    id: "adherence",
    label: "ADERÊNCIA AO PLANEJADO",
    icon: "target" as const,
    value: "82%",
    caption: "276h executadas / 336h planejadas",
    color: "#8B5CF6",
    progress: 82,
  },
  {
    id: "unplanned",
    label: "NÃO PLANEJADO",
    icon: "zap" as const,
    value: "18%",
    caption: "60h executadas não planejadas",
    color: "#FBBF24",
    progress: 18,
  },
  {
    id: "notExecuted",
    label: "NÃO EXECUTADO",
    icon: "x" as const,
    value: "9%",
    caption: "30h planejadas não executadas",
    color: "#EF4444",
    progress: 9,
  },
  {
    id: "attention",
    label: "ATENÇÕES",
    icon: "alert" as const,
    value: "7",
    caption: "Ver casos que precisam de atenção",
    color: "#F59E0B",
    action: true,
  },
];

export const effortLegend: Record<EffortSlice["key"], { label: string; color: string }> = {
  melhoria: { label: "Melhoria", color: "#8B5CF6" },
  bug: { label: "Bug", color: "#EF4444" },
  suporte: { label: "Suporte", color: "#3B82F6" },
  implantacao: { label: "Implantação", color: "#22C55E" },
  outros: { label: "Outros", color: "#94A3B8" },
};

export const sprintEffort: EffortSlice[] = [
  { key: "melhoria", value: 48 },
  { key: "bug", value: 17 },
  { key: "suporte", value: 14 },
  { key: "implantacao", value: 18 },
  { key: "outros", value: 3 },
];

export const clientDistribution = [
  { name: "Produto", value: 22, color: "#8B5CF6" },
  { name: "Rota Verde", value: 18, color: "#22C55E" },
  { name: "Elovias", value: 14, color: "#3B82F6" },
  { name: "Rota Dourada", value: 12, color: "#FBBF24" },
  { name: "Via Campos", value: 10, color: "#F59E0B" },
  { name: "CLN", value: 9, color: "#60A5FA" },
  { name: "CBN", value: 8, color: "#A78BFA" },
  { name: "C. Sol", value: 7, color: "#EF4444" },
];

export const strategicEvolution = { value: "27%", caption: "74h de 276h executadas" };
export const reworkCard = { value: 7, caption: "5 tarefas afetadas" };
export const recurrentCard = { value: 12, caption: "12 tarefas em andamento > 1 dia" };
export const activeIssuesCard = { value: 7, caption: "Ver casos que precisam de atenção" };

const t = (
  title: string,
  status: TaskStatus,
  extras: Partial<Task> = {},
): Task => ({ id: Math.random().toString(36).slice(2), title, status, ...extras });

export const collaborators: Collaborator[] = [
  {
    id: "c1",
    name: "Wesley Santos",
    role: "Desenvolvedor",
    avatar: "WS",
    counts: { green: 8, yellow: 2, red: 1 },
    metrics: { capacity: 86, adherence: 91, unplanned: 16, notExecuted: 9, attention: 1 },
    effort: [
      { key: "melhoria", value: 46 },
      { key: "bug", value: 22 },
      { key: "suporte", value: 12 },
      { key: "implantacao", value: 16 },
      { key: "outros", value: 4 },
    ],
    days: [
      {
        dayId: "d1",
        tasks: [
          t("Corrigir cálculo de frete em pedidos interestaduais", "executado", { hasNote: true }),
          t("Ajustar tratamento de exceção na API de pagamento", "executado", { hasNote: true }),
          t("Refatorar serviço de notificação da API de pedidos", "nao_planejado"),
          t("Revisar PR #1287", "nao_executado"),
        ],
      },
      {
        dayId: "d2",
        tasks: [
          t("Implementar validação de CEP na API", "executado"),
          t("Integrar API de rastreio dos Correios", "executado"),
          t("Ajustar exibição do prazo de entrega no checkout", "nao_planejado"),
          t("Corrigir bug de cupom com valor zero", "nao_executado", { hasNote: true }),
          t("Revisar contrato de integração logística", "executado"),
        ],
      },
      {
        dayId: "d3",
        tasks: [
          t("Ajustar integração com GuardiON", "executado", { isRecurrent: true }),
          t("Corrigir inconsistência no cálculo de impostos", "executado"),
          t("Otimizar consulta de produtos no catálogo", "nao_planejado"),
          t("Tratar timeout na geração de boleto", "nao_executado", { hasImpediment: true, hasNote: true }),
        ],
      },
      {
        dayId: "d4",
        tasks: [
          t("Testar fluxo de cancelamento de queries", "executado"),
          t("Validar regras de frete por região", "executado"),
          t("Corrigir exibição de status “em separação”", "nao_planejado"),
          t("Ajustar sincronização de estoque com o ERP", "nao_planejado", { hasNote: true, isRework: true }),
        ],
      },
      {
        dayId: "d5",
        tasks: [
          t("Code review e otimizações de queries", "executado"),
          t("Testes de regressão de pagamento", "executado"),
          t("Documentar endpoint de webhook", "executado"),
          t("Ajustes finais para deploy", "nao_planejado", { hasNote: true }),
        ],
      },
    ],
  },
  {
    id: "c2",
    name: "Renato Silva",
    role: "Desenvolvedor",
    avatar: "RS",
    counts: { green: 7, yellow: 1, red: 2 },
    metrics: { capacity: 72, adherence: 76, unplanned: 20, notExecuted: 8, attention: 1 },
    effort: [
      { key: "melhoria", value: 38 },
      { key: "bug", value: 28 },
      { key: "suporte", value: 16 },
      { key: "implantacao", value: 14 },
      { key: "outros", value: 4 },
    ],
    days: [
      {
        dayId: "d1",
        tasks: [
          t("Corrigir falha ao gerar NFe quando há desconto", "executado"),
          t("Validar regras de substituição tributária", "executado"),
          t("Ajustar arredondamento no cálculo de ICMS", "nao_planejado"),
          t("Revisar logs de inconsistências", "nao_executado"),
        ],
      },
      {
        dayId: "d2",
        tasks: [
          t("Implementar retenção de tributos no faturamento", "executado"),
          t("Ajustar título do produto na DANFE", "executado"),
          t("Corrigir inconsistência de alíquotas", "nao_planejado"),
          t("Tratar erro ao cancelar NFe autorizada", "nao_executado", { hasNote: true }),
        ],
      },
      {
        dayId: "d3",
        tasks: [
          t("Integrar consulta de situação fiscal", "executado"),
          t("Ajustar envio de eventos da NFe", "executado"),
          t("Corrigir rejeição 778 (CNPJ inválido)", "nao_planejado"),
          t("Revisar validações de schema XML", "nao_executado", { hasNote: true }),
        ],
      },
      {
        dayId: "d4",
        tasks: [
          t("Testar emissão de NFe com produtos importados", "executado"),
          t("Ajustar layout impresso da DANFE", "executado"),
          t("Corrigir cálculo de IPI em promoção", "nao_planejado"),
          t("Homologar serviço de MDF-e", "nao_planejado", { hasNote: true, hasImpediment: true }),
        ],
      },
      {
        dayId: "d5",
        tasks: [
          t("Implementar inutilização de NFe", "executado"),
          t("Ajustar campos opcionais no emissor", "executado"),
          t("Corrigir validação de inscrição estadual", "executado"),
          t("Preparar testes de carga", "nao_planejado", { hasNote: true }),
        ],
      },
    ],
  },
  {
    id: "c3",
    name: "Danielly Wachsmuth",
    role: "Gerente de Projetos",
    avatar: "DW",
    counts: { green: 9, yellow: 2, red: 1 },
    metrics: { capacity: 91, adherence: 89, unplanned: 15, notExecuted: 5, attention: 2 },
    effort: [
      { key: "melhoria", value: 30 },
      { key: "bug", value: 8 },
      { key: "suporte", value: 34 },
      { key: "implantacao", value: 22 },
      { key: "outros", value: 6 },
    ],
    days: [
      {
        dayId: "d1",
        tasks: [
          t("Reunião de alinhamento com Produto", "executado"),
          t("Atualizar cronograma da release 2.4", "executado"),
          t("Validar backlog com PO e Tech Lead", "executado"),
          t("Report status semanal", "nao_planejado"),
          t("Revisar plano de comunicação", "executado"),
        ],
      },
      {
        dayId: "d2",
        tasks: [
          t("Acompanhar status das entregas da sprint", "executado"),
          t("Atualizar RAID log do projeto", "executado"),
          t("Revisar dependências entre times", "executado"),
          t("Preparar apresentação do status executivo", "nao_planejado"),
          t("Alinhar riscos com o cliente", "executado"),
        ],
      },
      {
        dayId: "d3",
        tasks: [
          t("Reunião de riscos do projeto Rota Verde", "executado"),
          t("Atualizar indicadores de performance", "executado"),
          t("Consolidar report semanal de andamento", "executado"),
          t("Alinhar plano de comunicação", "nao_planejado"),
        ],
      },
      {
        dayId: "d4",
        tasks: [
          t("Reunião com cliente — Escopo e prioridades", "executado"),
          t("Ajustar plano de ação dos riscos críticos", "executado"),
          t("Validar entregas com QA e Dev", "executado"),
          t("Acompanhar issues críticas abertas", "nao_executado"),
        ],
      },
      {
        dayId: "d5",
        tasks: [
          t("Report semanal da sprint", "executado"),
          t("Revisão de entregas com stakeholders", "executado"),
          t("Análise de indicadores do projeto", "executado"),
          t("Daily Sync com time", "nao_planejado", { hasNote: true }),
        ],
      },
    ],
  },
  {
    id: "c4",
    name: "Leandro Rangel",
    role: "Coordenador",
    avatar: "LR",
    counts: { green: 9, yellow: 2, red: 1 },
    metrics: { capacity: 91, adherence: 89, unplanned: 22, notExecuted: 12, attention: 1 },
    effort: [
      { key: "melhoria", value: 34 },
      { key: "bug", value: 12 },
      { key: "suporte", value: 26 },
      { key: "implantacao", value: 22 },
      { key: "outros", value: 6 },
    ],
    days: [
      {
        dayId: "d1",
        tasks: [
          t("Revisão arquitetura do módulo de pedidos", "executado"),
          t("Análise de performance da API de rotas", "executado"),
          t("Validação integrações com ERP legado", "nao_planejado"),
          t("Definir padrões de logs e monitoramento", "nao_planejado"),
          t("Mentoria técnica com o time", "executado"),
        ],
      },
      {
        dayId: "d2",
        tasks: [
          t("Acompanhar métricas de qualidade de código", "executado"),
          t("Definir prioridades técnicas da semana", "executado"),
          t("Alinhar com DevOps sobre deploy", "nao_planejado", { isRecurrent: true }),
          t("Apoiar time nas decisões técnicas", "nao_planejado"),
          t("Revisar arquitetura de filas", "executado"),
        ],
      },
      {
        dayId: "d3",
        tasks: [
          t("Revisar alertas do monitoramento", "executado"),
          t("Validar plano de capacidade do servidor", "executado"),
          t("Acompanhar incidentes em produção", "nao_planejado"),
          t("Auditar permissões e acessos críticos", "nao_planejado"),
        ],
      },
      {
        dayId: "d4",
        tasks: [
          t("Reunião de arquitetura com time", "executado"),
          t("Avaliar ferramentas para análise de logs", "executado", { isRecurrent: true }),
          t("Definir melhorias na pipeline CI/CD", "nao_planejado"),
          t("Mentoria técnica com time", "nao_planejado"),
        ],
      },
      {
        dayId: "d5",
        tasks: [
          t("Retrospectiva da sprint com o time", "executado"),
          t("Atualizar documentação de arquitetura", "executado"),
          t("Planejar próximos experimentos técnicos", "executado"),
          t("Revisar plano de contingência", "nao_executado"),
        ],
      },
    ],
  },
  {
    id: "c5",
    name: "Lucas Ferreira",
    role: "Analista QA",
    avatar: "LF",
    counts: { green: 7, yellow: 2, red: 1 },
    metrics: { capacity: 78, adherence: 79, unplanned: 18, notExecuted: 8, attention: 1 },
    effort: [
      { key: "melhoria", value: 24 },
      { key: "bug", value: 34 },
      { key: "suporte", value: 18 },
      { key: "implantacao", value: 20 },
      { key: "outros", value: 4 },
    ],
    days: [
      {
        dayId: "d1",
        tasks: [
          t("Testes manuais da integração de frete", "executado"),
          t("Validação de fluxos de reembolso", "executado"),
          t("Registrar bugs críticos da sprint anterior", "nao_planejado"),
          t("Testar cenário de borda — cupom", "nao_planejado"),
        ],
      },
      {
        dayId: "d2",
        tasks: [
          t("Testes APIs de cálculo de frete", "executado"),
          t("Validação de rotas com vários stops", "executado"),
          t("Testes automáticos de regressão", "nao_planejado"),
          t("Executar testes de carga básica", "nao_planejado"),
        ],
      },
      {
        dayId: "d3",
        tasks: [
          t("Validação GuardiON — ambiente de homologação", "executado"),
          t("Testes de carga na API de pedidos", "executado"),
          t("Registrar bugs no TestRail", "nao_planejado", { isRecurrent: true }),
          t("Revisar cenários não cobertos", "nao_executado"),
        ],
      },
      {
        dayId: "d4",
        tasks: [
          t("Testes módulo de devolução", "executado"),
          t("Validação de integrações com gateway", "executado"),
          t("Checklist de testes de regressão", "executado"),
          t("Apoiar time em testes exploratórios", "nao_planejado", { hasNote: true }),
        ],
      },
      {
        dayId: "d5",
        tasks: [
          t("Testes finais de aceitação", "executado"),
          t("Validação de homologação", "executado"),
          t("Checklist entrega release", "executado"),
          t("Apoiar go-live", "nao_planejado", { hasNote: true }),
        ],
      },
    ],
  },
];

/* ------------------------------------------------- detalhe do colaborador */
export interface DetailChip { label: string; value: string; color: string }
export interface AtuacaoSlice { label: string; value: number; color: string }
export interface DetailNote {
  id: string;
  title: string;
  description: string;
  owner: string;
  when: string;
  color: string;
  status?: string;
}

export const detailQuality = {
  assiduidade: { label: "Assiduidade", caption: "sempre presente", dots: ["#22C55E", "#22C55E", "#22C55E"] },
  organizacao: { label: "Organização", caption: "preenchimento: ok", dots: ["#3B82F6", "#3B82F6", "#70839A"] },
  performance: { label: "Performance", caption: "entrega alta", dots: ["#22C55E", "#22C55E", "#22C55E"] },
};

export const detailHours = { extra: "1h 40m", bank: "+3h 20m" };

export const detailEffort: EffortSlice[] = [
  { key: "bug", value: 17 },
  { key: "implantacao", value: 18 },
  { key: "melhoria", value: 14 },
  { key: "suporte", value: 14 },
  { key: "outros", value: 3 },
];

export const detailAtuacao: AtuacaoSlice[] = [
  { label: "Back-end", value: 34, color: "#8B5CF6" },
  { label: "Integrações / Mensageria", value: 18, color: "#3B82F6" },
  { label: "Banco de Dados", value: 12, color: "#22C55E" },
  { label: "Reunião Interna", value: 11, color: "#FBBF24" },
  { label: "Reunião Externa", value: 9, color: "#F59E0B" },
  { label: "QA / Testes", value: 8, color: "#EC4899" },
  { label: "Documentação Técnica", value: 8, color: "#60A5FA" },
];

export const detailNotes: DetailNote[] = [
  {
    id: "n1",
    title: "Dependência externa de infraestrutura",
    description: "Atenção ao ambiente de homologação do frete na API está pendente.",
    owner: "Time Infra",
    when: "06/08 às 14:12",
    color: "#F59E0B",
  },
  {
    id: "n2",
    title: "Documentação desatualizada pendente",
    description: "Precisamos atualizar o diagrama de conta de consulta de CEP com o token ideal.",
    owner: "Leandro Rangel",
    when: "05/08 às 10:11",
    color: "#3B82F6",
  },
];

export const detailImpediments: DetailNote[] = [
  {
    id: "i1",
    title: "Acesso ao ambiente de testes indisponível",
    description:
      "O ambiente de homologação está apresentando instabilidade desde 05/08 às 16:18, impactando ingestão e testes de integrações e homologações de entregas. Aguardamos a estabilização ou um ambiente alternativo.",
    owner: "Time de infraestrutura",
    when: "05/08 às 16:18",
    color: "#EF4444",
    status: "Em andamento",
  },
];
