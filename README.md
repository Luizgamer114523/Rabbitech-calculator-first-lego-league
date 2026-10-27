# Rabbitech BIOGLOW FLLC

Plataforma de apoio à equipe e à temporada FIRST LEGO League (FLL), com ferramentas de pontuação, análise de rodadas, ranking público e painel administrativo.

> **Estado do projeto:** aplicação web estática com integrações de backend. O `index.html` continua sendo a entrada principal usada pela publicação atual. Não mova nem renomeie esse arquivo sem validar a configuração da Vercel.

## Navegação rápida

- [Arquitetura](docs/architecture.md)
- [Configuração e desenvolvimento](docs/setup.md)
- [Publicação](docs/deployment.md)
- [Supabase e banco de dados](docs/database.md)
- [Backups e manutenção](docs/maintenance.md)
- [Inventário dos backups atuais](docs/backup-inventory.md)
- [Auditoria operacional GitHub/Vercel/Supabase](docs/operational-audit-2026-10-27.md)
- [Guia de proteção da branch main](docs/github-branch-protection.md)
- [Revisão inicial de segurança do Supabase](docs/security-audit.md)
- [Proposta de otimização das políticas RLS](docs/proposed-rls-policy-performance-fix.sql)
- [Rascunho para o perfil GitHub](docs/profile-refresh.md)
- [Notas de reparos anteriores](docs/REPAIR-NOTES.md)

## Estrutura atual

```text
/
├── index.html                 # Aplicação principal atual
├── index.backup-*.html        # Backups legados na raiz
├── api/
│   └── youtube-search.js      # Endpoint serverless da Vercel
├── assets/
│   ├── css/
│   │   └── mobile-dock.css
│   ├── js/
│   │   └── mobile-dock.js
│   └── rabbitech-release.json # Metadados da versão
├── backup/                    # Backup histórico legado
├── backups/                   # Backups históricos
├── docs/                      # Documentação e relatórios de auditoria
└── supabase/
    ├── functions/             # Edge Functions
    └── migrations/            # Scripts SQL versionados já registrados no repositório
```

A estrutura acima descreve o repositório atual. A migração para módulos menores deve acontecer em etapas, com testes e revisão de cada dependência.

## Tecnologias e serviços

- HTML, CSS e JavaScript no frontend.
- Vercel para publicação e endpoint serverless.
- Supabase para autenticação, banco de dados e Edge Functions.
- GitHub para versionamento e revisão das mudanças.

## Começar

1. Leia [docs/setup.md](docs/setup.md).
2. Abra `index.html` em um ambiente local ou use um servidor estático local.
3. Para testar recursos conectados, configure as variáveis e os serviços necessários conforme a documentação, sem colocar segredos no frontend.
4. Antes de publicar, siga [docs/deployment.md](docs/deployment.md).

## Regras importantes para contribuições

- Não faça novas funcionalidades enquanto uma tarefa estiver focada em organização ou manutenção.
- Não renomeie nem mova `index.html` sem confirmar a configuração de build/output da Vercel.
- Não apague backups históricos durante a organização inicial.
- Não inclua chaves privadas, tokens, arquivos `.env` ou credenciais em commits.
- Toda migração SQL executável deve ser criada e testada em fluxo próprio; não use o arquivo em `docs/proposed-rls-policy-performance-fix.sql` como migração oficial.
- Prefira mudanças pequenas, com escopo claro, diff revisável e verificação antes/depois.
- Não considere uma publicação concluída até conferir o estado do deploy e abrir o site publicado.

## Segurança

O navegador só pode receber valores que sejam seguros para exposição pública. Segredos de servidor, como chaves de serviço do Supabase e chaves privadas de APIs, devem ficar em variáveis de ambiente do provedor ou em armazenamento seguro no backend.

Se um segredo for publicado por engano, removê-lo do arquivo não é suficiente: revogue/rotacione a credencial e revise o histórico.

## Estado da manutenção

O repositório está sendo organizado em branches de revisão. Relatórios de auditoria registram o estado observado e diferenciam correções preparadas de alterações realmente aplicadas. A branch `main` e a produção não devem ser consideradas sincronizadas sem conferir o SHA do commit e o deployment correspondente.
