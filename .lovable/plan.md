# Corrigir o erro "duplicate key value violates unique constraint" ao salvar a daily

## O que está acontecendo (explicação simples)

O banco tem uma trava que impede que a **mesma pessoa** tenha **duas atividades com o mesmo texto e o mesmo estado** (pendente / concluída / inativa) dentro do **mesmo registro de daily**.

Essa trava é boa: evita atividades duplicadas. O problema é o momento em que ela dispara.

Exemplo real, igual ao do print:

1. Em 31/07 o dev registrou a atividade "Verificação do relatório SIR – Concebra" e ela já foi **concluída**.
2. Depois, a mesma atividade voltou a existir como **pendente** (ela foi digitada de novo, ou ficou como pendência arrastada).
3. Hoje, ao salvar a daily, o dev marca essa pendência como **"Concluí"**.
4. Nesse instante o sistema tenta transformar a pendente em concluída — mas já existe uma concluída idêntica naquele mesmo registro. A trava barra e aparece a mensagem técnica.

Confirmado no banco: existem hoje dezenas de casos de atividades com texto idêntico dentro do mesmo registro, umas pendentes e outras já concluídas ou inativas — exatamente o cenário que provoca o erro.

Detalhe importante: hoje o sistema **só sabe tratar** essa trava quando ela acontece ao **criar** uma atividade nova. Quando acontece ao **marcar como Concluí / Inativar**, o erro estoura na tela e o salvamento para no meio.

## Como vai ficar depois da correção

- Ao marcar "Concluí" ou "Inativar" e já existir uma atividade idêntica no mesmo estado, o sistema simplesmente **reaproveita/consolida** a existente em vez de mostrar erro.
- A daily salva normalmente, sem mensagem técnica.
- Nenhuma atividade duplicada nova é criada; o histórico e o painel do líder continuam mostrando uma única entrada por atividade.
- Se acontecer qualquer outro erro de verdade, a mensagem continua aparecendo (não vamos esconder problemas reais).

## Implementação

1. Em `src/hooks/useDevDailyActivities.ts`:
   - Tratar o código de erro `23505` também em `markCompleted`, `markInactive` e `revertPending` (hoje só `create` trata).
   - No tratamento: localizar a atividade "gêmea" já existente (mesmo usuário, mesma squad, mesmo `created_entry_id`, mesma descrição normalizada e o estado de destino) e, em vez de falhar:
     - atualizar a gêmea com o `closed_entry_id` / datas do fechamento, e
     - remover a linha duplicada que estava sendo movida, mantendo um único registro.
2. Também evitar a duplicidade na origem: antes de criar as atividades planejadas em `src/pages/dailys/RegistroPage.tsx`, desconsiderar textos repetidos entre os rascunhos (comparação sem diferença de maiúsculas/espaços).
3. Nada muda na estrutura do banco: a trava de unicidade permanece como está.

## Validação

- Marcar como "Concluí" uma pendência que já tem uma concluída idêntica no mesmo registro: salva sem erro e fica só uma atividade concluída.
- Mesmo teste com "Inativar".
- Salvar uma daily normal, sem repetições: comportamento inalterado.
- Reabrir o registro e o painel do líder: a atividade aparece uma única vez, com o número do card preservado.

## Detalhes técnicos

- Índice envolvido: `dev_daily_activities_entry_description_status_unique` em `(user_id, coalesce(squad_id, ...), created_entry_id, lower(regexp_replace(trim(description), '\s+', ' ', 'g')), status)`.
- Como `status` faz parte da chave, qualquer `UPDATE` de status pode colidir; por isso o tratamento precisa existir nos mutations de update, não só no insert.
