## O que vamos ajustar

### 1) Mostrar há quanto tempo cada impedimento está (ou ficou) aberto

Onde o impedimento aparece hoje sem essa informação:
- Modal "Iniciar Daily" do líder (`IniciarDailyModal.tsx`) — blocos "Impedimentos abertos" e "Impedimentos sanados" dentro do card do dev.
- Visão consolidada da daily (`DailyReadOnlyView.tsx`) — mesmos blocos.
- Histórico individual do dev (`DevHistoryModal.tsx`) — mesmos blocos.

Vamos adicionar, ao lado do badge de urgência (Alta/Média/Baixa):
- **Se está aberto:** "Aberto há 3d" (ou "há 4h", "há 12d") — calculado como agora − `created_at`.
- **Se está sanado:** "Ficou aberto por 5d" — calculado como `resolved_at` − `created_at`. Também mantemos o "Sanado dd/MM HH:mm" que já existe.

Formato humano ("2h", "3d", "1d 4h") — vamos criar um helper pequeno em `src/lib/formatDuration.ts` (`formatOpenFor(from, to)`) reutilizando o padrão do `formatDuration` que já existe.

### 2) Contador de impedimentos por dia na aba Histórico

**Problema:** hoje o card de cada dia mostra `totalImps` = soma dos impedimentos **criados naquele entry_date**. Se ninguém abriu impedimento novo no dia 20, mas o time tem 11 em aberto herdados de dias anteriores, o card mostra "0 impedimento". Já dentro do modal do dia, os impedimentos abertos herdados aparecem corretamente (via `impsByEntry` que olha `<= D` e ainda em aberto).

**Correção:** trocar o cálculo do card pelo mesmo critério do modal — para cada dia D, contar impedimentos:
- criados por qualquer usuário da squad em escopo com `created_at::date <= D`, e
- ainda em aberto em D (`resolved = false` OU `resolved_at::date >= D`).

Como já buscamos entries dos usuários filtrados via `useDevDailyEntries`, faremos um único fetch em `HistoricoPage` de todos os impedimentos ligados a esses entries e calcularemos o contador por dia com essa regra. O badge passa a mostrar o número real de impedimentos "vivos" no fim daquele dia.

Nota: se o filtro de squad estiver ativo, contamos apenas impedimentos originados em entries daquela squad (`entry.squad_id === filterSquadId` ou `null` para legado, alinhado ao resto da tela).

### 3) Mesma correção no histórico individual do dev (DevHistoryModal)

Hoje cada linha do histórico do dev mostra "N aberto(s)" contando só impedimentos criados naquele entry. Vamos trocar por: número de impedimentos do dev que estavam abertos até o fim daquele `entry_date` (mesma regra do item 2, escopada a `user_id`). Assim, no exemplo do dia 20/07, aparecem os impedimentos herdados que ainda estão abertos, não só os criados naquele dia.

O badge "sanado" também passa a contar impedimentos do dev **sanados naquele dia** (não só os criados+sanados naquele entry), coerente com a leitura de linha do tempo.

### 4) Aumentar o Popover de ausência

No `IniciarDailyModal.tsx`, o `PopoverContent` da linha 572 é `w-72` e corta o texto dos botões "Banco de horas" e "Interjornada" e os inputs de data. Vamos:
- Aumentar para `w-96` (ou `min-w-[22rem]`) e permitir que os botões de tipo não trunquem — remover `truncate` dos labels de tipo e deixar em duas colunas com `whitespace-nowrap`.
- Garantir que os inputs de Início/Fim caibam lado a lado sem overflow.

## Onde vamos mexer

- `src/lib/formatDuration.ts` — novo helper `formatOpenFor(fromISO, toISO?)` que devolve "3d", "4h", "1d 5h".
- `src/components/dailys/IniciarDailyModal.tsx` — badges de duração nos impedimentos + Popover de ausência maior.
- `src/components/dailys/DailyReadOnlyView.tsx` — badges de duração nos impedimentos.
- `src/components/dailys/DevHistoryModal.tsx` — badges de duração + corrigir contador de "aberto/sanado" por dia usando regra de linha do tempo.
- `src/pages/dailys/HistoricoPage.tsx` — corrigir `impCountByEntry` (na verdade contador por dia) para refletir impedimentos vivos no fim daquele dia, respeitando o filtro de squad.

## Fora de escopo

- Mudanças no fluxo de criação/resolução de impedimento.
- Mudanças no schema do banco.