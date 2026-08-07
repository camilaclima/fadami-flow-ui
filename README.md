# FadamiFlow

Crie um SaaS chamado FadamiFlow para gestão de backlog de produto, com foco em design moderno, experiência fluida e alta usabilidade.

🎨 Design & Experiência

 Interface extremamente moderna e premium

 Suporte a:

 🌙 Modo escuro (default)

 ☀️ Modo claro

 Toggle visível no topo

 Estilo inspirado em:

 Linear, Notion, Jira moderno

 Visual:

 Cards com sombra suave + bordas arredondadas (2xl)

 Microinterações (hover, scale leve, fade-in)

 Ícones minimalistas e consistentes

 Tipografia moderna (Inter ou similar)

 Layout com bastante respiro (spacing generoso)

📚 Estrutura Geral

Menu lateral (sidebar)

Retrátil automaticamente

 Aparece ao passar o mouse

 Submenus também retráteis

 Ícones sempre visíveis (mesmo retraído)

 Animação suave (slide + fade)

Itens:

 Dashboard

 Backlogs

 Produtos

 Clientes

 Configurações

🧠 Funcionalidade Principal: Gestão de Backlogs

➕ Botão: "Novo Backlog"

 Destaque visual (floating ou topo direito)

 Ao clicar → abrir modal centralizado

Campos do modal:

 Título (texto)

 Descrição (texto longo)

 Anexo (upload)

 Produto (select - obrigatório)

 Cliente (select - opcional)

 Termômetro:

 🔵 Baixo

 🟡 Médio

 🔴 Alto

Botão:

 "Criar Backlog"

📊 Página Principal (Backlogs)

Estrutura visual:

 Layout estilo board horizontal (kanban moderno)

Fases:

 Backlog

 Priorização

 Aprovação

 Refinamento

 Disponível

 Planejado

 Finalizados

🧩 Cards de Backlog

Cada fase deve ter cards clicáveis contendo:

 Título

 Descrição resumida (truncate)

 Termômetro (apenas nas fases: backlog e priorização)

 Prioridade (apenas após priorização)

 Fase atual

 Usuário que criou

 Data de criação

 Produto

 Estimativa (apenas a partir de refinamento)

UX:

 Hover com elevação

 Clique abre detalhes

 Transições suaves entre fases

🔍 Modal de Detalhe do Backlog

Ao clicar no card → abrir modal centralizado completo

Conteúdo:

📌 Informações gerais

 Tudo que foi preenchido na criação

 Usuário criador

 Data de criação

🕒 Timeline de Fases

 Visual estilo timeline vertical ou horizontal

 Mostrar:

 ✅ Fases concluídas

 🔵 Fase atual (highlight)

 ⚪ Fases futuras

⚙️ Comportamento por Fase

🧠 PRIORIZAÇÃO

Campos:

 Valor de negócio (1 a 5)

 Custo de oportunidade (1 a 5)

 Estimativa (horas)

Regra automática:

 Calcular prioridade com base nesses dados

Sugestão de lógica:

 Alta: valor alto + custo alto + baixa estimativa

 Média: intermediário

 Baixa: valor baixo ou custo baixo

Exibir:

 Badge de prioridade (Alta / Média / Baixa)

Botão:

 "Salvar e Priorizar"

✅ APROVAÇÃO

Campos:

 Observação (texto)

Botão:

 "Salvar e Aprovar"

🔧 REFINAMENTO

Campos obrigatórios:

 Refinamento funcional

 Refinamento técnico

 Critérios de aceite

 Definição de pronto (DoD)

 Estimativa (horas)

Botão:

 "Salvar e Refinar"

⏳ DISPONÍVEL

 Placeholder para feature futura

📅 PLANEJADO

 Placeholder para feature futura

🏁 FINALIZADO

 Placeholder para feature futura

🔁 Regras importantes

 Conforme o backlog avança:

 O card deve acumular e exibir informações de todas as fases anteriores

 Dentro do modal:

 Permitir expandir/recolher cada fase (accordion moderno)

 Se o backlog estiver em uma fase:

 Ao abrir, já focar automaticamente naquela fase

 Exemplo:

 Se está em priorização → abrir seção de priorização ativa

✨ Diferenciais UX (IMPORTANTE)

 Badges coloridas para:

 Termômetro

 Prioridade

 Fase

 Skeleton loading

 Empty states ilustrados

 Drag & drop entre fases (opcional, mas desejável)

 Feedback visual ao salvar (toast/snackbar)

 Animações suaves em tudo

💾 Considerações Técnicas

 Estrutura preparada para escalabilidade (SaaS)

 Componentização forte

 Estado bem organizado (ex: Zustand ou similar)

 Dados mockados inicialmente

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://fadami-flow-ui.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/06750360-2a24-482c-897b-6478accf20e2).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
