## O que muda no Relatório Executivo

### 1. Filtro por período (data início + data fim)
No topo da aba, o campo único de data vira **dois campos**: "De" e "Até" (padrão: hoje/hoje).
- Todas as consultas passam a olhar o intervalo (entries, reuniões, impedimentos, ausências).
- Regras que hoje comparam "dia atual x dia anterior" continuam funcionando dia a dia dentro do intervalo (para cada data do range, olha o dia útil anterior).
- Cada item do relatório mostra a data de origem no texto (ex.: "22/07 — Fulano · Squad X …") para que o intervalo faça sentido na leitura.

### 2. Botão "Terminar Relatório" e histórico de relatórios salvos
Novo botão principal ao lado de "Gerar PDF" e "Copiar Texto".
- Ao clicar, grava um snapshot fiel do que está na tela naquele momento: período, seções, itens (com o texto editado e o flag incluído/excluído) e o texto final consolidado.
- Aparece um toast de confirmação e o relatório é adicionado à lista.
- Nova sub-aba/painel **"Relatórios salvos"** dentro da própria página do Relatório Executivo, mostrando cards com: período, data de emissão, autor, prévia do texto e ações **Ver**, **Copiar texto**, **Gerar PDF** e **Excluir**.
- Ver reabre o snapshot em modo leitura (mesmo layout do PDF), sem recomputar as regras — é histórico congelado.

### 3. Marcações do Admin no Histórico da Daily
Na aba **Histórico**, ao abrir o dia de uma squad, cada card de dev ganha, logo depois do botão "Observação", um botão de múltipla escolha (mesma UX do seletor que já existe no modal de histórico do dev) com estas opções:
- Bom exemplo por squad
- Preenchimentos incorretos ou vagos
- Aguardando tarefas
- Tarefas repetidas

Regras:
- Só aparece para Admin.
- Marcar/desmarcar salva na hora, ligado ao `entry_id` do dev.
- No Relatório Executivo, cada seção **desduplica** por `entry_id`: se a regra automática já pegou o registro, a marcação manual do Admin não gera um segundo item — apenas adiciona um rótulo "marcado pelo Admin" no mesmo item. Se só a marcação manual existir, o item é criado normalmente.

---

## Detalhes técnicos

### Banco
Nova tabela `daily_executive_reports`:
- `period_start date`, `period_end date`
- `title text`
- `content_text text` (texto final consolidado)
- `sections jsonb` (snapshot: id, título, itens `{id,text,included}`)
- `created_by uuid`, `created_at`, `updated_at`
- RLS: SELECT/INSERT/DELETE apenas para Admin (`has_role('diretor')`), com GRANT para `authenticated` e `service_role`.

A tabela `daily_entry_tags` e o seletor já existem — reaproveita para o Histórico (não precisa de migration nova para as marcações).

### Front
- `RelatorioExecutivoPage.tsx`: troca `date` por `dateFrom`/`dateTo`; queries passam a usar `.gte/.lte`; adiciona botão "Terminar Relatório" que faz `INSERT` e invalida a lista; adiciona sub-aba interna (Tabs) "Atual" vs "Salvos".
- Novo `SavedReportsList.tsx` + hook `useExecutiveReports.ts` (list/create/delete/getById).
- Novo `SavedReportViewer.tsx` (modal que renderiza o snapshot e reaproveita `handlePrint`/`handleCopy` a partir das `sections` salvas).
- `DailyReadOnlyView.tsx`: no card do dev, quando `isAdmin`, renderiza `<DailyEntryTagsSelector entryId={e.id} compact />` ao lado do botão "Observação".
- Regra de desduplicação no `RelatorioExecutivoPage`: hoje já há `entry.id` como base dos ids automáticos (`pi-`, `aw-`, etc.); a lógica manual passa a **enriquecer** o item existente em vez de criar um `manual-*` paralelo. Só cria item novo quando não houver equivalente automático.

### Não muda
- Nenhuma regra automática nova; apenas passam a operar por dia dentro do range.
- Nenhum modelo de IA envolvido.
- Design tokens/estilos existentes (cards arredondados, tema escuro/claro, laranja Fadami).
