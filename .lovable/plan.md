# Restaurar com segurança a regra de Hoje e Ontem em “Minha Daily”

## O que a análise confirmou

- O sistema deve separar **a data da atividade** da **data em que o formulário foi preenchido**. Exemplo: se o dev preencher em 05/08 escolhendo “Ontem”, o histórico deve mostrar a daily em **04/08**.
- Antes das 17h, “Hoje” precisa permanecer bloqueado. Se a daily de “Ontem” já tiver sido registrada, o botão ficar inativo até as 17h é o comportamento esperado pela regra original — não significa que um registro de hoje foi criado.
- O histórico do código confirma que a regra original possuía as duas opções: “Hoje”, liberada às 17h, e “Ontem”, apontando para o último dia útil.
- Também foi confirmado no banco um registro com data de referência 04/08 criado no dia 05/08. Isso é compatível com alguém preencher no dia 05 escolhendo “Ontem”; o horário de criação não deve mudar a data de referência para 05/08.

## Como ficará para o desenvolvedor

### Antes das 17h

- “Hoje — dia da semana, dd/mm” aparece, mas fica desabilitado.
- “Ontem — dia da semana, dd/mm” fica disponível, desde que ainda não tenha sido registrado e a daily não tenha sido encerrada pelo líder.
- Se “Ontem” já estiver registrado, o botão fica desabilitado até as 17h e mostrará uma mensagem clara explicando o motivo.

### A partir das 17h

- “Hoje” é liberado para preenchimento.
- “Ontem” continua disponível se ainda não tiver sido registrado nem encerrado.
- O sistema abre a primeira data realmente disponível, mas não troca a escolha enquanto o dev estiver preenchendo.

### Data salva e histórico

- Escolheu “Hoje”: salva na data de hoje e usa “O que fiz hoje” / “O que farei amanhã”.
- Escolheu “Ontem”: salva no último dia útil e usa “O que fiz ontem” / “O que farei hoje”.
- O histórico organiza pelo dia escolhido, não pelo horário em que o botão Salvar foi clicado.
- Nenhum registro será criado apenas por abrir ou fechar o formulário.

## Implementação

1. Centralizar a validação das opções “Hoje” e “Ontem” para que o botão, o seletor e o salvamento usem exatamente a mesma regra.
2. Garantir que a abertura do formulário apenas selecione uma opção disponível; ela não poderá criar, alterar ou antecipar um registro.
3. No salvamento, validar novamente a opção escolhida e gravar exatamente essa data, sem recalcular para “Hoje”.
4. Manter o isolamento por squad: uma daily registrada em uma squad não bloqueará a outra.
5. Melhorar a mensagem do botão inativo para diferenciar claramente:
   - “Hoje será liberado às 17h”; e
   - “As datas disponíveis já foram registradas ou encerradas”.
6. Preservar os registros existentes. Qualquer registro histórico suspeito será apenas identificado para conferência; não haverá exclusão automática.

## Validação

- Antes das 17h, sem registro de ontem: botão ativo e formulário abre em “Ontem”.
- Antes das 17h, com ontem já registrado: botão inativo e mensagem informa que “Hoje” abre às 17h.
- Depois das 17h: “Hoje” fica disponível mesmo que “Ontem” já esteja registrado.
- Em uma segunda-feira, “Ontem” aponta para sexta-feira.
- Salvar em “Ontem” no dia seguinte grava a data anterior e aparece nessa data no histórico.
- Abrir e fechar o formulário sem salvar não cria registro.
- Trocar de squad não mistura registros, atividades ou impedimentos.
- Registro já encerrado pelo líder continua somente para leitura e não pode ser duplicado.

## Detalhes técnicos

- Ajuste principal em `src/pages/dailys/RegistroPage.tsx`.
- Criar uma única função de disponibilidade por data, reutilizada por `handleOpenCreate`, pelo seletor e pelo estado `disabled` do botão.
- Manter `entry_date` vindo diretamente da opção selecionada e adicionar uma validação final antes do `upsert`.
- Não é necessária mudança estrutural no banco de dados.