## Objetivo

Três correções em Dailies:

1. Separar corretamente registros por squad no painel do líder (bug de vazamento entre squads).
2. Garantir que o registro salvo pelo dev sempre apareça no card dele em "Minha Daily".
3. Após "Encerrar Daily" no painel do líder, salvar os dados e deixar o botão "Iniciar Daily" desabilitado até o próximo dia útil.

---

## 1. Registros por squad — vazamento no painel do líder

### Onde
`src/hooks/useDevDailyEntries.ts` → `useDevDailyEntriesByDate`

### Problema
Quando o líder abre o painel filtrando por uma squad, o hook busca entradas usando `.or("squad_id.eq.<squad>, user_id.in.(<membros>)")`. Isso faz com que um dev que pertence a mais de uma squad (ex.: Luiz no TOR e TOR+) tenha as entries registradas em uma squad aparecendo também no painel da outra squad, porque a condição por `user_id` casa em ambas.

### Correção
Reescrever a query para separar registros por squad de forma estrita, mantendo apenas fallback para entradas legadas sem `squad_id`:

- Se a entrada tem `squad_id` preenchido, só aparece no painel daquela squad.
- Se `squad_id` é nulo (registros antigos), continua aparecendo para os membros da squad (compat).

Efeito prático: o que o dev escreveu para a Squad A não aparece mais na Squad B.

---

## 2. "Meus registros" sumindo em Minha Daily

### Onde
- `src/pages/dailys/RegistroPage.tsx` (filtro `entries.filter(e => e.squad_id === selectedSquadId)`)
- Migration Supabase para backfill

### Problema
- Devs com entradas antigas (`squad_id = null`) deixam de vê‑las quando escolhem uma squad no seletor, mas o líder consegue enxergar via `user_id` (comportamento inconsistente do print).
- Entradas novas gravadas com `selectedSquadId` funcionam, mas registros legados desaparecem.

### Correção
- Frontend: no `RegistroPage`, incluir também as entradas com `squad_id = null` além das da squad selecionada. Ao editar/salvar uma entrada antiga, o `upsert` já grava com `selectedSquadId`, então ela migra automaticamente.
- Backend (migration): backfill único preenchendo `dev_daily_entries.squad_id` para devs que hoje pertencem a exatamente uma squad e têm registros com `squad_id = null`. Assim os históricos ficam ligados à squad correta.

Efeito prático: nenhum registro fica "invisível" para o dev que o criou; o histórico volta a aparecer normalmente.

---

## 3. Encerrar Daily do líder — salvar e travar botão até o próximo dia

### Onde
- `src/pages/dailys/PainelGPPage.tsx`
- Renomear ação para deixar claro o fluxo (`Iniciar Daily` → mantém o mesmo botão, mas com estado "Daily encerrada" após salvar).

### Problema
Hoje o botão "Iniciar Daily" abre o modal e permite salvar; após salvar, o botão continua ativo (permite reabrir e resalvar). O usuário pede: ao encerrar, os dados são persistidos (já são via `useCreateDailyMeeting`) e o botão fica inativo até o próximo dia útil.

### Correção
- Consultar `daily_meetings` da squad efetiva na data selecionada (`meeting_date = date` e `squad_id = effectiveSquadId`).
- Se existe um encontro salvo:
  - Botão principal fica desabilitado com o rótulo "Daily encerrada".
  - Mostrar hora/data em que foi encerrada e nome de quem conduziu.
- Após salvar no `IniciarDailyModal` (submit), invalidar a query `daily_meetings` para o botão travar imediatamente.
- Ao virar o dia (troca de `date` para o próximo dia útil), o botão volta a ficar ativo automaticamente.

Nenhuma mudança em RLS. Sem novas tabelas.

---

## Arquivos afetados

- `src/hooks/useDevDailyEntries.ts` (query por squad estrita + fallback null)
- `src/pages/dailys/RegistroPage.tsx` (filtro inclui `squad_id = null` legado)
- `src/pages/dailys/PainelGPPage.tsx` (estado do botão + query de `daily_meetings` do dia)
- `src/components/dailys/IniciarDailyModal.tsx` (invalidação de `daily_meetings` após salvar — se ainda não estiver acontecendo)
- `supabase/migrations/<timestamp>_backfill_dev_daily_entries_squad.sql` (backfill único para devs com uma única squad)

Sem novas tabelas, sem alterações em RLS, sem novas dependências.
