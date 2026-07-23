## O que está acontecendo (em linguagem simples)

Quando um desenvolvedor deixa uma tarefa "pendente" num dia (ex.: 21/07) e no dia seguinte (22/07) essa tarefa continua em aberto, ela é uma **tarefa "arrastada"** — precisa aparecer no dia 22 como algo que ainda está pra fazer.

- **Painel do líder (Histórico da squad)** já sabe olhar para essas tarefas arrastadas de dias anteriores e as mostra junto com a daily do dia 22.
- **Modal "Histórico do dev"** (visão individual do desenvolvedor) **NÃO** olha para as tarefas arrastadas. Ele só mostra atividades que estão marcadas como "criadas nesse dia" ou "fechadas nesse dia". Se a tarefa foi criada em outro dia e continua pendente, ela some — e o "HOJE" acaba aparecendo vazio (traço "—").

Foi exatamente isso que aconteceu com a Lorrayne no dia 22/07: as 2 tarefas do "HOJE" que aparecem no painel da squad ("Adaptação view monitoramento Power BI Elovias" e "Migração CLN - Relatórios") são pendências vindas do registro dela do dia 21/07 que continuavam abertas. O modal individual não sabe considerar essas pendências, então mostra "HOJE —".

**Acontece com outros desenvolvedores?** Sim. Uma varredura na base mostrou **96 registros** de daily (de **34 desenvolvedores** diferentes) com pelo menos uma pendência arrastada de dia anterior. Ou seja, sempre que um dev fica com tarefa em aberto de um dia para o outro, o modal individual vai divergir do painel da squad.

## Correção proposta

Alinhar a lógica do `DevHistoryModal` com a do painel do líder, usando o utilitário compartilhado que já existe (`src/lib/dailyActivitiesView.ts` → `buildYesterdayTodayLists`). Ele já implementa a regra correta:

- **ONTEM** = concluídas + inativadas fechadas nesse dia + pendências ainda abertas vindas de dias anteriores (carry-over).
- **HOJE** = pendências criadas exatamente nesse registro.

## Arquivos alterados

- `src/components/dailys/DevHistoryModal.tsx`
  - Substituir a montagem manual de `done`/`inactive`/`pending` pela chamada a `buildYesterdayTodayLists({ entry, activities, entriesForUser: entries })`.
  - Renderizar `yesterday` (done + inactive + stillPending, cada um com seu `kind`) na coluna ONTEM e `today` na coluna HOJE.
  - Manter os fallbacks de texto livre (`did_yesterday`/`will_do_today`) apenas quando não existir nenhuma atividade estruturada correspondente.

## Fora do escopo

- Não alterar o painel do líder — a lógica dele já está correta.
- Não alterar o Relatório Executivo — a decisão anterior de excluir carry-over do "ONTEM" do relatório continua valendo (foi pedido explícito de outro card).
- Sem migração de banco: é só uma correção de exibição.

## Como validar

- Abrir o histórico da Lorrayne no dia 22/07: o "HOJE" deve mostrar as 2 tarefas pendentes ("Adaptação view monitoramento Power BI Elovias" e "Migração CLN - Relatórios"), batendo com o painel da squad.
- Conferir em outros dias/desenvolvedores com carry-over que as colunas passem a bater entre os dois lugares.
