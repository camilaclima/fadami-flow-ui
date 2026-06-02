
## Objetivo

Criar uma nova tela unificada **Controle e Gestão** dentro de um novo grupo de menu **Gestão de Projetos**, organizando funcionalidades existentes em abas.

## Mudanças

### 1. Novo grupo de menu na sidebar
Em `src/components/layout/AppSidebar.tsx`, adicionar um novo `NavGroup` chamado **"Gestão de Projetos"** (ícone tipo `Briefcase` ou `KanbanSquare`) com um único item:
- **Controle e Gestão** → `/controle-gestao`

### 2. Nova página `ControleGestaoPage`
Criar `src/pages/ControleGestaoPage.tsx` usando o componente `Tabs` (shadcn) com 5 abas nesta ordem:

| Ordem | Aba | Conteúdo |
|-------|-----|----------|
| 1 | Dashboard Geral | Placeholder vazio ("Em breve") |
| 2 | Registro de Dailys | Conteúdo da `DailyStatusPage` |
| 3 | Painel de Tarefas | Placeholder vazio ("Em breve") |
| 4 | Projetos | Placeholder vazio ("Em breve") |
| 5 | Configurações | Conteúdo da `TeamProjectConfigPage` |

A aba padrão será **Dashboard Geral**.

### 3. Refatoração para reaproveitar conteúdo
Para evitar duplicação, extrair o conteúdo (JSX) atual de:
- `DailyStatusPage` → componente `DailyStatusContent`
- `TeamProjectConfigPage` → componente `TeamProjectConfigContent`

As páginas originais continuam existindo apenas envolvendo esses componentes (mantém as rotas `/daily-status` e `/team-project-config` funcionando, sem quebrar navegações internas como `/daily-status/squad/:squadId`).

Dentro das abas da nova tela, importamos diretamente esses componentes de conteúdo.

### 4. Rota
Adicionar em `src/App.tsx`:
```tsx
<Route path="/controle-gestao" element={<ControleGestaoPage />} />
```

Permissão: usar `"__always__"` por enquanto (mesmo padrão da entrada atual "Configuração Time/Projeto"), até definirmos permissão dedicada.

### 5. O que NÃO muda agora
- As páginas `DailyStatusPage` e `TeamProjectConfigPage` continuam acessíveis pelas rotas existentes.
- As entradas atuais da sidebar ("Saúde do Projeto" e "Configuração Time/Projeto") **permanecem** por enquanto — posso removê-las se você quiser que a única porta de entrada seja a nova tela; me confirme.

## Detalhes técnicos

- Componente `Tabs` do shadcn já está disponível (`src/components/ui/tabs.tsx`).
- Placeholders das abas vazias: card centralizado com texto "Em desenvolvimento" para manter consistência visual com o restante do app (tokens semânticos, neu-card, rounded-2xl).
- Estado da aba ativa via `defaultValue="dashboard"` (sem persistência por enquanto).

## Pergunta antes de implementar

Devo **remover** da sidebar os itens antigos "Saúde do Projeto" e "Configuração Time/Projeto", já que agora estarão acessíveis pelas abas da nova tela? Ou manter ambos os acessos?
