
## O problema, em palavras simples

No **Painel da Daily**, quando você clica no nome de um desenvolvedor (no "status de preenchimento") para ver o que ele registrou, aparecem duas visões diferentes dependendo de quem está logado:

- **Visão do líder** (ao "Iniciar Daily"): mostra corretamente apenas o que o dev registrou para aquele dia e para aquela squad.
- **Visão do admin** (ao clicar no card do dev): mostra vários itens a mais — atividades de outros dias e, às vezes, de outras squads — misturadas nos blocos "Ontem" e "Hoje".

A causa é técnica, mas dá para explicar assim:

1. A tela do **líder** monta a lista "Ontem/Hoje" olhando somente para as atividades ligadas ao registro daquele dia específico ("Hoje" = só atividades criadas naquele registro e ainda pendentes).
2. A tela do **admin** foi escrita com uma lógica diferente: ela tenta reconstruir "Ontem" e "Hoje" a partir de todas as atividades do usuário, com uma regra de carry-over que, quando não encontra o registro de origem (porque está em outra squad ou sem squad), assume o `created_at` bruto — e acaba puxando itens que não pertencem ao dia/squad em questão.
3. Além disso, o hook que busca atividades por usuário (`useDevDailyActivitiesByUsers`) **não filtra por squad**. Como o admin visualiza várias squads e o mesmo dev pode ter registros em mais de uma, a lista contamina a visão do dia.

Resultado: o admin vê "Ontem" cheio de tarefas antigas/concluídas em outros contextos e "Hoje" com pendências que não são daquele dia.

## O que fazer

Alinhar a visão do admin **à mesma lógica da visão do líder**, e blindar contra mistura entre squads.

### 1. Reescrever o modal de detalhe do dev no `PainelGPPage.tsx`
Trocar o cálculo atual dos blocos "Ontem" e "Hoje" pelo mesmo modelo usado no `IniciarDailyModal` (visão do líder):

- **Ontem** = atividades cujo `closed_entry_id` é exatamente o registro (`detailRow.id`) sendo visto (concluídas + inativadas) **+** carry-overs pendentes de dias anteriores que ainda estavam abertos no dia D.
- **Hoje** = atividades pendentes cujo `created_entry_id` é exatamente o registro sendo visto.
- Se não houver nenhuma atividade estruturada, cair no texto livre (`did_yesterday` / `will_do_today`) como já faz hoje.

### 2. Filtrar as atividades por squad na origem
Na busca `useDevDailyActivitiesByUsers` usada pelo Painel GP, passar o `effectiveSquadId` selecionado e filtrar por `squad_id` (ou `squad_id IS NULL` para registros legados). Isso impede que atividades do mesmo dev em **outra squad** apareçam no detalhe.

### 3. Corrigir o cálculo de carry-over para não usar `created_at` bruto
No filtro `stillPending`, quando o `origin` (registro de origem da atividade) não é encontrado na lista carregada, hoje o código cai para `a.created_at.slice(0,10)`. Vamos:

- Buscar sempre a lista de entries do usuário na squad selecionada (o que já é feito em `userEntries`), e
- Ignorar atividades sem `origin` encontrado — em vez de "adivinhar" pela data de criação. Isso evita puxar itens de outras squads/contextos.

### 4. Aplicar a mesma padronização nas outras telas que usam esse padrão
Para garantir consistência, revisar e alinhar (usando exatamente a mesma função utilitária):

- `src/components/dailys/DailyReadOnlyView.tsx` (usado no Relatório e em outros pontos)
- `src/pages/dailys/HistoricoPage.tsx` (aba Histórico do Painel)
- `src/components/dailys/DevHistoryModal.tsx` (histórico do dev)

Vou extrair a lógica de "Ontem/Hoje a partir das atividades + entry" para um **único helper** compartilhado (ex.: `src/lib/dailyActivitiesView.ts`), para que admin, líder, histórico e relatório executivo usem exatamente as mesmas regras. Assim a inconsistência não volta a aparecer quando um dos lugares for alterado no futuro.

### 5. Verificar impedimentos e presença com o mesmo cuidado
Rápida checagem para confirmar que:

- O bloco de impedimentos no modal de detalhe respeita o mesmo filtro por squad (já respeita hoje — apenas confirmar após o ajuste).
- O contador "concluídas hoje / pendentes" no card do dev no painel usa os mesmos números que o modal passa a mostrar.

## Como saberemos que ficou certo

Após as mudanças, no mesmo dia e mesma squad:

- Abrir o modal do dev como **admin** → deve exibir exatamente os mesmos itens que aparecem para o **líder** ao iniciar a daily.
- Trocar de squad no filtro do admin → o modal do mesmo dev deve refletir apenas os itens daquela squad.
- Abrir o histórico do dev → contagens de "Ontem/Hoje/Impedimentos" batem com o modal.

## Detalhes técnicos (para referência)

- Arquivos principais: `src/pages/dailys/PainelGPPage.tsx`, `src/components/dailys/IniciarDailyModal.tsx`, `src/hooks/useDevDailyActivities.ts`.
- Novo helper sugerido: `src/lib/dailyActivitiesView.ts` exportando `buildYesterdayTodayLists({ entry, activities, entriesForUser, date })`.
- Ajuste no hook `useDevDailyActivitiesByUsers` para aceitar `squadId?: string | null` opcional e aplicar `.eq("squad_id", squadId)` (com fallback opcional para `is null` quando for admin em modo compatibilidade).
- Nenhuma alteração de schema é necessária.
