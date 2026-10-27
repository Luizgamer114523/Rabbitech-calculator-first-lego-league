# Inventário de backups do Rabbitech

**Data da auditoria:** 2026-10-26  
**Escopo:** leitura da árvore da branch `main`; nenhum backup foi alterado ou removido.

## Resultado

- Arquivos versionados na árvore examinada: 41.
- Arquivos cujo caminho contém `backup`: 21.
- Tamanho combinado aproximado dos backups: 47,52 MiB.
- Existem diretórios `backup/` e `backups/`, além de um backup na raiz.
- `backup/index-before-remaster-2026-10-25.html` e `backups/index-before-remaster-2026-10-25.html` têm o mesmo SHA de blob e são cópias idênticas no Git. O Git reutiliza o mesmo objeto, embora o caminho apareça duas vezes.

## Lista identificada

| Caminho | Tamanho aproximado (MiB) | SHA do blob |
|---|---:|---|
| `backup/index-before-remaster-2026-10-25.html` | 2.21 | `24d59608257c14e45bfd089d11ea14b9eae26c31` |
| `backups/index-backup-before-new-features-2026-10-26.html` | 2.26 | `12d82d95d95115e0d67cbeee80fb5e71fa5609a4` |
| `backups/index-before-admin-fix-2026-10-26.html` | 2.25 | `f193ca4f1ddb0329878747f4c358d109c36c90b9` |
| `backups/index-before-remaster-2026-10-25.html` | 2.21 | `24d59608257c14e45bfd089d11ea14b9eae26c31` |
| `backups/index-before-sql-console-click-fix-2026-10-26.html` | 2.26 | `a562a59f01db36838b0b1666b565328adfb87e7c` |
| `backups/index.backup-2026-10-26-before-audit-grouping.html` | 2.26 | `68b14e58745952084f66947f0a1fe2f31a5c0da9` |
| `backups/index.backup-2026-10-26-before-diagnostics-and-owner-tools.html` | 2.27 | `54c853ce8553a0113c1640dcf6876b9beeb2fc18` |
| `backups/index.backup-2026-10-26-before-global-admin-fix.html` | 2.25 | `5e6cc832fc9bf54a18dfd135a8a79ba37015e38d` |
| `backups/index.backup-2026-10-26-before-health-restore-maintenance.html` | 2.27 | `b953d53e30c744a083bf0c4d9da8c255ade54074` |
| `backups/index.backup-2026-10-26-before-new-features.html` | 2.26 | `ce9e448997847fe8e1bd5f7ac5431b43d86013f8` |
| `backups/index.backup-2026-10-26-before-next-improvements.html` | 2.27 | `d3a4563052f612ac0fd2993025192f229dcf07b7` |
| `backups/index.backup-2026-10-26-before-owner-sql-console.html` | 2.25 | `10a9a9b9cee0642ed4cd8c4e1838f92f7f7b507c` |
| `backups/index.backup-2026-10-26-before-sql-console-legacy-demo-fix.html` | 2.26 | `5abe4fe70972da26ae6e7a5528ed14f1af3c4d50` |
| `backups/index.backup-2026-10-26-before-sql-console-newline-fix.html` | 2.26 | `846435aad2ca9d8580ed3e781abe2d503524f460` |
| `backups/index.backup-2026-10-26-before-sql-console-target-restrictions.html` | 2.26 | `a55f1a3aff0edef016bc5f070010d848be2e9f53` |
| `backups/index.backup-2026-10-27-before-owner-operations-event-fix.html` | 2.30 | `564ccca8055f76bcf9dac8acc9b4b84de7e41d81` |
| `backups/index.backup-2026-10-27-before-owner-operations-fix-latest.html` | 2.29 | `79f74996ae13900b4297a9ca4aec9ceba98375a0` |
| `backups/index.backup-2026-10-27-before-owner-operations-fix.html` | 2.29 | `75fcdfd20bf41ab30f6bf6a3b3bda6aac8e99ec4` |
| `backups/index.backup-before-restore-verification-2026-10-27.html` | 2.30 | `ddee1116306cd01349ba727d858a729358117e17` |
| `backups/index.backup-before-training-analysis-2026-10-27.html` | 2.31 | `b6ec22629ac7bfdaa8d643c6c6a89b3f5000813b` |
| `index.backup-2026-10-25.html` | 2.24 | `3dfa7104662359a170553b3c394845c42cceb044` |

## Próximos passos seguros

1. Comparar os arquivos por conteúdo e comportamento, não apenas por nome ou tamanho.
2. Confirmar quais backups ainda são necessários para restauração e quais são duplicatas exatas.
3. Manter ao menos um backup verificado fora do fluxo de deploy antes de qualquer remoção.
4. Se for necessário arquivar backups antigos, discutir uma política de retenção e validar que o deploy da Vercel não publica os arquivos de backup.
5. Só depois de validar tudo, propor a limpeza em uma branch separada e revisão por pull request.

## Limites desta auditoria

Este inventário é baseado nos metadados da árvore Git. Não afirma que todos os arquivos são funcionalmente equivalentes. Nenhum arquivo foi excluído, renomeado, movido ou restaurado.
