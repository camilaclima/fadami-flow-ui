

## Tela de Login

### Resumo
Criar uma tela de login simulada que autentica contra os usuários do `adminStore`. Login por e-mail + senha (temporária para `firstAccess`). Rotas protegidas redirecionam para `/login` se não autenticado.

### Implementação

**1. Estado de autenticação no `adminStore`**
- Adicionar `isAuthenticated: boolean` e ações `login(email, password)` / `logout()`
- Login valida e-mail na lista de usuários, verifica se está ativo, e checa `tempPassword` para primeiro acesso
- `login` seta `currentUserId` e `isAuthenticated = true`

**2. Tela de Login (`src/pages/LoginPage.tsx`)**
- Layout fullscreen centralizado com card de login
- Logo "FadamiFlow" no topo
- Campos: E-mail e Senha
- Botão "Entrar"
- Mensagens de erro: credenciais inválidas, usuário inativo
- Ao logar com sucesso, redireciona para `/`
- Visual alinhado com o design system (cores primary, card, border)

**3. Proteção de rotas (`src/components/layout/ProtectedRoute.tsx`)**
- Wrapper que verifica `isAuthenticated` do store
- Se não autenticado, redireciona para `/login`

**4. Atualizar `App.tsx`**
- Rota `/login` fora do `AppLayout`
- Rotas internas dentro do `ProtectedRoute`

**5. Logout**
- Adicionar botão de logout no avatar do header (AppLayout)
- Chama `logout()` e redireciona para `/login`

### Fluxo
```text
/login → email + senha → valida no adminStore → sucesso → / (Dashboard)
                                               → falha → mensagem de erro
Qualquer rota protegida sem auth → redireciona para /login
```

