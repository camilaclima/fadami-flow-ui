## Menu "Dailys" — Sistema de Daily Monitorada com IA

Novo menu pai **Dailys** no sidebar, agrupando 5 telas filhas. A UI atual (Saúde do Projeto em `/daily-status`) permanece intacta — este é um sistema paralelo focado no rito da reunião diária.

### Telas (rotas)

1. `/dailys/registro` — **Área do Dev**: abas "Novo Registro" (3 textareas: ontem / hoje / impedimentos) + "Meu Histórico" (cards por data).
2. `/dailys/painel` — **Painel do Analista/GP**: lista da squad com badges Preencheu/Pendente, card de Insights da IA (sugestões de perguntas por dev), botão "Iniciar Daily".
3. **Modal "Iniciar Daily"** (acionado do painel): fluxo sequencial com respostas concatenadas, textarea de observações, drag&drop de transcrição, tabela com checkboxes [Câmera Ligada] e [Não Falou] por membro.
4. `/dailys/historico` — **Histórico Geral**: tabela/timeline filtrável por data e squad, abre relatório completo.
5. `/dailys/saude` — **Saúde e Engajamento**: KPIs + gráficos (impedimentos ativos %, assiduidade de preenchimento, câmeras ligadas vs silêncio).

### Backend (Lovable Cloud)

Novas tabelas:
- `dev_daily_entries` — registro individual do dev: `user_id`, `squad_id`, `entry_date`, `did_yesterday`, `will_do_today`, `impediments`, timestamps.
- `daily_meetings` — reunião conduzida pelo GP: `squad_id`, `meeting_date`, `conducted_by`, `observations`, `transcript_url`, timestamps.
- `daily_meeting_attendance` — 1 linha por membro presente: `meeting_id`, `member_user_id`, `camera_on` bool, `stayed_silent` bool, `dev_entry_id` (FK opcional).

RLS: authenticated CRUD; GRANTs explícitos. Storage: reusar bucket `attachments` (pasta `daily-transcripts/`).

Edge function `generate-daily-insights`: lê os `dev_daily_entries` da squad/data, chama Lovable AI (`google/gemini-2.5-flash`) e devolve `[{ dev_name, suggested_questions: string[] }]`.

### Frontend

- `src/components/layout/AppSidebar.tsx`: novo grupo **Dailys** (ícone `MessageSquare`) com 5 itens filhos. Permissão `__always__` por ora.
- `src/App.tsx`: 5 rotas novas protegidas pelo `AppLayout`.
- Páginas: `src/pages/dailys/RegistroPage.tsx`, `PainelGPPage.tsx`, `HistoricoPage.tsx`, `SaudePage.tsx`.
- Componentes: `src/components/dailys/IniciarDailyModal.tsx`, `DevEntryForm.tsx`, `DevHistoryList.tsx`, `SquadStatusList.tsx`, `AiInsightsCard.tsx`, `AttendanceTable.tsx`.
- Hooks: `src/hooks/useDevDailyEntries.ts`, `useDailyMeetings.ts`, `useDailyInsights.ts`.

### Identidade visual

Reuso total dos tokens existentes (cards, badges, tabs, drawer), accent âmbar `#F97316`, rounded 2xl, neumorfismo/glassmorfismo. Recharts para a tela de saúde, mesmo padrão da `DashboardGeralPage`.

### Fora de escopo

- Geração automática de transcrição (apenas upload).
- Notificações de cobrança automáticas.
- Integração com Slack/Teams.
