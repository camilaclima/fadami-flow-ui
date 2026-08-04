# Corrigir registro e início das dailys de hoje

## O que está acontecendo

Os dois lados do fluxo estão travados na data de **ontem**, não na de hoje:

1. **Tela do dev (Minha Daily)** — a lista de datas permitidas só inclui "Hoje" quando o relógio passa das **17:00**. Antes disso a única opção é "Ontem útil". Como agora são 11h, nenhum dev consegue registrar a daily de hoje.
2. **Painel do líder** — a data do painel é fixada por código no último dia útil anterior, sem seletor. Um intervalo a cada 60s reescreve qualquer valor. Então "Iniciar Daily" cria/consulta o encontro com a data de ontem, e a daily de hoje nunca aparece nem pode ser iniciada.

Como isso está no código atual (e não nos dados), reverter versões não resolveu.

## Correção proposta

**Tela do dev**
- Voltar a oferecer "Hoje" como primeira opção em qualquer horário de dia útil, mantendo "Ontem útil" como segunda opção.
- Padrão de seleção: hoje (quando dia útil); em fim de semana, o último dia útil.

**Painel do líder**
- Padrão do painel volta a ser **hoje** (em fim de semana, último dia útil).
- Remover a fixação forçada no dia anterior (o intervalo que sobrescreve a data), mantendo apenas a atualização na virada do dia.
- Adicionar um seletor de data simples no cabeçalho (Hoje / Ontem útil) para o líder consultar o dia anterior quando quiser, sem ficar preso a ele.

**Validação**
- Conferir que o botão "Iniciar Daily" fica habilitado para hoje e que o bloqueio pós-encerramento continua valendo por squad + data.
- Conferir que um registro salvo pelo dev hoje aparece imediatamente no painel do líder e no histórico.

## Detalhes técnicos

- `src/pages/dailys/RegistroPage.tsx`: função `allowedDates()` — remover a condição `now.getHours() >= 17` que suprime a opção "Hoje".
- `src/pages/dailys/PainelGPPage.tsx`: substituir `previousBusinessDayISO()` por um `currentBusinessDayISO()` no estado inicial, ajustar o `useEffect` de 60s para só corrigir na virada de dia, e expor `setDate` num seletor no cabeçalho.
- Nenhuma alteração de banco de dados ou de RLS é necessária; os registros já gravados permanecem intactos.