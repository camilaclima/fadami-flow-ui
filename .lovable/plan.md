## Daily por atividade (mantendo Ontem / Hoje / Impedimentos)

Trocar os dois textareas livres do formulário "Minha Daily" por **listas dinâmicas de atividades**, preservando as três seções. Impedimentos ficam idênticos ao modelo atual.

### 1. Formulário — 3 seções

**Seção 1 — O que fiz (passado)**
- Ao abrir, o sistema carrega automaticamente:
  - todas as atividades cadastradas em "O que farei" da última daily do dev, +
  - qualquer atividade ainda `pendente` de dias anteriores (acumulada).
- Cada linha tem:
  - Checkbox **Concluir** → status `concluida`, `completed_at` = daily atual.
  - Botão **Inativar** (perdeu prioridade) → status `inativa`, `inactivated_at` = daily atual, sai do fluxo.
  - Sem ação → segue `pendente` e migra para a Seção 1 da próxima daily.
- Botão **+ Adicionar item feito** para registrar algo executado fora do planejado (nasce já `concluida` no dia).

**Seção 2 — O que farei (futuro)**
- Lista vazia por padrão; botão **+ Adicionar atividade** cria um input por atividade.
- Texto livre, sem limite, reordenável, removível antes de salvar.
- Ao salvar, cada item vira uma atividade `pendente` que aparecerá na Seção 1 da próxima daily.

**Seção 3 — Impedimentos**
- Bloco atual mantido sem alterações (sanar existentes / adicionar novos).

### 2. Regras de negócio

- **Carry-over automático**: ao abrir o formulário, o sistema busca por `user_id` todas as activities `pendente` (independente da data de origem) para popular a Seção 1.
- **Rótulos dinâmicos** já existentes continuam: "O que fiz ontem / O que farei hoje" e, quando a data de referência é hoje, "O que fiz hoje / O que farei amanhã".
- **Trava de edição**: se o líder já finalizou o `daily_meetings` do dia, o dev não pode mais alterar checks/inativações — comportamento igual ao atual.
- **Histórico**: cada card do dia mostra exatamente as atividades **fechadas naquele dia** (badges Concluída ✓ / Inativada ⊘) e as **novas planejadas** no mesmo card. Impedimentos seguem no bloco atual.
- **Painel do GP**: substitui os parágrafos "ontem/hoje" do dev pela lista estruturada de atividades daquele entry.
- **IA** (`analyze-daily-status`, `analyze-scope-stuck`): passam a receber `activities[]` por dev/dia; o alerta "preso na mesma tarefa há N dias" fica preciso comparando o mesmo `activity_id` pendente ao longo dos dias.

### 3. Detalhes técnicos

**Banco — nova tabela `dev_daily_activities`**
- `id uuid pk`, `user_id uuid`, `squad_id uuid null`
- `description text not null`
- `status text` (`pendente` | `concluida` | `inativa`), default `pendente`
- `created_entry_id uuid` FK → `dev_daily_entries` (daily que planejou/registrou)
- `closed_entry_id uuid null` FK → `dev_daily_entries` (daily em que foi concluída/inativada)
- `completed_at timestamptz null`, `inactivated_at timestamptz null`
- `created_at`, `updated_at`, `updated_by` + trigger de `updated_at`
- RLS: dev lê/escreve as próprias; GP/diretor lê da squad via `has_permission`; GRANTs a `authenticated` e `service_role`.

`dev_daily_entries` mantém `did_yesterday` / `will_do_today` (compatibilidade + histórico antigo), mas o formulário deixa de usá-los. Painel/histórico priorizam as activities quando existirem.

**Frontend**
- `src/pages/dailys/RegistroPage.tsx`: substituir os dois textareas por dois componentes (`PastActivitiesList`, `PlannedActivitiesList`). Labels dinâmicas atuais preservadas; bloco de impedimentos intocado.
- Novo hook `src/hooks/useDevDailyActivities.ts`: `listOpenForUser(userId)`, `listByEntry(entryId)`, mutations `create`, `markCompleted`, `markInactive`, `removeDraft`.
- Ao clicar **Salvar daily**:
  1. cria/atualiza o `dev_daily_entries` do dia;
  2. aplica transições nas activities existentes (`markCompleted` / `markInactive` com `closed_entry_id`);
  3. insere activities novas da Seção 2 com `created_entry_id` = entry do dia, `status = pendente`;
  4. insere itens "não planejados" da Seção 1 já com `status = concluida` no mesmo entry.
- `PainelGPPage.tsx` e `HistoricoPage.tsx`: nos cards do dia, listar activities do entry com badges (Concluída / Inativada / Pendente). Impedimentos permanecem como hoje.
- Edge functions de IA: adaptar payload para receber `activities[]` por dev; ajustar prompts.

### Fora de escopo

- Prioridade, prazo, links ou anexos por atividade.
- Aba dedicada "Minhas atividades".
- Vincular impedimento a uma atividade específica.
- Migração retroativa dos textos antigos (`did_yesterday` / `will_do_today`) para activities — histórico antigo continua sendo lido dos campos originais.
