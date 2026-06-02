## Objetivo

Na aba **Configurações → Projetos** (dentro de Controle e Gestão), listar apenas os projetos vinculados ao usuário logado através do cadastro de usuários (vínculo `profile_products`), removendo a criação de projetos por esta tela.

## Mudanças

### 1. Filtro de projetos por vínculo do usuário
- Em `src/pages/TeamProjectConfigPage.tsx`, dentro de `ProjectsSection`, substituir o filtro atual (por `created_by`) por um filtro baseado nos produtos vinculados ao perfil do usuário logado.
- Usar o hook já existente `useAuthorizedProducts` (`src/hooks/useAuthorizedProducts.ts`), que:
  - retorna `productIds` carregados de `profile_products` (com fallback para `profiles.product_id`);
  - retorna `null` quando o usuário é admin (permissão `users`) — nesse caso mostrar todos os projetos.
- Resultado: o usuário vê exatamente os projetos atribuídos a ele no cadastro de usuários. Admins continuam vendo todos.

### 2. Remover criação de projetos
- Remover o botão **"+ Novo Projeto"** da barra de abas em `TeamProjectConfigPage`.
- Remover o `Dialog` de criação/edição de projeto dentro de `ProjectsSection` (estado `openProjectModal`, `editing`, `name`, `description`, handlers `handleSubmitProject`, `handleEditProject`, `resetProject`, `closeProjectModal`, props `openForm`/`setOpenForm`).
- Remover também o botão de editar (lápis) nos cards de projeto, já que a criação/edição deve ocorrer apenas no cadastro de Projetos (`/products`).

### 3. Preservar o que já funciona
- O clique no card do projeto continua abrindo o modal de detalhes (`ProjectDetailsModal`) com:
  - lista e cadastro de **stakeholders** (modal próprio);
  - alocação/desalocação de **colaboradores do time** ao projeto.
- Nenhuma mudança no fluxo de stakeholders, colaboradores ou no restante do app.

### 4. Limpeza relacionada
- Reverter a alteração feita anteriormente em `useAddProduct` que setava `created_by` (não é mais necessária para esta tela). A coluna `created_by` na tabela `products` permanece no banco, sem uso por enquanto — sem migração.

## Detalhes técnicos

- Hook usado: `useAuthorizedProducts()` → `{ productIds, isAdmin }`.
- Filtro:
  ```ts
  const products = useMemo(() => {
    if (isAdmin || productIds === null) return allProducts;
    const set = new Set(productIds);
    return allProducts.filter(p => set.has(p.id));
  }, [allProducts, productIds, isAdmin]);
  ```
- Empty state: manter mensagem amigável quando o usuário não tem projetos vinculados (ex.: "Nenhum projeto vinculado ao seu usuário.").
