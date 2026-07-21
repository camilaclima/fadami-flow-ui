## Objetivo

1. Fazer a aba **Histórico** do Painel da Daily respeitar o filtro de Squad selecionado no topo (hoje ignora a squad e mostra todos os devs de todas as squads do líder).
2. Tornar obrigatório o preenchimento de **"O que farei hoje"** ao registrar a daily — mínimo 1 atividade planejada — evitando entries com `will_do_today` vazio que causam o "—" no painel do líder.
3. Backfill retroativo do snapshot textual para registros antigos que já foram salvos vazios.

## Diagnóstico

**Item 1** — `src/pages/dailys/HistoricoPage.tsx` usa `sim.squadIds` (todas as squads do líder) e nunca aplica o `effectiveSquadId` selecionado no topo. Um líder de TOR e TOR+ vê no Histórico devs das duas squads mesmo com "TOR" selecionado.

**Item 2** — Em `src/pages/dailys/RegistroPage.tsx` a validação atual (`totalPast === 0 && totalFuture === 0`) aceita a daily se houver **apenas** atividades concluídas, permitindo salvar sem nenhum plano para hoje. Isso gera entries com `will_do_today` vazio, que no painel do líder aparecem como "—".

## Alterações

### 1) `src/pages/dailys/HistoricoPage.tsx` — respeitar filtro de squad

- Ler `effectiveSquadId` do mesmo estado usado por `PainelGPPage` (mesmo store/contexto/URL param).
- Quando houver squad selecionada:
  - Restringir `allowedUserIds` aos membros daquela squad apenas.
  - Filtrar `dev_daily_entries` por `squad_id = effectiveSquadId`, com fallback `is('squad_id', null)` para membros conhecidos daquela squad (padrão já usado em `useDevDailyEntriesByDate`).
  - Filtrar `activitiesByEntry` também por `squad_id` (com mesmo fallback `null`) antes de compor `done` / `inactive` / `planned`.
  - Passar `scopedSquadIds = [effectiveSquadId]` para `DayDetailDialog` para que `daily_meetings` também respeite a squad.
- Em "Todas as squads", manter comportamento atual.

### 2) `src/pages/dailys/RegistroPage.tsx` — tornar "O que farei hoje" obrigatório

- Ajustar a validação em `handleSave`:
  - Exigir `totalFuture >= 1` (soma de `plannedDrafts.length + plannedInEntry.length + carry-overs mantidos como "pending"`).
  - Se `totalFuture === 0`, bloquear o save com toast: `"Informe ao menos uma atividade em 'O que farei hoje'."`.
  - Manter também a regra existente de exigir ao menos uma concluída ou planejada? Não — a nova regra é mais estrita: **sempre** precisa de plano para hoje.
- Reforço visual: marcar o cabeçalho "O que farei hoje" com asterisco/`*` e desabilitar o botão "Salvar" enquanto `totalFuture === 0`, com tooltip explicando a exigência.
- Ajustar o fluxo de "carry-over" para que marcar todos os pendentes como `done` não seja suficiente — o dev precisa adicionar pelo menos 1 nova atividade planejada **ou** manter pelo menos 1 pendente como `pending`.

### 3) Backfill retroativo (migration)

Para entries antigas com `will_do_today`/`did_yesterday` NULL ou vazio, mas com atividades estruturadas em `dev_daily_activities`:

- `did_yesterday`: `✓ <description>` para atividades com `closed_entry_id = entry.id` e `status = 'concluida'`; `⊘ <description> (Inativada)` para `status = 'inativa'`.
- `will_do_today`: `○ <description>` para atividades com `created_entry_id = entry.id` que não estejam fechadas na própria entry.
- Só atualiza campos NULL/vazios; nunca sobrescreve dados válidos.

## Fora de escopo

- Nenhuma mudança em `PainelGPPage` (já respeita `effectiveSquadId`).
- Nenhuma mudança no formato do modal do dev além da validação e do indicador de obrigatoriedade.

## Detalhes técnicos

- Fonte de verdade permanece `dev_daily_activities`; os snapshots textuais (`will_do_today` / `did_yesterday`) continuam sendo usados como fallback de renderização.
- Fallback `squad_id IS NULL` é mantido enquanto existirem entries legadas.
- A validação nova é frontend; se quiser, em passo futuro, pode-se adicionar um CHECK/trigger no banco — não incluído aqui para não bloquear escrita via edge functions administrativas.
