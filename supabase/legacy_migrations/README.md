# Scripts SQL legados preservados

Esta pasta contém cópias exatas dos arquivos SQL presentes em `supabase/migrations/` na branch `main` antes da reconciliação em 2026-10-27.

Os scripts originais foram preservados para comparação e recuperação, mas movidos para fora de `supabase/migrations/` para que o Supabase CLI não os trate como migrações ativas. **Não execute estes arquivos automaticamente.**

O diretório ativo `supabase/migrations/` foi reconstruído a partir da coluna `statements[1]` da tabela remota `supabase_migrations.schema_migrations`, junto de seus valores de `version` e `name`. Isso recupera os scripts efetivamente registrados pelo banco. Ainda é necessário comparar a pasta resultante em ambiente isolado antes de qualquer `supabase db push`.

Cópias preservadas de `main`:
- `supabase/migrations/202610240001_owner_youtube_api_setup.sql` → `supabase/legacy_migrations/from-main/202610240001_owner_youtube_api_setup.sql`
- `supabase/migrations/20261026193444_allow_admin_peer_removal_owner_protected.sql` → `supabase/legacy_migrations/from-main/20261026193444_allow_admin_peer_removal_owner_protected.sql`
- `supabase/migrations/20261026193512_allow_admin_peer_list.sql` → `supabase/legacy_migrations/from-main/20261026193512_allow_admin_peer_list.sql`
- `supabase/migrations/20261026195000_owner_sql_console.sql` → `supabase/legacy_migrations/from-main/20261026195000_owner_sql_console.sql`
- `supabase/migrations/20261026200113_harden_owner_sql_console.sql` → `supabase/legacy_migrations/from-main/20261026200113_harden_owner_sql_console.sql`
- `supabase/migrations/20261026203000_restrict_owner_sql_console_targets.sql` → `supabase/legacy_migrations/from-main/20261026203000_restrict_owner_sql_console_targets.sql`
- `supabase/migrations/20261026212500_harden_owner_sql_console.sql` → `supabase/legacy_migrations/from-main/20261026212500_harden_owner_sql_console.sql`
- `supabase/migrations/20261026213200_fix_sql_console_safe_diagnostic_query.sql` → `supabase/legacy_migrations/from-main/20261026213200_fix_sql_console_safe_diagnostic_query.sql`
- `supabase/migrations/20261027004000_add_site_operations_and_settings_restore.sql` → `supabase/legacy_migrations/from-main/20261027004000_add_site_operations_and_settings_restore.sql`
- `supabase/migrations/20261027004100_fix_scheduled_notice_effective_fields.sql` → `supabase/legacy_migrations/from-main/20261027004100_fix_scheduled_notice_effective_fields.sql`
- `supabase/migrations/20261027004200_revoke_direct_execution_for_trigger_functions.sql` → `supabase/legacy_migrations/from-main/20261027004200_revoke_direct_execution_for_trigger_functions.sql`
- `supabase/migrations/20261027004300_include_recent_errors_in_health_monitor.sql` → `supabase/legacy_migrations/from-main/20261027004300_include_recent_errors_in_health_monitor.sql`

O arquivo `202610240001_owner_youtube_api_setup.sql` não tem entrada correspondente no registro remoto consultado, por isso permanece somente no arquivo legado.
