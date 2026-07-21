## O que vamos melhorar

Na aba **Histórico** do Painel da Daily, hoje só aparecem os desenvolvedores que preencheram alguma coisa naquele dia — quem esqueceu ou não participou simplesmente some. E não temos como saber quanto tempo cada dev demorou nem quanto a reunião durou. Também, no histórico individual do dev, quando ele participa de mais de uma squad, aparecem cards duplicados sem indicar de qual squad é cada registro.

Vamos resolver tudo isso.

---

## 1) Mostrar a squad inteira ao abrir um dia

Hoje, ao clicar num dia do histórico, aparecem apenas os devs que registraram algo (mais os marcados pelo líder na reunião). O restante da squad fica invisível.

**Vamos mudar para:** listar **todos os membros da squad selecionada**, mesmo os que não preencheram nada. Quem não preencheu aparece com o card em **cinza**, com um selo "Sem registro" — igual ao comportamento do modal "Iniciar Daily".

Como funciona por baixo dos panos: já temos a lista de membros da squad (via `squad_members` → `team_members` → `profiles`). Vamos usar essa mesma lista para preencher o modal do dia, cruzando com os registros existentes: se o dev tem registro, mostra o registro; se não tem, mostra o card cinza vazio.

---

## 2) Contadores no cabeçalho do dia

Vamos adicionar dois números no topo do modal do dia:

- **Presença:** "X de Y presentes" — Y é o total de membros da squad; X é quem foi marcado como presente pelo líder (nem ausente do trabalho, nem "não participou").
- **Preenchimento:** "X de Y preencheram" — Y é o total de membros da squad; X é quem tem registro salvo em `dev_daily_entries` (com `fill_completed_at` preenchido) até o momento em que o líder salvou a daily.

Se não houve reunião do líder registrada naquele dia, mostramos só a contagem de preenchimento.

---

## 3) Tempos da daily

Já guardamos no banco o tempo que cada dev levou para preencher (`fill_duration_seconds` em `dev_daily_entries`) e o tempo da reunião do líder (`duration_seconds` em `daily_meetings`). Só precisamos exibir.

Vamos mostrar:

- **Ao lado do nome de cada dev** no modal do dia: um badge tipo `⏱ 4m 12s` com o tempo que ele levou para preencher. Se não preencheu, não mostra badge.
- **Um bloco de resumo no topo do modal** com quatro números:
  - Tempo da reunião do líder (do "Iniciar Daily" ao "Salvar").
  - Soma dos tempos de preenchimento dos devs.
  - **Tempo total** = reunião + soma dos devs.
  - **Tempo médio por dev** = soma dos devs ÷ quantidade de devs que preencheram.

Formato humano ("4m 12s", "1h 05m") já existe em `src/lib/formatDuration.ts`.

---

## 4) Tag de squad no histórico individual do dev

Ao clicar no histórico de um dev específico (modal `DevHistoryModal`), hoje aparecem cards de todas as squads misturados, o que dá a impressão de "duplicados" para devs multi-squad (ex.: Luiz Barbosa em TOR e TOR+).

**Vamos adicionar:** em cada card de registro, uma **tag colorida com o nome da squad** (ex.: "TOR", "TOR+"), lida do campo `squad_id` do registro. Para registros antigos sem `squad_id`, mostramos uma tag neutra "Sem squad".

Isso resolve visualmente a "duplicação": o usuário passa a entender que são dois registros legítimos, um para cada squad.

---

## Onde vamos mexer

- `src/pages/dailys/HistoricoPage.tsx` — buscar membros da squad, gerar cards vazios (cinza), calcular contadores de presença/preenchimento, calcular e mostrar tempos (dev, líder, total, médio).
- `src/components/dailys/DevHistoryModal.tsx` — mostrar tag da squad em cada card, usando o mapa `squadNameById` já existente em `useSquads`.

Nada de mudança de schema — todos os dados necessários já existem no banco.

## Fora de escopo

- Alterações no fluxo de registro do dev ou no modal de "Iniciar Daily" do líder.
- Novos campos no banco.
- Mudanças no Painel GP (aba principal) ou na aba Saúde.
