
# Aba "Metas e Cronogramas" — 4 sub-abas

Vou substituir o conteúdo "em desenvolvimento" da aba **Metas e Cronogramas** por uma nova página com 4 sub-abas, reutilizando o schema existente (`sprints`, `sprint_backlog_items`, `project_backlog_items`, `team_members`, `products`).

## Filtro superior (compartilhado)
Seletor "Projeto" no topo (Todos os Projetos / projeto específico) — limitado aos produtos autorizados do usuário (via `useAuthorizedProducts`). Todas as 4 abas respeitam este filtro.

## 1. Sub-aba: Sprints
- Botão `[+ Criar Sprint]` → modal com: Nome, Data Início, Data Fim, Produto (já filtrado), e seção "Atividades" onde o usuário pode:
  - Criar novas atividades inline (mesmos campos da aba Atividades).
  - Selecionar atividades existentes sem sprint vinculada (lista checkbox).
- Sprints aparecem como **cards** (nome, datas, badge status, contador atividades, mini health).
- Clicar no card abre **Sprint Detail Drawer**:
  - **Dashboard Inteligente**: card de Saúde (Verde/Amarelo/Vermelho com base em % concluído vs % tempo decorrido, qtd impedidos).
  - **Bloco IA** "Gargalos Detectados" + "Dicas de Recuperação" — gerado via edge function `analyze-sprint-health` (nova) usando Lovable AI (`google/gemini-2.5-flash`). Cache em estado local.
  - **Lista de Atividades** (título, responsável, prazo, status com badges coloridos) + botão rápido "+ Atividade".

## 2. Sub-aba: Atividades
- Botão `[+ Criar Atividade]` → modal: Título, Prazo (date), Nível de Impacto (Crítico/Alto/Médio/Baixo), Vincular à Sprint (dropdown + "Não vincular"), Dependência (dropdown opcional de outra atividade).
- Lista dividida em 2 seções: **"Atividades Vinculadas a Sprints"** e **"Backlog (Sem Sprint)"**.
- Ordenação por prazo mais próximo de vencer.
- Atividades com impacto "Crítico" recebem badge vermelho com animação pulse (`animate-pulse`).

## 3. Sub-aba: Roadmap
- Filtro de granularidade: Semanas / Meses / Trimestres (default Meses).
- Linha do tempo horizontal: colunas = períodos, linhas = projetos (ou um único projeto).
- Cada atividade vira um bloco posicionado conforme seu prazo, com cor do produto e badge de impacto.
- Atividades com dependência mostram badge amarelo "Bloqueado por: [nome]" e linha SVG conectora simples quando a dependência está visível.

## 4. Sub-aba: Cronograma
- Lista hierárquica colapsável: **Projeto → Sprints → Atividades**.
- Cada linha mostra: título, responsável, prazo. Atividades atrasadas (`deadline < today` e não concluídas) com data em vermelho.
- Ícone de corrente (`Link2`) ao lado de atividades com dependência, tooltip exibe a tarefa bloqueadora.

## Mudanças técnicas

### Banco de dados
Estender `project_backlog_items` para suportar o novo fluxo:
- `impact` text default `'medium'` (critical/high/medium/low)
- `sprint_id` uuid nullable (vincular a sprint)
- `dependency_id` uuid nullable (auto-referência)
- `status` text default `'todo'` (todo/in_progress/blocked/done)
- `responsible_id` uuid nullable (team_member)
- `deadline_date` date nullable (separado do `deadline` texto legado)

Manter campos existentes para retrocompatibilidade.

### Frontend
Arquivos novos:
- `src/pages/MetasCronogramasPage.tsx` — wrapper com filtro de projeto + sub-tabs.
- `src/pages/metas/SprintsTab.tsx`
- `src/pages/metas/AtividadesTab.tsx`
- `src/pages/metas/RoadmapTab.tsx`
- `src/pages/metas/CronogramaTab.tsx`
- `src/components/metas/CreateSprintModal.tsx`
- `src/components/metas/CreateActivityModal.tsx`
- `src/components/metas/SprintDetailDrawer.tsx`
- `src/hooks/useActivities.ts` (CRUD sobre `project_backlog_items` estendido)

Edge function nova:
- `supabase/functions/analyze-sprint-health/index.ts` — recebe sprint+atividades, retorna `{saude, gargalos[], dicas[]}` via Lovable AI.

Atualizar `ControleGestaoPage.tsx` para apontar `<TabsContent value="projects">` para `<MetasCronogramasPage />`.

## Fora de escopo
- Drag-and-drop no roadmap (visualização estática por enquanto).
- Gantt com bars de duração (uso apenas marcadores por data limite, conforme pedido "prazos rígidos").
- Edição inline de atividades no cronograma (somente leitura + abrir modal).
