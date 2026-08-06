# Corrigir o erro ao salvar a daily

## Como vai funcionar

Regra única e simples:

**Dentro de um mesmo dia de daily, cada atividade aparece uma só vez. Em dias diferentes, a mesma atividade pode ser criada quantas vezes for preciso.**

E uma atividade pendente nunca some: ela reaparece todo dia até o dev concluir ou inativar.

## Exemplos

### Exemplo 1 — mesma atividade em outro dia (permitido)

- Dia 03: o dev cria "Verificação do relatório SIR – Concebra" e conclui.
- Dia 10: a demanda volta. Ele cria de novo a mesma atividade.
- Resultado: permitido, sem erro. São duas atividades independentes, cada uma no seu dia.

### Exemplo 2 — atividade que ficou pendente (continua aparecendo)

- Dia 03: o dev cria "Ajuste na tela de login" e deixa pendente.
- Dias 04, 05, 06: ela aparece automaticamente no formulário como pendência arrastada.
- Dia 06: ele marca "Concluí".
- Resultado: uma única atividade, criada no dia 03 e encerrada no dia 06. Ela não vira várias cópias.

### Exemplo 3 — o caso que está dando erro hoje

- No mesmo registro do dia 31/07 existem duas linhas com o texto "Verificação do relatório SIR – Concebra": uma já **concluída** e outra ainda **pendente**.
- Hoje o dev marca a pendente como "Concluí".
- O sistema tenta transformá-la em concluída, mas já existe uma concluída idêntica naquele mesmo dia — e a trava do banco barra, mostrando a mensagem técnica.
- Depois da correção: as duas viram uma só atividade concluída e a daily salva normalmente.

### Exemplo 4 — dev digita a mesma atividade duas vezes no mesmo dia

- Ele adiciona "Sustentação SAGA" e, sem perceber, adiciona de novo no mesmo formulário.
- Resultado: o sistema mantém uma única atividade, sem erro e sem duplicar no painel do líder.

## Por que o erro acontece

A trava atual do banco leva em conta o **estado** da atividade (pendente, concluída, inativa). Por isso ela deixou nascer, no mesmo dia, uma cópia pendente ao lado de uma cópia concluída — exatamente o que não deveria existir. Quando o dev muda a pendente para concluída, as duas ficam iguais e a trava dispara.

Hoje o sistema só sabe contornar essa trava na hora de **criar** uma atividade. Na hora de **concluir ou inativar** ele não sabe, e por isso o erro aparece na tela e o salvamento para no meio.

## O que será feito

1. Mudar a trava do banco para valer por **dia + atividade**, sem considerar o estado. Assim não nasce mais cópia duplicada no mesmo dia, e concluir/inativar deixa de dar conflito.
2. Limpar os casos já existentes: onde há duas linhas iguais no mesmo dia, manter apenas uma — a que já tem desfecho (concluída ou inativa) — preservando nº de card, observações e data de encerramento. Nenhum registro de outros dias é alterado.
3. No formulário da daily, ao adicionar uma atividade que já está pendente naquele dia, reaproveitar a existente em vez de criar outra.
4. Tratar o conflito também nas ações de concluir e inativar, para nunca mais exibir mensagem técnica ao dev.

## Como vamos conferir

- Concluir uma pendência que hoje tem cópia concluída no mesmo dia: salva sem erro.
- Criar em outro dia uma atividade com nome igual a uma já concluída antes: permitido.
- Deixar pendente e voltar no dia seguinte: reaparece uma única vez.
- Painel do líder e histórico: cada atividade aparece uma vez, com o nº do card.

## Detalhes técnicos

- Índice atual: `dev_daily_activities_entry_description_status_unique` em `(user_id, coalesce(squad_id,...), created_entry_id, texto normalizado, status)`.
- Novo índice: mesma expressão sem `status`, mantendo `WHERE created_entry_id IS NOT NULL`.
- `upsert_dev_daily_activity` terá o `ON CONFLICT` atualizado para a nova chave.
- Ordem da migração: consolidar duplicatas, criar o novo índice, remover o antigo, atualizar a função.
- Ajustes de código em `src/hooks/useDevDailyActivities.ts` e `src/pages/dailys/RegistroPage.tsx`.
