## Diagnóstico confirmado

O conteúdo não está sendo perdido em todos os casos. Existem dois formatos de armazenamento: o resumo textual da daily (`did_yesterday`/`will_do_today`) e as atividades estruturadas.

A causa principal confirmada está no salvamento da **Minha Daily**:

- Uma atividade antiga que o desenvolvedor mantém como **pendente** é aceita como trabalho de “Hoje”.
- Porém, essa atividade é incluída somente no resumo de “Ontem” e é omitida de `will_do_today`.
- Ela também continua vinculada à entrada original, portanto não aparece entre as atividades criadas na entrada atual.
- Como a lista estruturada de “Hoje” e o texto `will_do_today` ficam vazios, o painel do líder mostra `—`.

Na base atual, há registros recentes com texto preenchido, mas sem atividade diretamente vinculada à entrada; vários casos de 27/07 possuem atividades pendentes descritas em “Ontem” e “Hoje” vazio. Portanto, é possível recuperar boa parte do que foi informado.

## Correção

1. **Corrigir o salvamento da Minha Daily**
   - Incluir no snapshot de “Hoje” as atividades anteriores que o desenvolvedor marcou para continuar pendentes.
   - Manter essas mesmas atividades em “Ontem” como pendentes, respeitando a regra atual, mas também registrar que foram escolhidas como trabalho do dia.
   - Garantir que a validação e o conteúdo salvo usem exatamente a mesma lista, evitando permitir o envio de uma daily cujo “Hoje” termina vazio.

2. **Fortalecer a leitura no Painel da Daily**
   - Centralizar a montagem de “Ontem” e “Hoje” para que o modal do líder, detalhes, histórico e relatório usem a mesma regra.
   - Preservar o fallback para os snapshots textuais quando os vínculos estruturados estiverem ausentes.
   - Buscar as atividades do desenvolvedor pela entrada e pelo usuário, sem perder conteúdo por inconsistências históricas de vínculo, mantendo a separação por squad e data.

3. **Recuperar os registros históricos afetados**
   - Identificar entradas com `will_do_today` vazio e tarefas explicitamente marcadas como pendentes no snapshot de “Ontem”.
   - Preencher “Hoje” somente com essas tarefas recuperáveis, sem inventar conteúdo nem misturar dias ou squads.
   - Não alterar registros cujo conteúdo não possa ser determinado com segurança.

4. **Validar a correção**
   - Conferir casos reais afetados no banco antes e depois da recuperação.
   - Testar desenvolvedor com uma e múltiplas squads.
   - Comparar Minha Daily, Painel do Líder, Histórico e Relatório Executivo para a mesma pessoa, squad e data.
   - Confirmar que novas dailies não exibem `—` quando o desenvolvedor selecionou uma atividade para continuar no dia.