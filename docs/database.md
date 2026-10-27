# Supabase e banco de dados

## Organização

- `supabase/migrations/`: histórico SQL versionado e revisável.
- `supabase/functions/`: código de Edge Functions.
- `api/`: funções serverless hospedadas na Vercel, separadas das Edge Functions do Supabase.

## Regras para migrações

1. Use nome cronológico e descritivo.
2. Prefira mudanças pequenas e reversíveis.
3. Revise permissões, RLS, privilégios de execução e `search_path` de funções `SECURITY DEFINER`.
4. Teste em ambiente não produtivo sempre que possível.
5. Compare as migrações versionadas com as migrações realmente aplicadas no projeto.
6. Não edite uma migração já aplicada para tentar reescrever o histórico; crie uma nova migração corretiva.

## Dados e credenciais

Nunca registre tokens, chaves de serviço, senhas ou conteúdo sensível em logs de diagnóstico. O frontend deve usar apenas credenciais apropriadas para cliente e depender de RLS/funções seguras para autorização.

Antes de qualquer alteração destrutiva, faça backup adequado e documente o plano de recuperação.
