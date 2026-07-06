## Objetivo

Três melhorias no fluxo de daily do desenvolvedor e do líder:

1. Trocar a listagem "em linhas" das demandas por "caixinhas" (mesmo estilo do modal de registrar daily) em todas as visualizações — modo dev e modo líder (Status de Preenchimento, Iniciar Daily e Histórico).
2. Permitir observação por demanda também na visão do dev (com botão igual ao do líder). Refletir na visão do líder um botão indicando que há texto escrito pelo dev.
3. Adicionar campo "Observações Gerais" do dev, abaixo dos impedimentos, refletindo em todas as visões do líder (com fallback "Nenhuma observação geral registrada.").

---

## Backend

Migration adicionando 2 colunas + grants já existentes preservados:

- `dev_daily_activities.dev_notes text` — observação do dev por demanda (feita/planejada).
- `dev_daily_entries.general_notes text` — observações gerais do dev naquele registro.

Nenhuma nova tabela, nenhuma mudança em RLS.

---

## Frontend

### Componente reutilizável novo

`src/components/dailys/DevEntryActivitiesView.tsx` — recebe `activities`, `mode: "editable" | "readonly"` e um callback opcional `onUpdateNote`. Renderiza cada demanda como card (borda, padding, ícone de status, descrição, badge de status/dias, botão de observação via `Popover`). Reutilizado em:

- `RegistroPage` (dev, editable — hoje/planejado)
- `IniciarDailyModal` (líder abre detalhe do dev, readonly com botão de observação apenas para leitura)
- `DailyReadOnlyView` (histórico, readonly)
- `DevHistoryModal` (histórico do dev, readonly)
- `PainelGPPage` dialog "Detalhes do preenchimento"

### 1. Cards no lugar de linhas

Substituir os blocos atuais de listagem plana das demandas nas cinco superfícies acima pelo `DevEntryActivitiesView`. Layout idêntico ao cartão de demanda hoje presente no `IniciarDailyModal` ao registrar (borda arredondada, header com status + botões, descrição em bloco).

### 2. Observação por demanda

- Coluna nova `dev_notes` em `dev_daily_activities`.
- `useDevDailyActivityMutations` ganha `updateNote({ id, dev_notes })`.
- `RegistroPage` (dev, ao iniciar/editar): botão `MessageSquarePlus` em cada card abre `Popover` com `Textarea`; ícone fica verde quando há conteúdo (mesmo padrão do líder).
- Visão líder (`IniciarDailyModal` detalhe do dev, `DailyReadOnlyView`, `DevHistoryModal`, `PainelGPPage`): mesmo botão, somente leitura. Verde quando existe `dev_notes`, cinza quando vazio. Ao clicar, `Popover` exibe o texto (não editável).

### 3. Observações gerais do dev

- Coluna nova `general_notes` em `dev_daily_entries`.
- `useUpsertDevDailyEntry` passa a aceitar `general_notes`.
- `RegistroPage`: `Textarea` "Observações gerais" abaixo do bloco de impedimentos, com autosave/salvamento junto do entry.
- Todas as visualizações do líder passam a mostrar um bloco "Observações gerais do dev" com o conteúdo, ou o texto italico "Nenhuma observação geral registrada." quando vazio/nulo.

### Correção de acessibilidade (mantém padrão já aplicado)

Nos novos `Popover`/`Textarea` de observação, aplicar `onKeyDown` que impede propagação da barra de espaço (bug já corrigido antes em outra tela) — evita que o card colapse/expanda quando o dev digita espaço.

---

## Arquivos afetados

- `supabase/migrations/<timestamp>_dev_notes_and_general_notes.sql` (novo)
- `src/hooks/useDevDailyActivities.ts` (mutation `updateNote`)
- `src/hooks/useDevDailyEntries.ts` (campo `general_notes` no upsert e tipo)
- `src/components/dailys/DevEntryActivitiesView.tsx` (novo)
- `src/pages/dailys/RegistroPage.tsx` (usar novo componente + campo geral + botão obs por demanda)
- `src/components/dailys/IniciarDailyModal.tsx` (usar componente readonly nas seções que hoje listam as demandas do dev + exibir obs geral)
- `src/components/dailys/DailyReadOnlyView.tsx` (idem)
- `src/components/dailys/DevHistoryModal.tsx` (idem)
- `src/pages/dailys/PainelGPPage.tsx` (dialog de detalhe do preenchimento: idem)

Sem alterações em RLS, sem novas dependências.