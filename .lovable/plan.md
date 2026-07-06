## Escopo
Ajustes visuais no `src/components/dailys/DailyReadOnlyView.tsx` (aba "Relatório Bruto" do histórico) para espelhar exatamente o layout do modal Iniciar Daily, em modo leitura.

## Mudanças

1. **Cabeçalho do dev — mesmos controles do Iniciar Daily, desabilitados**
   No lado direito do cabeçalho de cada colaborador, renderizar sempre os mesmos elementos que aparecem em `IniciarDailyModal`, refletindo o valor gravado:
   - `ToggleGroup` de status (Presente / Ausente / Não participou) com o valor selecionado (`data-state=on`) conforme `att.absent_from_work` / `att.did_not_participate`. Adicionar `disabled` nos `ToggleGroupItem` e `pointer-events-none` no grupo para bloquear interação, mantendo as cores originais (verde/vermelho/âmbar).
   - Botão de câmera (`Video` / `VideoOff`) apenas quando o dev está presente, colorido conforme `att.camera_on`, com `disabled` e `pointer-events-none`.
   - Botão de observação (`MessageSquarePlus`) sempre visível quando há registro de presença; colorido (primary) apenas quando existe nota. Ao clicar, abre um `Popover` read-only mostrando o texto da observação; se não houver observação, mantém-se cinza e `disabled`.
   - Quando não houver `att` (nenhum registro de presença), manter apenas o badge "Sem registro de presença" já existente.

2. **Bloco "Observações da reunião" — sempre visível**
   - Renderizar o bloco de observações mesmo quando não houver nenhum `meeting` do dia: exibir texto em itálico "Não houve registro de observações.".
   - Quando houver meetings, exibir um bloco por meeting com o texto; se `mt.observations` estiver vazio, exibir a mesma mensagem.

3. **Anexo/transcrição — sempre visível**
   - No cabeçalho do bloco de observações, sempre mostrar o botão "Transcrição".
   - Quando existir `mt.transcript_url`: estilo verde (`border-emerald-500/40 text-emerald-700 bg-emerald-500/10`), como link clicável (`<a href target=_blank>`), rótulo "Ver transcrição".
   - Quando não existir: estilo cinza (`text-muted-foreground bg-muted/40 border-border`), renderizado como `<span>` com `cursor-not-allowed opacity-70`, rótulo "Sem transcrição".
   - Quando não houver meeting nenhum, exibir o botão cinza "Sem transcrição" no bloco default.

## Notas técnicas
- Nenhuma nova dependência. Reutilizar `ToggleGroup`, `Popover`, `Button` já importados no projeto.
- Nenhuma alteração de banco/tipos.
- Não mexer em `IniciarDailyModal.tsx` nem em `HistoricoPage.tsx`; toda a mudança fica isolada em `DailyReadOnlyView.tsx`.
