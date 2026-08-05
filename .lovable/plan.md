# Restaurar as duas datas de referência em “Minha Daily”

## Objetivo

Voltar o formulário de registro ao comportamento anterior: permitir que o desenvolvedor registre a daily do último dia útil e liberar o registro do dia atual somente a partir das 17h.

Esta mudança ficará restrita à tela **Minha Daily**. Não será alterada a data usada para iniciar ou encerrar a reunião no Painel do Líder, nem serão modificados registros já salvos.

## Como ficará para o usuário

Ao clicar em **Registrar daily**, o campo **Data de referência** exibirá duas opções, nesta ordem:

1. **Hoje — dia da semana, dd/mm**
   - Antes das 17h: aparece na lista, mas fica desabilitada.
   - A partir das 17h: fica habilitada e pode ser selecionada.
   - Ao selecioná-la, os títulos serão **“O que fiz hoje”** e **“O que farei amanhã”**.

2. **Ontem — dia da semana, dd/mm**
   - Representa sempre o último dia útil anterior.
   - Em uma segunda-feira, por exemplo, apontará para a sexta-feira anterior.
   - Fica disponível independentemente do horário, desde que a daily dessa data ainda possa ser registrada.
   - Ao selecioná-la, os títulos serão **“O que fiz ontem”** e **“O que farei hoje”**.

Antes das 17h, o formulário abrirá com **Ontem** selecionado. A partir das 17h, abrirá com **Hoje** selecionado. Se a opção preferencial já estiver registrada ou encerrada, o sistema escolherá a outra opção disponível.

## Implementação

### 1. Restaurar o cálculo das datas

- Alterar a geração das opções para sempre montar **Hoje** e **Ontem útil**.
- Calcular o último dia útil ignorando sábado e domingo.
- Usar a data e o horário locais do navegador, mantendo o formato atualmente usado pelo sistema.
- Atualizar a disponibilidade das opções quando a página ganhar foco, voltar a ficar visível ou atravessar o horário das 17h/virada do dia, sem forçar a seleção para Hoje.

### 2. Corrigir o seletor e a abertura do formulário

- Manter a opção Hoje visível, porém desabilitada antes das 17h.
- Escolher automaticamente a primeira data realmente disponível, considerando:
  - horário permitido;
  - registro já existente para a mesma squad e data;
  - daily já encerrada pelo líder para a mesma squad e data.
- Manter o botão **Registrar daily** habilitado enquanto Hoje ou Ontem útil puder ser registrado.
- Ajustar a mensagem do botão quando nenhuma das duas datas estiver disponível.

### 3. Preservar os textos e os dados corretos

- Usar a data selecionada para alternar os títulos do formulário entre Hoje/Amanhã e Ontem/Hoje.
- Preservar o isolamento por squad, a prevenção de registros duplicados, os impedimentos e as atividades carregadas para a data escolhida.
- Manter registros encerrados pelo líder em modo somente leitura.
- Não apagar, migrar ou regravar dados históricos.

## Validação

Serão conferidos os seguintes cenários:

- Antes das 17h: Hoje aparece desabilitado e Ontem útil abre selecionado.
- Às 17h ou depois: Hoje fica habilitado e abre selecionado; Ontem útil continua disponível.
- Segunda-feira: Ontem aponta para sexta-feira.
- Troca da data no seletor: os títulos e as atividades exibidas mudam para o contexto correto.
- Desenvolvedor em mais de uma squad: registros e bloqueios continuam separados por squad.
- Uma data já registrada ou encerrada não impede o uso da outra data disponível.
- Salvamento em cada opção grava exatamente a data selecionada, sem criar duplicidade.
- A atualização automática por foco, passagem das 17h ou virada do dia não troca a escolha do usuário enquanto o modal estiver sendo preenchido.

## Detalhes técnicos

- Arquivo principal: `src/pages/dailys/RegistroPage.tsx`.
- Substituir a implementação atual de `allowedDates()`, que hoje retorna somente a data atual.
- Remover o efeito que sempre redefine a seleção para Hoje e substituí-lo por uma atualização que preserve uma seleção ainda válida.
- Incluir o estado de habilitação de cada opção no seletor e no cálculo de disponibilidade do botão.
- Não há necessidade de alteração no banco de dados, nas permissões ou no Painel do Líder.