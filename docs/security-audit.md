# Revisão de segurança do Supabase

**Projeto auditado:** `ieijssfqonoucqheedac` (Rabbitech-calculator-first-lego-league)  
**Data da verificação:** 2026-10-27  
**Método:** consultas somente de leitura sobre funções, ACLs, RLS, políticas e advisors.

## Resultado executivo

Não encontrei evidência, nesta amostra, de que usuários anônimos possam executar as funções administrativas consultadas ou ler diretamente as tabelas administrativas pela Data API. Isso não substitui uma auditoria completa, mas é importante distinguir alertas genéricos do advisor de uma falha efetiva de autorização.

### Funções SECURITY DEFINER

A lista de permissões de execução confirmou que somente duas funções SECURITY DEFINER consultadas permitem execução por `anon`:

- `public.get_public_leaderboard()`
- `public.get_rabbitech_public_settings()`

Os seus propósitos e retornos indicam que foram projetadas como APIs públicas. O ranking retorna posição, nome da equipe, média e quantidade de rodadas para equipes com pelo menos três rodadas; as configurações públicas incluem tema, avisos e sinalizadores. Manter essas funções públicas só é seguro enquanto elas continuarem retornando exclusivamente dados destinados ao público.

As demais funções SECURITY DEFINER consultadas não permitem execução por `anon`. Várias permitem execução por `authenticated`, mas as funções administrativas inspecionadas verificam `auth.uid()` e a associação administrativa; as funções de proprietário verificam o guardião de proprietário. O aviso do Supabase para as 22 funções autenticadas merece acompanhamento, mas não é, por si só, prova de exploração.

### RLS e privilégios das tabelas

- `public.teams` e `public.rounds`: RLS habilitado e políticas de propriedade presentes.
- `public.rabbitech_private_secrets`: RLS habilitado e política que nega acesso do cliente.
- `public.app_admins`, `public.rabbitech_admin_audit_log`, `public.rabbitech_site_settings`, `rabbitech_private.site_settings_history` e `rabbitech_private.sql_console_audit`: RLS habilitado, sem políticas. As concessões consultadas não mostram acesso de tabela para `anon` ou `authenticated`; o acesso direto é restrito aos papéis de servidor. Não adicionar políticas genéricas a essas tabelas, pois isso poderia expor dados administrativos.

O schema `rabbitech_private` não concede privilégio `USAGE` a `anon` nem a `authenticated` na verificação executada.

## Problema real identificado: desempenho das políticas RLS

O advisor de desempenho aponta quatro políticas com chamada a `auth.uid()` reavaliada por linha:

- `teams_select_own`
- `rounds_select_own`
- `rounds_insert_own`
- `rounds_update_own`

A proposta em [proposed-rls-policy-performance-fix.sql](proposed-rls-policy-performance-fix.sql) substitui as expressões por `(select auth.uid())`, preservando o predicado de propriedade, os comandos e os papéis da política. A proposta não foi aplicada ao banco.

## Reconciliação das migrações: bloqueio antes de novas alterações SQL

O projeto remoto lista 25 migrações aplicadas, enquanto a árvore atual do GitHub contém apenas 12 arquivos em `supabase/migrations/` e parte dos identificadores não corresponde aos registros remotos. Algumas migrações aplicadas não possuem script rastreável na árvore atual; não foi possível recuperá-las através dos caminhos consultados no histórico do GitHub.

**Não executar `supabase db push` até reconciliar o histórico local/remoto.** O procedimento recomendado é recuperar ou reconstruir scripts ausentes, comparar cada um com o estado real do banco, documentar a proveniência e só então criar/aplicar uma migração nova. Não é seguro resolver essa divergência com resets ou migrações inventadas.

## Resultado funcional observado

A consulta de verificação encontrou 147 equipes e 288 rodadas. Nenhuma equipe tinha três rodadas no mesmo retrato consultado; portanto, o RPC público do ranking retornou zero equipes. Isso parece explicar o estado vazio segundo a regra atual de elegibilidade de três rodadas, e não prova que o RPC esteja quebrado.

## Próximos passos seguros

1. Recuperar e reconciliar o histórico de migrações.
2. Testar as funções públicas com os campos que devem ser expostos e testar cada função administrativa como anônimo, usuário comum, administrador e proprietário.
3. Aplicar a otimização das políticas RLS por migração revisada em ambiente isolado.
4. Executar novamente os advisors e consultas de verificação.
5. Só depois agendar mudanças de produção.

## Limitações e alterações feitas

Esta revisão é uma amostra direcionada, não uma auditoria integral. As consultas executadas foram somente de leitura. Nenhuma credencial foi lida ou exibida; nenhuma tabela, função, política, permissão, migração ou dado foi alterado.
