## Painel de Tarefas — Central de Ações do Coordenador

Substituir o "Em desenvolvimento" da aba **Painel de Tarefas** por uma central que combina **tarefas geradas por IA** (a partir das dailys + atividades de metas/cronogramas) com **tarefas manuais** criadas pelo coordenador.

### Layout (top → bottom)

1. **Cards de Métricas (topo)**
   - Total de Ações Pendentes
   - Alertas Críticos (vermelho)
   - Sugestões de Melhoria (azul)
   - Botão `[+ Nova Tarefa]` no canto, alinhado aos cards.

2. **Botão "Gerar análise com IA"** — dispara edge function que lê últimas dailys + atividades atrasadas/sobrecarregadas e popula tarefas tipo `ai_suggestion` (idempotente via hash do conteúdo nas últimas 24h).

3. **Sub-abas de triagem**
   - 🚨 **Bloqueios e Gargalos** — tarefas com `category = "blocker"` (travas de daily, impedimentos)
   - 📅 **Riscos de Cronograma & Dependências** — `category = "schedule_risk"` (sobrecarga, atraso de marco, dependência travada)
   - Cada aba mostra cards com: tag de Projeto, tag de Sprint, badge de urgência (crítico/alto/médio), timestamp relativo ("Gerado há 2h após a Daily"), responsável sugerido.

4. **Card de tarefa** — exibe título, descrição, contexto, e botões:
   - **Bloqueios**: `[💬 Gerar Mensagem de Cobrança]` (abre popover com texto pronto gerado pela IA, botão copiar) + `[Marcar como Resolvido]`.
   - **Riscos**: `[🔄 Sugerir Realocação]` (popover lista membros do time com menor carga atual baseada em sprint_backlog_items) + `[Adiar Prazo do Marco]` (abre date picker e atualiza `deadline_date` da atividade vinculada).
   - **Manuais**: `[Editar]` + `[Marcar como Resolvido]`.
   - Ao resolver: animação `animate-fade-out` e contadores atualizam.

5. **Modal "Nova Tarefa"** — campos: nome, projeto (select de productIds autorizados), sprint (select filtrado pelo projeto), prazo (date), descrição, categoria (blocker/schedule_risk/custom), urgência.

### Banco

Nova tabela `coordinator_tasks`:
- `id`, `title`, `description`, `category` (blocker/schedule_risk/custom), `urgency` (critical/high/medium/low), `source` (ai/manual), `status` (pending/resolved), `product_id`, `sprint_id`, `activity_id`, `daily_status_id`, `responsible_member_id`, `deadline_date`, `context_payload` jsonb (snapshot da daily/atividade que gerou), `ai_message` text (mensagem de cobrança), `dedup_hash` text, `created_at`, `updated_at`, `created_by`, `resolved_at`, `resolved_by`.
- Padrão: RLS authenticated CRUD, GRANTs explícitos.

### Edge function `generate-coordinator-tasks`
- Lê últimas dailys (7 dias) com `blocker_level >= 3` e/ou bullets de impedimento, lê `project_backlog_items` atrasados/sobrecarregados, filtra por productIds do usuário.
- Chama Lovable AI (`google/gemini-2.5-flash`) com tool-calling para retornar `[{title, description, category, urgency, product_id, sprint_id, activity_id, daily_status_id, ai_message}]`.
- Faz upsert por `dedup_hash` (sha do título+contexto) para não duplicar.

### Frontend (arquivos novos)
- `src/pages/PainelTarefasPage.tsx` — wrapper com métricas + sub-abas.
- `src/pages/painel/BloqueiosTab.tsx`, `RiscosTab.tsx` — listas filtradas.
- `src/components/painel/TaskCard.tsx` — card universal com ações.
- `src/components/painel/CobrancaPopover.tsx` — mostra `ai_message`, botão copiar.
- `src/components/painel/RealocacaoPopover.tsx` — busca membros com menor carga.
- `src/components/painel/NewTaskModal.tsx` — criar/editar manual.
- `src/hooks/useCoordinatorTasks.ts` — CRUD + invocar edge function.
- Atualizar `ControleGestaoPage.tsx` para usar `<PainelTarefasPage />` em `TabsContent value="tasks"`.

### Fora de escopo
- Envio real para Slack/Teams (apenas copy-to-clipboard).
- Auto-realocação efetiva (apenas sugestão; clicar confirma e atualiza `responsible_ids` da atividade).
- Notificações push / e-mail.
