# Rabbitech BIOGLOW FLLC

Plataforma de apoio à equipe e à temporada FIRST LEGO League (FLL), com ferramentas de pontuação, análise de rounds, ranking público e painel administrativo.

> **Estado do projeto:** aplicação web estática com integrações de backend. O `index.html` continua sendo a entrada principal usada pela publicação atual. Não mova nem renomeie esse arquivo sem validar a configuração da Vercel.

## Navegação rápida

- [Arquitetura](docs/architecture.md)
- [Configuração e desenvolvimento](docs/setup.md)
- [Publicação](docs/deployment.md)
- [Supabase e banco de dados](docs/database.md)
- [Backups e manutenção](docs/maintenance.md)
- [Notas de reparos anteriores](docs/REPAIR-NOTES.md)

## Estrutura atual

```text
/
├── index.html                 # Aplicação principal atual
├── index.backup-*.html        # Backup legado na raiz; não é a entrada do site
├── api/
│   └── youtube-search.js      # Endpoint serverless da Vercel
├── assets/
│   ├── css/
│   │   └── mobile-dock.css
│   ├── js/
│   │   └── mobile-dock.js
│   └── rabbitech-release.json # Metadados da versão publicada
├── backup/                    # Backups históricos legados
├── backups/                   # Backups históricos e cópias de segurança
├── docs/                      # Documentação do projeto
└── supabase/
    ├── functions/             # Edge Functions
    └── migrations/            # Histórico versionado de alterações SQL
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
- Toda migração SQL deve continuar em `supabase/migrations/` e ter nome cronológico descritivo.
- Prefira mudanças pequenas, com escopo claro, diff revisável e verificação antes/depois.
- Não considere uma publicação concluída até conferir o estado do deploy e abrir o site publicado.

## Segurança

O navegador só pode receber valores que sejam seguros para exposição pública. Segredos de servidor, como chaves de serviço do Supabase e chaves privadas de APIs, devem ficar em variáveis de ambiente do provedor ou em armazenamento seguro no backend.

Se um segredo for publicado por engano, removê-lo do arquivo não é suficiente: revogue/rotacione a credencial e revise o histórico.
