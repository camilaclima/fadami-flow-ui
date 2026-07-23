
## O que está acontecendo (em linguagem simples)

Nas telas de daily, cada dev tem três tipos de atividade num dia:

1. **Concluídas** naquele dia (✓ verde)
2. **Inativadas** naquele dia (✗ cinza)
3. **Pendentes que sobraram de dias anteriores** e continuavam abertas (⏱ laranja) — chamamos de "carry-over"

No **Histórico** e no **Painel do Líder (Iniciar Daily)**, a coluna **"Ontem"** mostra os **três** tipos juntos. É por isso que você vê 2 itens em "Ontem".

Já no **Relatório Executivo**, a coluna **"Ontem"** mostra **só os dois primeiros** (concluídas + inativadas). O carry-over foi esquecido, então some 1 item que existia como pendência arrastada de dias anteriores.

Resultado: mesmo dev, mesmo dia, número de itens diferente entre as telas.

### Onde isso aparece hoje

- `src/lib/dailyActivitiesView.ts` (`buildYesterdayTodayLists`) — é a regra "oficial", usada pelo `IniciarDailyModal` e pelo `DevHistoryModal`. Ela junta `done + inactive + stillPending` em "Ontem".
- `src/pages/dailys/HistoricoPage.tsx` (função `activitiesByEntry`) — segue a mesma regra: monta `planned` incluindo pendências antigas ainda abertas (equivalente a `stillPending`) e exibe em "Hoje/Farei". A coluna "O que fiz" mostra done+inactive. *(observação: aqui o carry-over aparece em "Hoje/Farei", que é outro corte — ver seção "efeito colateral" abaixo).*
- `src/pages/dailys/RelatorioExecutivoPage.tsx` (função `activitiesByEntry`, ~linha 360, e a exibição em ~linha 2019) — só calcula `done`, `inactive` e `planned`. Não calcula `stillPending`, então "Ontem" fica curto.

### Por que isso importa em outros lugares

- **PDF do Relatório Executivo**: usa a mesma função, então o PDF também sai com "Ontem" incompleto.
- **Métricas do relatório** (ex.: "campo Ontem curto") olham só o texto livre `did_yesterday` — não são afetadas.
- **Painel GP / Iniciar Daily / Histórico do Dev**: já usam `buildYesterdayTodayLists`, então estão corretos e servem como referência.

## Correção proposta

Trazer o Relatório Executivo para a mesma regra que o resto do app, reaproveitando a lógica que já existe.

1. Em `src/pages/dailys/RelatorioExecutivoPage.tsx`, no `useMemo` `activitiesByEntry`, calcular também `stillPending` por entry, usando exatamente a mesma condição de `buildYesterdayTodayLists`:
   - origem (`created_entry_id`) é anterior ao dia D da entry
   - ainda não foi fechada até D (`closed_entry_id` inexistente ou seu `entry_date` > D)
   - `closed_entry_id !== entryId`
2. Expor `stillPending` no helper `actsFor(entryId)` e no tipo `ReportItem` que persiste o snapshot do relatório (para o histórico salvo continuar consistente).
3. Na renderização de "Ontem" (por volta da linha 2019), somar `done + inactive + stillPending`. Cada `stillPending` é exibida com o `DevActivityCard` no modo `pending` (mesmo visual da tela de origem), abaixo das concluídas/inativadas.
4. Ajustar a condição "vazio" ((done+inactive+stillPending).length === 0) para só cair no fallback de texto livre `did_yesterday` quando realmente não há nenhuma atividade estruturada.
5. Ajustar a serialização/rehidratação do snapshot (`item.done`, `item.inactive`, `item.planned` → acrescentar `item.stillPending`) para que relatórios salvos abram idênticos.

### Efeito colateral a validar (sem mudar comportamento agora)

No `HistoricoPage`, o carry-over hoje aparece em **"O que farei"** (planned), enquanto no `IniciarDailyModal` aparece em **"Ontem"**. Isso é uma inconsistência menor separada, e não é o que o usuário reportou. Vou **deixar como está** nesta correção e só sinalizar aqui para você decidir depois se quer padronizar também.

## Como validar

- Abrir a mesma daily (ex.: Julio Souza, 21/07) no Histórico e no Relatório Executivo → contagem em "Ontem" bate.
- Gerar o PDF → mesmo conteúdo.
- Abrir um relatório salvo antigo → continua abrindo sem quebrar (campos novos ficam vazios em snapshots antigos, sem erro).
