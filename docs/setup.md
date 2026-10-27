# Configuração e desenvolvimento local

## Pré-requisitos

- Git.
- Um navegador moderno.
- Um servidor HTTP estático local para validar recursos relativos e comportamento do navegador.
- Acesso aos projetos Supabase/Vercel apenas para tarefas que realmente precisem dessas integrações.

## Abrir a aplicação

O arquivo de entrada atual é `index.html`. Para uma verificação visual simples, pode-se abri-lo no navegador; para uma validação mais fiel, use um servidor estático local. O repositório não deve ser tratado como um projeto npm até que exista um manifesto `package.json` e um fluxo de build documentado.

## Integrações

- Recursos conectados ao Supabase podem exigir configuração válida do projeto e autenticação.
- O endpoint `api/youtube-search.js` depende das variáveis de ambiente configuradas no servidor Vercel.
- Nunca copie segredos de produção para `index.html`, exemplos, screenshots ou commits.

## Antes de abrir um pull request

1. Confira o diff completo.
2. Confirme que `index.html` permanece na raiz.
3. Valide sintaxe e carregamento dos arquivos CSS/JS externos.
4. Teste abertura do site, seleção de idioma, login, ranking público e painel administrativo quando o ambiente de teste permitir.
5. Confirme que não foram incluídos segredos, dados privados ou backups novos desnecessários.
6. Registre os testes executados e as limitações conhecidas no PR.
