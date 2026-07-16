## Correções na página de Registro de Daily e no Painel do Líder

Três ajustes independentes no fluxo de dailys.

---

### 1. Modal "Registrar daily" — dois X e fechamento acidental

**Arquivo:** `src/pages/dailys/RegistroPage.tsx` (modal em ~L953-982)

- O `DialogContent` do shadcn já renderiza um botão X automático no canto. O código adiciona manualmente um segundo `DialogClose` com ícone X, causando os dois botões visíveis.
- Remover o `DialogClose` manual do `DialogHeader` e o ícone `X` associado. Manter apenas o X nativo do `DialogContent`.
- O `onOpenChange` atual (`if (!val) return`) bloqueia qualquer fechamento — inclusive o X. Substituir por lógica que:
  - permite fechar via X e via `DialogClose` interno (chamar `setOpen(false)`);
  - bloqueia clique fora e tecla ESC usando `onPointerDownOutside={(e) => e.preventDefault()}`, `onInteractOutside={(e) => e.preventDefault()}` e `onEscapeKeyDown={(e) => e.preventDefault()}` no `DialogContent`.

Resultado: um único X, fechamento apenas por ele; clique fora e ESC ignorados.

---

### 2. Impedir duplicação de registros por dia

**Arquivo:** `src/pages/dailys/RegistroPage.tsx`

Hoje o botão "Registrar daily" sempre abre em modo `create`, e `useUpsertDevDailyEntry` faz INSERT quando não há `id`, gerando várias linhas para a mesma data + squad.

Correções:

- **Botão "Registrar daily"** (L714-718): calcular `hasAvailableDate = dateOptions.some(o => !entries.some(e => e.entry_date === o.value))` e desabilitar o botão quando `false`. Tooltip: "Todas as dailys disponíveis já foram registradas. Novo registro liberará às 17h."
- **`handleOpenCreate`** (L292-322): se o `targetDate` calculado já possui uma entry existente para a squad selecionada, abortar (o botão nem deveria ter aberto, mas guarda extra) — ou redirecionar para modo `edit` daquela entry. Seguir a opção de guarda: retornar cedo com toast informativo.
- **`submit`** (fluxo de salvamento): antes de chamar `upsert.mutateAsync` em modo `create`, checar se `entries.find(e => e.entry_date === date)` existe; se sim, forçar o payload a incluir `id: existing.id` (converte insert em update). Isso protege contra corridas.

A regra de "liberar às 17h" já é implementada por `allowedDates()` (L86-98), que só inclui "Hoje" quando `now.getHours() >= 17`. Nada a mudar ali.

---

### 3. Impedimentos misturando entre squads no Painel do Líder

**Arquivo:** `src/pages/dailys/PainelGPPage.tsx`

Causa: `userEntries` (L163-174) e `allUserEntries` (L204-214) buscam todas as entries dos `userIds` da squad, sem filtrar por `squad_id`. Como um mesmo dev pode ter entries em outra squad, os `entry_ids` das outras squads entram em `allImpediments`/`squadAllImpediments` e vazam para o painel/histórico atual.

Correção (mesma lógica já aplicada em `useDevDailyEntriesByDate` para entries de "ontem/hoje"):

- Nas duas queries, filtrar por squad:
  - entries explicitamente da squad: `.eq("squad_id", effectiveSquadId)`
  - **união** com entries legadas (`squad_id IS NULL`) dos mesmos `userIds`, para compatibilidade com registros antigos.
- Executar como duas chamadas e mesclar por `id` no cliente (padrão já existente no projeto), ou uma única chamada com `.or("squad_id.eq.<id>,squad_id.is.null")` combinada com `.in("user_id", userIds)`.

Com isso `allEntryIds`/`allUserEntryIds` passam a conter só entries da squad selecionada → impedimentos exibidos no card do dev e na seção "Impedimentos da Squad" ficam escopados corretamente. O `DevHistoryModal` recebe apenas `entryIds` da squad ativa (mesma lógica), então herda o fix.

---

### Verificação após implementar

- Abrir "Registrar daily": um X apenas; clicar fora / ESC não fecha; X fecha.
- Registrar daily para hoje → botão "Registrar daily" fica desabilitado; se abrir mesmo assim (data alternativa), salvar não cria linha duplicada.
- No painel do líder, alternar entre Squad B e Squad Inovação para o mesmo dev → cada uma mostra apenas seus impedimentos.
