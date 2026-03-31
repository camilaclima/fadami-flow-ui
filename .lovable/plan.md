

## Módulo de Acesso, Permissões e Gestão de Produtos

### Resumo

Implementar RBAC completo com Zustand: gestão de produtos (com status), grupos de acesso com permissões por tela, cargos, e usuários com vínculo a produto/cargo/grupo. O sidebar filtra itens conforme permissões do usuário logado.

---

### Arquitetura

```text
src/
├── types/
│   └── admin.ts              # User, Role, AccessGroup, Permission types
├── store/
│   └── adminStore.ts          # Zustand store (users, groups, roles, products CRUD)
├── pages/
│   ├── ProductsPage.tsx       # Reescrever: CRUD completo com status
│   ├── AccessGroupsPage.tsx   # CRUD grupos + checkboxes de permissões
│   ├── RolesPage.tsx          # CRUD cargos
│   └── UsersPage.tsx          # CRUD usuários + inativar/clonar
├── components/admin/
│   ├── ProductFormModal.tsx
│   ├── AccessGroupFormModal.tsx
│   ├── RoleFormModal.tsx
│   └── UserFormModal.tsx
```

---

### Etapas de Implementação

**1. Tipos (types/admin.ts)**

- `Product` atualizado: `id, name, description, status ('active'|'inactive'), color`
- `Role`: `id, title`
- `AccessGroup`: `id, name, permissions: string[]` (array de chaves de tela: `'dashboard'`, `'backlogs'`, `'products'`, `'clients'`, `'users'`, `'roles'`, `'groups'`, `'settings'`)
- `AppUser`: `id, firstName, lastName, email, productId, roleId, groupId, active, firstAccess, tempPassword, createdAt`

**2. Store (store/adminStore.ts)**

Novo store separado com:
- Estado: `products[], roles[], accessGroups[], users[]`
- CRUD completo para cada entidade
- `currentUser` simulado (admin por padrão)
- Getter de permissões do usuário logado para filtrar sidebar
- Ação `cloneUser(id)` que retorna dados pré-preenchidos
- Ação `toggleUserActive(id)`
- Geração de senha temporária (string aleatória de 8 chars)

**3. Atualizar Product no backlogStore**

- Remover `MOCK_PRODUCTS` do `backlogStore` e passar a consumir do `adminStore`
- Manter retrocompatibilidade nos selects de backlog

**4. Tela de Produtos (reescrita)**

- Tabela com colunas: Nome, Descrição, Status (badge Ativo/Inativo)
- Botões: Novo, Editar, Inativar/Ativar
- Modal com formulário (nome, descrição, status)

**5. Tela de Cargos**

- Tabela simples: Título do Cargo
- CRUD via modal

**6. Tela de Grupos de Acesso**

- Tabela: Nome do Grupo, Qtd Permissões
- Modal com: campo nome + grid de checkboxes das telas do sistema
- Telas disponíveis definidas como constante

**7. Tela de Usuários**

- Tabela: Nome Completo, E-mail, Produto, Cargo, Grupo, Status
- Modal de criação/edição com dropdowns para Produto, Cargo, Grupo
- Botão Clonar: abre modal preenchido (sem nome/email)
- Botão Inativar: toggle de status
- Exibição de senha temporária ao criar

**8. Sidebar dinâmico**

- `AppSidebar` lê permissões do `currentUser` via `adminStore`
- Cada `NAV_ITEM` ganha uma chave `permission`
- Itens sem permissão são ocultados
- Novas rotas adicionadas: `/users`, `/roles`, `/groups`

**9. Rotas (App.tsx)**

Adicionar rotas: `/users`, `/roles`, `/groups`

---

### Detalhes Técnicos

- Todos os formulários usam estado local controlado (sem perda de foco)
- Modais seguem o padrão existente com Dialog do shadcn/ui
- Tabelas usam componente Table existente
- Badges de status: verde (Ativo), vermelho (Inativo)
- Senha temporária gerada com `Math.random().toString(36).slice(-8)`
- Dados mock pré-populados para demonstração

