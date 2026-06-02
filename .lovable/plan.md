## Problema
As páginas `DailyStatusPage` e `TeamProjectConfigPage` possuem cabeçalhos próprios (título + subtítulo + ícone). Quando embedadas nas abas de `ControleGestaoPage`, esses cabeçalhos competem com o título geral "Controle e Gestão", criando a sensação de "tela dentro da tela".

## Solução
Adicionar um prop opcional `embedded` às duas páginas filhas. Quando `embedded={true}`, o cabeçalho próprio é suprimido, deixando apenas o conteúdo funcional. A aba de `ControleGestaoPage` passa esse prop.

## Mudanças Técnicas

1. **`src/pages/TeamProjectConfigPage.tsx`**
   - Aceitar prop opcional `embedded?: boolean`.
   - Quando `embedded === true`, não renderizar o bloco `<h1>` + `<p>` de cabeçalho.
   - Manter o conteúdo das sub-abas (Projetos / Time) intacto.

2. **`src/pages/DailyStatusPage.tsx`**
   - Aceitar prop opcional `embedded?: boolean`.
   - Quando `embedded === true`, não renderizar o cabeçalho com ícone, título, subtítulo e botão "Adicionar Squad".
   - O botão de ação pode ser movido para dentro do conteúdo ou omitido se já houver outro mecanismo na aba pai.

3. **`src/pages/ControleGestaoPage.tsx`**
   - Passar `embedded` para ambas as páginas:
     - `<DailyStatusPage embedded />`
     - `<TeamProjectConfigPage embedded />`
   - Os cabeçalhos das abas placeholder (`Dashboard`, `Tarefas`, `Projetos`) já estão limpos, nenhuma alteração necessária.

## Resultado Esperado
- A única área de título visível em todas as abas será o cabeçalho geral "Controle e Gestão" + subtítulo.
- O conteúdo das abas começa imediatamente com sua estrutura interna, eliminando a sensação de nesting.
- As páginas continuam funcionando normalmente se acessadas diretamente via rotas antigas (o prop default é `false`).

## Riscos / Nenhum
- Não envolve banco de dados, apenas props de componente.
- Zero impacto em dados ou estado existente.