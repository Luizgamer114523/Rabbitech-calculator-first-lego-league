# Revisão inicial de segurança do Supabase

**Projeto auditado:** `ieijssfqonoucqheedac` (Rabbitech-calculator-first-lego-league)  
**Tipo de revisão:** leitura somente; nenhuma permissão, política ou função foi alterada.  
**Data:** 2026-10-27

## Observações confirmadas

### Funções com privilégios elevados

As funções abaixo usam `SECURITY DEFINER`. Isso não significa, por si só, que estejam vulneráveis; é necessário revisar o corpo, as permissões de execução e o contexto de chamada.

- `public.get_public_leaderboard()`: retorna nome da equipe, média, quantidade de rodadas e posição. A consulta inclui somente equipes com pelo menos três rodadas.
- `public.get_rabbitech_public_settings()`: retorna configurações destinadas à interface pública, incluindo avisos, tema, cor de destaque e sinalizadores de funcionalidades. Revisar cuidadosamente cada campo para garantir que nenhum valor privado seja adicionado no futuro.
- `public.claim_team_name(text)`: exige usuário autenticado, normaliza o nome e verifica vínculos existentes antes de reivindicar uma equipe.
- `public.get_rabbitech_admin_overview()`: verifica se o usuário autenticado existe em `public.app_admins` antes de retornar estatísticas e dados administrativos.
- `public.admin_add_rabbitech_admin_by_email(text)`: verifica que o usuário autenticado corresponde ao UUID fixo do proprietário antes de adicionar um administrador.

### Pontos de atenção

1. Algumas funções administrativas usam UUID fixo para identificar o proprietário, enquanto outras verificam associação em `app_admins`. Documentar a política de autorização pretendida e revisar todas as funções administrativas com o mesmo critério.
2. Verificar privilégios `EXECUTE` para `PUBLIC`, `anon` e `authenticated` por função. O alerta do advisor não prova exploração, mas privilégios amplos devem ser justificados.
3. Confirmar as tabelas sem políticas RLS. A ausência de políticas pode ser intencional se o acesso for exclusivamente por RPC autorizada; não adicionar políticas genéricas sem avaliar os caminhos de acesso.
4. Confirmar que as funções públicas retornam apenas dados destinados ao público.
5. Avaliar os alertas de desempenho das políticas RLS que reavaliam funções de autenticação por linha; otimizar em migração separada após testes.

## Ordem recomendada para correções

1. Exportar e revisar definições completas de funções, grants e políticas atuais.
2. Escrever testes para usuário anônimo, usuário autenticado comum, administrador e proprietário.
3. Preparar migração SQL versionada para mudanças mínimas de privilégios, caso a auditoria confirme permissões excessivas.
4. Testar em ambiente de desenvolvimento ou preview.
5. Aplicar em produção apenas após validar que login, ranking público, vínculo de equipes e painel administrativo continuam funcionando.

## Limitações

Esta é uma revisão inicial por amostragem de funções críticas, não uma auditoria completa de segurança. Nenhuma credencial foi lida ou exibida; nenhuma consulta modificou dados. Não foram alteradas funções, permissões, tabelas, políticas RLS ou migrações.
