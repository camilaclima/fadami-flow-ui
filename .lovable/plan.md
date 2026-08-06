# Corrigir o erro de duplicidade ao salvar a daily (mantendo a regra correta)

## Regra que vale (conforme você definiu)

- A mesma atividade **pode** ser criada novamente em outro dia, mesmo que já tenha sido concluída ou inativada antes. É trabalho novo, deve ser permitido.
- Uma atividade que ficou **pendente continua aparecendo** todos os dias até o dev concluir ou inativar. Ela não deve ser recriada nem duplicada — é sempre a mesma.
- Dentro de **um mesmo registro de daily** não faz sentido existir a mesma atividade duas vezes.

## Por que o erro aparece hoje

A trava do banco hoje considera o **estado** da atividade como parte da chave: ela impede duas atividades com mesmo texto **e mesmo estado** dentro do mesmo registro.

O efeito prático é o contrário do desejado:

- Ela **permite** que exista, no mesmo registro, uma "Verificação do relatório SIR – Concebra" concluída **e** outra pendente ao mesmo tempo (estados diferentes) — foi assim que os dados ficaram: há dezenas de registros nessa situação.
- E aí, quando o dev marca a pendente como "Concluí", o estado muda para concluída e bate de frente com a concluída que já estava lá → a trava dispara e o salvamento para com a mensagem técnica.

Ou seja: o erro não é por repetir a atividade em outro dia (isso já é permitido, porque a trava é por registro de daily). O erro é por existir a mesma atividade duplicada **dentro do mesmo registro**, em estados diferentes.

## Como vai ficar

- Repetir a mesma atividade em **outro dia**: permitido, sem nenhuma mudança.
- Atividade **pendente**: continua aparecendo dia após dia como pendência arrastada, até ser concluída ou inativada. Nunca é recriada em paralelo.
- Dentro do **mesmo registro**: existe apenas uma atividade com aquele nome. Concluir ou inativar passa a funcionar sempre, sem mensagem de erro.

## Implementação

1. Ajustar a trava do banco: a unicidade passa a ser por **usuário + squad + registro da daily + texto da atividade**, **sem** o estado. Assim uma atividade não pode se duplicar dentro do mesmo registro, e mudar de pendente para concluída/inativa nunca mais colide.
2. Limpeza dos dados existentes: onde já há duplicatas no mesmo registro, manter uma única linha — a que tem estado final (concluída ou inativa) — repontando notas, nº de card e a data de fechamento, e remover a linha redundante. Nada é apagado de outros dias.
3. No aplicativo (`src/hooks/useDevDailyActivities.ts`): passar a usar o caminho que já existe no banco para "criar ou reaproveitar" a atividade, e tratar o caso de conflito também ao concluir/inativar, reaproveitando a linha existente em vez de exibir erro.
4. Em `src/pages/dailys/RegistroPage.tsx`: ao adicionar uma atividade no formulário, se já existir uma pendente com o mesmo texto naquele registro, reaproveitar a pendente em vez de criar outra.

## Validação

- Concluir uma pendência que hoje tem uma "gêmea" concluída no mesmo registro: salva sem erro e fica uma única atividade concluída.
- Criar em um dia novo uma atividade com nome idêntico a uma já concluída/inativada em dia anterior: permitido e aparece normalmente.
- Deixar uma atividade pendente: ela reaparece no dia seguinte como pendência arrastada, uma única vez.
- Painel do líder e histórico: cada atividade aparece uma vez, com o nº do card preservado.

## Detalhes técnicos

- Índice atual: `dev_daily_activities_entry_description_status_unique` em `(user_id, coalesce(squad_id,...), created_entry_id, texto normalizado, status)`.
- Novo índice: mesma expressão **sem** `status`, mantendo `WHERE created_entry_id IS NOT NULL`.
- `upsert_dev_daily_activity` precisa ter o `ON CONFLICT` atualizado para a nova chave.
- Migração faz, na ordem: consolidação das duplicatas → criação do novo índice → remoção do índice antigo → atualização da função.
