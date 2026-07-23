## O que está acontecendo (explicação simples)

O sistema tem **duas listas diferentes** de "quem faz parte da squad":

1. **Lista oficial da squad** (`squad_members` → `team_members`): usada pela aba **Histórico da Daily** e pelo Painel do GP para saber quem deveria aparecer no card do dia.
2. **Registros feitos pelos devs** (`dev_daily_entries`): usada pelo **Relatório Executivo**, que simplesmente lê todos os registros com aquele `squad_id`.

Quando uma pessoa registra a daily para uma squad em que **ela não está na lista oficial**, o Relatório mostra o registro (porque olha o dado bruto) mas o Histórico não mostra (porque monta a lista a partir dos membros oficiais).

## Isso acontece com mais gente?

Sim. Rodei uma consulta no banco e encontrei **13 devs** que registram dailies em squads onde não constam como membros:

- Squad Inovação: Thiago Soares, Eder Telhado, Philipp Neto, Rafael Fernandes, Ewerton Mello, dev2
- TOR+: Thiago Vieira, Luiz Barbosa, Aurelio Silva
- TOR: Lucas Samel, Thiago Vieira
- SmartFlow: **Rayane Pinheiro** (o caso relatado)
- Portais de Pagamento: José Lima

No caso da Rayane especificamente: na SmartFlow o `squad_members` tem "Rayane **Ribeiro**", que é outra pessoa. A Rayane **Pinheiro** existe como usuário e registra dailies para SmartFlow, mas nunca foi adicionada como membro da squad.

Correção definitiva (3 frentes)

### 1. Histórico passa a mostrar quem realmente registrou (fonte única de verdade)

No `src/pages/dailys/HistoricoPage.tsx`, a lista `allowedUserIds` e `squadMemberUserIds` são construídas só a partir de `squad_members`. Vou mudar para a **união**:

- membros oficiais da squad (comportamento atual, para mostrar cards cinza de quem faltou), **mais**
- todos os `user_id` que têm `dev_daily_entries` para as squads em escopo.

Assim o Histórico e o Relatório Executivo sempre batem, e ninguém "some" só porque não está na lista oficial.

### 2. Evitar o problema no futuro (registro)

Em `src/pages/dailys/RegistroPage.tsx`, o dropdown "Selecione a squad" hoje mostra squads a partir do contexto `DailySimContext`. Vou garantir que:

- a lista venha estritamente de `squad_members` do usuário logado (via email do profile → team_member → squad_members);
- se o dev não estiver em nenhuma squad, mostrar aviso "Você não está cadastrado em nenhuma squad — peça ao líder para incluir você" em vez de deixar registrar solto.

### 3. Corrigir o vínculo automaticamente ao criar usuário Desenvolvedor

Em `src/components/admin/UserFormModalSupabase.tsx` já existe o auto-vínculo em `squad_members` quando o cargo é Desenvolvedor. Vou reforçar:

- se **não existir** um `team_member` com o email do usuário, criar um antes de inserir em `squad_members` (hoje pode falhar silenciosamente porque `squad_members.team_member_id` exige uma linha em `team_members`).
- essa mesma rotina rodará também ao editar um usuário existente que ainda não tenha `team_member` associado.

## Backfill dos dados atuais

Migration única para consertar os 13 casos hoje:

- Para cada dev com `dev_daily_entries` em uma squad onde ele não está em `squad_members`, criar (se necessário) um `team_member` com o email do profile e depois inserir a linha em `squad_members` correspondente.
- Coordinator do novo `team_member` = líder atual da squad (ou primeiro registro em `squad_leaders`); se não houver, usar um admin como fallback.

## Como verificar depois

1. Abrir o Histórico do dia 21/07 da SmartFlow → Rayane Pinheiro deve aparecer com as atividades dela.
2. Abrir o Relatório Executivo do mesmo dia → contagens continuam iguais (nada mudou lá) e agora batem com o Histórico.
3. Repetir para pelo menos um dev de Squad Inovação e um de TOR+.
4. Tentar registrar daily como um usuário sem squad → deve ver a mensagem de aviso em vez de conseguir escolher uma squad "solta".

## Detalhes técnicos (para referência)

- Consulta de diagnóstico usada:

```sql
SELECT p.email, s.name, COUNT(*) FROM dev_daily_entries de
JOIN profiles p ON p.user_id = de.user_id
JOIN squads s ON s.id = de.squad_id
LEFT JOIN team_members tm ON lower(tm.email) = lower(p.email)
LEFT JOIN squad_members sm ON sm.squad_id = de.squad_id AND sm.team_member_id = tm.id
WHERE sm.id IS NULL
GROUP BY p.email, s.name;
```

- Arquivos alterados: `HistoricoPage.tsx`, `RegistroPage.tsx`, `UserFormModalSupabase.tsx`.
- Uma migration Supabase para o backfill + criação de `team_members` faltantes.