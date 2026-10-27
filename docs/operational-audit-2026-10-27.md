# Auditoria operacional do Rabbitech

**Data da verificação:** 2026-10-27  
**Projeto:** Rabbitech BIOGLOW FLLC  
**Escopo:** GitHub, Vercel e Supabase; leitura somente para estado operacional.

## 1. GitHub e publicação

- Branch principal identificada: `main`, commit `98fd4137f885eb9707729230e835b0b829a6cb06`.
- A listagem de branches informa `protected: false` para `main`; a conexão não tem permissão para alterar regras de proteção nem acessar o endpoint administrativo de proteção.
- O check de status da Vercel associado ao commit da `main` falhou com a mensagem: `Deployment rate limited — retry in 24 hours.` O check foi registrado em `2026-10-27T02:45:38Z`.
- A última implantação de produção consultada está `READY` e tem o alias `rabbitech-fllc.vercel.app`, mas foi construída a partir do commit `c421f3286cb6dac0fa1eef0fa6a354a6e0f409ac`, diferente do commit atual de `main`.
- O PR #7 de organização permanece aberto como rascunho, sem merge. O PR muda documentação e `.gitignore`, mas não `index.html`.

**Impacto:** a publicação atual está saudável segundo o estado da implantação, mas não corresponde ao SHA atual da branch principal. Novas tentativas de deploy estão limitadas pela Vercel; não tentar contornar a cota nem alterar aliases manualmente.

## 2. Backups

- 21 caminhos de backup foram identificados, totalizando aproximadamente 47,52 MiB.
- Há uma duplicata exata: `backup/index-before-remaster-2026-10-25.html` e `backups/index-before-remaster-2026-10-25.html` têm o mesmo SHA de blob.
- Os demais arquivos têm hashes diferentes. Tamanho ou nome parecidos não provam que sejam equivalentes.
- Nenhum arquivo foi apagado, movido ou reescrito.
- Antes de deduplicar, preservar um arquivo verificado fora da árvore de deploy e confirmar se backups históricos devem ser servidos publicamente pela Vercel.

## 3. Supabase

- O projeto principal `ieijssfqonoucqheedac` está ativo e as tabelas de equipes e rodadas têm RLS habilitado.
- Tabelas administrativas, de auditoria e de configuração sem políticas RLS não concedem acesso de tabela a `anon` ou `authenticated` nas concessões consultadas; parecem intencionalmente acessíveis apenas por funções privilegiadas.
- Apenas `get_public_leaderboard()` e `get_rabbitech_public_settings()` foram confirmadas como funções `SECURITY DEFINER` executáveis por `anon`. Seus nomes e retornos indicam funções públicas intencionais, mas os campos públicos devem continuar livres de segredos.
- As 22 funções privilegiadas acessíveis a `authenticated` têm ACL sem execução por `anon`; as funções administrativas consultadas checam o usuário, o grupo administrativo ou o guardião do proprietário. O advisor é um alerta de revisão, não prova de exploração.
- Quatro políticas RLS em `teams` e `rounds` reavaliam `auth.uid()` por linha e têm oportunidade de otimização por `(select auth.uid())`.
- O banco registra 25 migrações aplicadas, enquanto a árvore atual do GitHub contém 12 arquivos em `supabase/migrations/` e os identificadores não correspondem integralmente. Esse descompasso deve ser reconciliado antes de executar `db push` ou aplicar novas migrações.

Nenhuma tabela, função, política, permissão, dado ou migração foi alterada.

## 4. Aviso no endpoint do YouTube

- O Vercel agrupou 15 ocorrências do aviso Node `DEP0169` em `/api/youtube-search`, entre 25 e 26 de outubro.
- O arquivo `api/youtube-search.js` usa a API WHATWG `URL`; não há chamada direta a `url.parse()` nesse arquivo.
- O log agrupado não fornece a pilha que origina o aviso. Os logs detalhados de execução não estavam disponíveis para a janela histórica pedida no plano atual.
- Não fazer mudanças especulativas: primeiro capturar a origem do aviso em um preview quando a cota de deploy estiver disponível, depois corrigir a dependência ou código que realmente chama `url.parse()`.

## 5. Perfil pessoal GitHub

O conteúdo sugerido para bio e README de perfil foi preparado em `docs/profile-refresh.md`. A integração disponível não pode criar o repositório especial `Luizgamer114523` nem editar bio, avatar ou projetos fixados. Isso ainda precisa de uma ação manual no GitHub.

## 6. Bloqueios externos para concluir

1. Aguardando liberação da cota de deployments da Vercel para validar uma preview ou novo deploy.
2. Acesso administrativo do GitHub necessário para proteger `main`.
3. Repositório especial e campos do perfil GitHub exigem ações de conta que a conexão não oferece.
4. Histórico SQL remoto precisa ser reconciliado com os arquivos versionados antes de aplicação de novas migrações.

## Política aplicada durante esta rodada

Não mesclar PRs, não mexer no `index.html` de produção, não publicar novas versões, não revogar permissões em produção e não apagar backups sem verificação. As correções propostas devem ser revisadas e testadas em um ambiente isolado antes da aplicação.
