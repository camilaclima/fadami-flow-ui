
## Por que acontece (em linguagem simples)

Quando um desenvolvedor registra a daily, o texto de "Ontem" e "Hoje" pode ser salvo de duas formas diferentes:

1. **Como atividades estruturadas** (cada tarefa vira uma linha no banco). Aí a tela mostra um cartão por tarefa naturalmente.
2. **Como texto livre** (um único parágrafo com várias linhas). Aí depende da tela saber "quebrar" esse parágrafo em cartões.

A tela do **líder da squad** já foi ajustada anteriormente para quebrar o texto livre em vários cartões. Por isso, quando você entra como líder, vê tudo bonitinho.

Já a tela usada pelo **Admin** (o modal "Painel da Daily" que abre ao clicar num colaborador no bloco *Status de preenchimento*) é um componente **diferente**, e essa quebra em cartões nunca foi aplicada nele. Por isso o mesmo registro do Eder aparece "colado" para o admin e correto para o líder — não é um problema de dados, é a mesma informação sendo exibida por dois componentes diferentes, e só um deles foi corrigido.

Além do modal do admin no Painel da Daily, existem outros lugares no sistema com o mesmo problema (mesmo componente antigo de exibição de texto):

- Modal "Histórico do dev" (botão *Histórico* nos painéis).
- Aba **Histórico** da Daily (visão detalhada do registro).
- Modal **Iniciar Daily** do líder (quando abre o registro de cada membro).
- Preview do relatório executivo (quando abre um registro para conferência).

Todos eles precisam ganhar o mesmo comportamento: se o dev escreveu texto livre com várias linhas, transformar cada linha num cartão de atividade, exatamente igual às demais telas.

## O que vai ser feito

1. Extrair a função `splitFreeText` (que já existe hoje em `DailyReadOnlyView.tsx`) para um utilitário compartilhado, para que todas as telas usem a mesma regra de quebra (por quebras de linha, removendo bullets tipo `- `, `* `, `○ `, `1.`, etc.).

2. Criar um pequeno componente auxiliar `FreeTextActivityList` que recebe o texto livre e o tipo (`done` para "Ontem" / `pending` para "Hoje") e renderiza cada linha como um `DevActivityCard`. Ele já é usado internamente por `DailyReadOnlyView`; vamos reutilizá-lo nos demais lugares.

3. Aplicar esse componente nos locais que hoje ainda mostram texto cru:
   - `src/pages/dailys/PainelGPPage.tsx` — modal de detalhe do dev (aquele das imagens 161–163).
   - `src/components/dailys/DevHistoryModal.tsx` — listagem histórica por dev.
   - `src/pages/dailys/HistoricoPage.tsx` — funções `ActivitiesSection` e `PlannedSection`.
   - `src/components/dailys/IniciarDailyModal.tsx` — visualização do registro de cada membro.
   - `src/pages/dailys/RelatorioExecutivoPage.tsx` — trechos de "Ontem/Hoje" nos cards de preview.

4. Manter a regra atual: se existirem atividades estruturadas, elas continuam sendo mostradas normalmente; a quebra em cartões só é usada como *fallback* para texto livre. Nenhuma tela perde funcionalidade.

5. Não mexer em banco de dados, permissões nem em regras de negócio. É uma correção puramente visual/de apresentação.

## Como você vai perceber o resultado

- Entrando como **Admin** e clicando num colaborador no *Status de preenchimento* do Painel da Daily, o modal do dev (ex.: Eder, Vanessa, Wesley) mostrará cada tarefa do "Ontem" e do "Hoje" em cartões separados com o mesmo ícone verde/laranja usado nas outras telas.
- Mesma padronização aparece no modal **Histórico do dev**, na aba **Histórico da Daily**, no **Iniciar Daily** do líder e no preview do **Relatório Executivo**.
- Ao logar como líder, tudo continua exatamente como já está hoje.

## Área técnica (para referência)

- Novo utilitário: `src/lib/dailyFreeText.ts` exportando `splitFreeText` + componente `FreeTextActivityList`.
- Refatoração leve em `DailyReadOnlyView.tsx` para consumir o utilitário (sem mudar visual).
- Substituição dos `<p className="whitespace-pre-wrap">{did_yesterday}</p>` / `{will_do_today}` nos arquivos listados por `<FreeTextActivityList text={...} kind="done|pending" />`.
- Sem migrações, sem alterações em RLS, sem alterações em edge functions.
