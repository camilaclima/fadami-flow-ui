# Plano de correções e melhorias na Daily

## 1) Corrigir alteração de senha do usuário (erro 401)

**Causa:** a Edge Function `admin-change-password` está sem `verify_jwt = false` em `supabase/config.toml`. Com o novo sistema de chaves de assinatura da plataforma, isso faz o gateway rejeitar a requisição com 401 antes mesmo do código rodar. A função já valida o JWT internamente via `auth.getUser()` e cheque de permissão `users`, então é seguro desligar o verify_jwt do gateway.

**Ação:**
- Adicionar bloco `[functions.admin-change-password]` com `verify_jwt = false` em `supabase/config.toml`.
- Manter a validação de sessão e de permissão que já existe dentro da função.

## 2) Cronômetro do registro da daily (Dev)

Registrar quanto tempo o dev levou para preencher a daily.

**Banco (`dev_daily_entries`):**
- Novas colunas: `fill_started_at TIMESTAMPTZ`, `fill_completed_at TIMESTAMPTZ`, `fill_duration_seconds INT`.

**Frontend (`RegistroPage.tsx`):**
- Ao abrir o modal de registro (Criar ou Editar sem `fill_completed_at`), marcar `fill_started_at = now()` em memória.
- Exibir badge de cronômetro em tempo real no header do modal ("Tempo: mm:ss").
- No submit, calcular a duração e persistir `fill_started_at`, `fill_completed_at`, `fill_duration_seconds`. Em edições posteriores, preservar a duração original (não sobrescrever).
- No card de resumo em "Minha Daily", ao lado do "Registrada", mostrar `⏱ 4m 12s` quando `fill_duration_seconds` existir.

**Painel do Líder:**
- `HistoricoPage.tsx`, `PainelGPPage.tsx` (aba Status de Preenchimento), e `IniciarDailyModal.tsx`: ao lado do nome do usuário, exibir chip discreto `⏱ 4m 12s` quando houver duração registrada na entrada do dia.

## 3) Cronômetro da daily do líder

Registrar quanto tempo o líder levou desde "Iniciar Daily" até "Salvar Daily".

**Banco (`daily_meetings`):**
- Novas colunas: `started_at TIMESTAMPTZ`, `finished_at TIMESTAMPTZ`, `duration_seconds INT`.

**Frontend (`IniciarDailyModal.tsx`):**
- Ao abrir o modal, marcar `startedAt = new Date()` em estado.
- Exibir cronômetro no header (mm:ss) atualizando a cada 1s.
- No `submit`, enviar `started_at`, `finished_at = now()`, `duration_seconds` para o `useCreateDailyMeeting`.
- Exibir a duração final no histórico da daily (aba Histórico do líder) ao lado da data.

## 4) "Não participou da daily" — persistir registro do usuário e manter caixa de motivo visível

Hoje, ao marcar "não participou", o motivo só aparece se o card estiver expandido. E o registro feito pelo dev fica visualmente descartado.

**Ação (`IniciarDailyModal.tsx`):**
- Manter as informações da entrada do dev renderizadas mesmo em `no_participate` (somente leitura, com aviso "Não participou — resposta preservada").
- Renderizar o campo "Motivo da não participação" na **linha compacta do cabeçalho** do card (fora do bloco expansível), logo abaixo do toggle de status, para estar sempre acessível independentemente do estado retraído/expandido.
- Auto-focar o textarea quando o status muda para `no_participate`.

## 5) UX de ausência (tipo + período) e motivo próximos ao botão

Hoje o líder muda o status no cabeçalho, mas os campos aparecem só na área expandida — obrigando expandir para completar.

**Ação (`IniciarDailyModal.tsx`):**
- Ao selecionar "Ausente do trabalho" via dropdown, abrir um **Popover ancorado no próprio botão** com:
  - Select do tipo de ausência (Atestado, Férias, Banco de horas, Interjornada, Day Off).
  - Se o tipo exigir período (`atestado`, `ferias`, `banco_horas`): dois inputs de data (início / fim) já no mesmo popover.
  - Botão "Confirmar" que fecha o popover e mantém os valores no state do membro.
- Um chip resumo aparece no cabeçalho (`Atestado · 20/07 → 25/07`) com botão "editar" que reabre o mesmo popover.
- Mesma abordagem para "Não participou": popover com textarea de motivo ancorado no toggle, além do campo persistente sugerido no item 4 (o popover é atalho, o campo permanece visível).
- Validações existentes (tipo obrigatório, período obrigatório para ranged) continuam iguais e destacam o card ao falhar.

## Detalhes técnicos

**Arquivos a alterar:**
- `supabase/config.toml` — adicionar `[functions.admin-change-password] verify_jwt = false`.
- Migração SQL — colunas de tempo em `dev_daily_entries` e `daily_meetings`.
- `src/integrations/supabase/types.ts` — regenerado após migração.
- `src/hooks/useDevDailyEntries.ts` — persistir campos de tempo no upsert.
- `src/hooks/useDailyMeetings.ts` — persistir `started_at/finished_at/duration_seconds` no create.
- `src/pages/dailys/RegistroPage.tsx` — cronômetro do dev, exibição no card resumo.
- `src/components/dailys/IniciarDailyModal.tsx` — cronômetro do líder, motivo sempre visível, popovers de ausência/motivo.
- `src/pages/dailys/HistoricoPage.tsx` e `src/pages/dailys/PainelGPPage.tsx` — mostrar duração ao lado do nome do dev.

**Formatação de tempo:** util compartilhado `formatDuration(seconds)` → `4m 12s` / `1h 02m`.

**Compatibilidade:** todos os novos campos são opcionais; registros antigos simplesmente não exibem o chip de tempo.
