# Rabbitech: roteiro de correções e validação

## Estado
- Branch de trabalho: `fix/pending-ui-and-diagnostics`
- Ambiente de produção: não alterado.
- Banco Supabase: nenhuma migração aplicada nesta etapa.
- O HTML principal é um arquivo grande e a integração de leitura não retornou seu conteúdo; por isso, não foram feitas substituições cegas no `index.html`.

## Achados confirmados no código
1. `assets/js/mobile-dock.js` aplica configurações públicas e visibilidade de módulos em um intervalo de 15 segundos.
2. O mesmo controlador altera a página ativa para `page-score` quando uma funcionalidade é desativada.
3. `assets/css/mobile-dock.css` esconde a navegação quando `#rbLanguageConsent` está presente e não está `hidden`. Se o fluxo de consentimento falhar ao fechar o overlay, a navegação permanece indisponível.
4. O dock tem várias regras `!important` e regras duplicadas de visibilidade; mudanças pontuais precisam ser testadas em tela móvel e desktop.
5. A regra do ranking exige pelo menos três rodadas por equipe. Um ranking vazio não deve ser tratado automaticamente como falha de banco.

## Plano de correção
- Reproduzir o fluxo de consentimento e confirmar como o overlay é fechado antes de alterar sua lógica.
- Corrigir a transição de página no painel administrativo sem ocultar o placar.
- Verificar a persistência e a atualização dos avisos globais e feature flags.
- Testar as funções públicas do Supabase e a elegibilidade do ranking.
- Adicionar diagnósticos administrativos sem exibir URLs privadas, tokens ou valores de variáveis de ambiente.

## Checklist manual obrigatório
- [ ] Primeira visita: selecionar idioma, aceitar/recusar consentimento conforme a interface existente e entrar no site.
- [ ] Reabrir seletor de idioma após entrar.
- [ ] Testar dock em viewport de 360 px, 390 px e desktop.
- [ ] Atualizar painel administrativo e confirmar que placar e página ativa permanecem corretos.
- [ ] Publicar aviso global, desativá-lo e reativá-lo.
- [ ] Consultar ranking com equipes que tenham 0, 1, 2 e 3+ rodadas.
- [ ] Verificar conta não-admin e conta admin.
- [ ] Confirmar preview e logs antes de integrar em produção.

## Bloqueios conhecidos
- A auditoria anterior identificou rate limit de deploy da Vercel. Não considerar uma alteração validada em produção até que um preview seja concluído.
- O HTML principal precisa ser obtido por uma rota que permita inspecionar seu conteúdo completo. Não substituir esse arquivo com base em trechos de busca.
