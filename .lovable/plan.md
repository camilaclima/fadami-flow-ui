## Escopo

Ajustes no modal "Iniciar Daily" (`src/components/dailys/IniciarDailyModal.tsx`) — visão do líder/coordenador. Todo o trabalho é frontend; nenhuma mudança de banco.

## Correções

1. **Espaço no campo de observação retrai/expande o card**
  - Causa: o cabeçalho do card tem `role="button"` + `onKeyDown` que trata `Enter`/`Space` como toggle. O Popover da observação é portalizado, mas eventos React continuam borbulhando até o pai. Ao digitar espaço, o handler do cabeçalho dispara.
  - Correção: parar a propagação de teclado dentro do `PopoverContent` da observação (`onKeyDown={(e) => e.stopPropagation()}` no wrapper do conteúdo).

## Melhorias

2. **Remover microfone**
  - Remover o botão de toggle `Mic/MicOff` de cada colaborador.
  - Remover o badge de contagem "silent" do cabeçalho e o campo `silent` de `stats`.
  - Manter `stayed_silent: false` fixo no payload salvo (mantém compatibilidade do schema).
3. **Botão "Ver histórico do dev"**
  - No detalhe expandido do colaborador, adicionar um botão discreto (ícone `History`) ao lado do bloco Ontem/Hoje.
  - Ao clicar, abre um novo modal `DevHistoryModal` que lista todos os registros de daily daquele desenvolvedor:
    - Fonte: `useDevDailyEntriesByUser(entry.user_id)` (já existente).
    - Cada item mostra data, "Ontem/Hoje/Impedimentos" e as atividades vinculadas via `useDevDailyActivitiesByUser` filtradas por `created_entry_id`/`closed_entry_id`. Deve aparecer retraído (como em historico de dailys e expandir quando clicar para ver o que estava escrito) Retraido aparece data e quantidade de impedimentos.Arquivo novo: `src/components/dailys/DevHistoryModal.tsx`.
4. **Alerta de atenção (3+ dias sem conclusão)**
  - Para cada atividade pendente (não `concluida`, não `inativa`), calcular dias desde `created_at`.
  - Se `>= 2` dias completos (no 3º dia), exibir `AlertTriangle` laranja ao lado da atividade com tooltip "Atenção: pendente há N dias".
5. **Visual das atividades de "Ontem" (com status)**
  - Buscar atividades do dev com `useDevDailyActivitiesByUser` e cruzar com `entry.id` (o mesmo padrão já usado no HistoricoPage).
  - Renderizar como lista de linhas com ícone+cor:
    - `concluida`: `CheckCircle2` verde, texto normal.
    - `inativa`: `Ban` (bola cortada) cinza, texto com `line-through`, sufixo " — inativada".
    - `pendente`: `Clock` laranja, texto normal + eventual triângulo de atenção (item 4).
  - Fallback para o texto livre `did_yesterday` quando não houver atividades estruturadas.
6. **Visual das atividades de "Hoje"**
  - Renderizar como lista de linhas com `Clock` laranja + texto.
  - Fallback para `will_do_today` quando não houver atividades planejadas.
7. **Impedimentos sanados no detalhe**
  - Além dos impedimentos em aberto (`openImps`), listar também os `resolved` do dev (a partir de `m.imps`). Somente o que foi resolvido referente aquele registro
  - Novo bloco "Sanados" com `CheckCircle2` verde, texto do impedimento, badge de urgência e data em `resolved_at` (formato `dd/MM HH:mm`).

## Notas técnicas

- Reutilizar hooks existentes: `useDevDailyActivitiesByUser`, `useDevDailyEntriesByUser`, `useDevDailyImpedimentsByEntries`.
- Nenhuma migração SQL; nenhuma alteração de tipos.
- Sem novas dependências.