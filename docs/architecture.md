# Arquitetura atual

## Visão geral

O Rabbitech é atualmente uma aplicação web com entrada principal em `index.html`. A aplicação utiliza arquivos auxiliares versionados e serviços externos. O objetivo inicial é documentar e estabilizar a estrutura existente, não trocar a arquitetura de uma vez.

## Componentes

| Caminho | Responsabilidade |
| --- | --- |
| `index.html` | Entrada principal e boa parte da interface/lógica atual. |
| `assets/css/mobile-dock.css` | Estilos do dock móvel e ajustes de navegação relacionados. |
| `assets/js/mobile-dock.js` | Controlador do dock móvel e visibilidade de navegação administrativa. |
| `assets/rabbitech-release.json` | Metadados de versão e notas de publicação. |
| `api/youtube-search.js` | Endpoint serverless da Vercel para busca do YouTube. |
| `supabase/functions/` | Edge Functions implantáveis no Supabase. |
| `supabase/migrations/` | Alterações SQL versionadas. |
| `backup/`, `backups/` e backups na raiz | Cópias históricas, não usadas como entrada de produção. |
| `docs/` | Documentação de operação e manutenção. |

## Fluxo de dados

1. O navegador carrega a aplicação publicada pela Vercel.
2. O frontend usa o cliente Supabase para as operações permitidas pelas políticas e funções do banco.
3. Operações que dependem de segredos devem passar pelo backend/Edge Function, nunca por código enviado ao navegador.
4. A Vercel publica a versão associada ao repositório e à configuração de saída do projeto.

## Direção de organização

A próxima etapa de engenharia, separada desta documentação, pode extrair áreas do HTML para módulos dedicados. Fazer isso exige primeiro mapear IDs, eventos globais, ordem dos scripts, dependências Supabase e comportamentos de autenticação.

Não mover arquivos nem introduzir bundler/framework até validar como o projeto está configurado na Vercel e criar testes de fumaça para os fluxos principais.
