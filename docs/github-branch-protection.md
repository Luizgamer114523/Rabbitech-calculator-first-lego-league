# Proteger a branch `main` no GitHub

A leitura do GitHub em 2026-10-27 mostrou `protected: false` para `main`. A integração disponível nesta sessão permite ler branches e PRs, mas não possui operação de escrita para regras de proteção; este passo precisa ser concluído na interface do GitHub.

## Passos

1. Abra o repositório Rabbitech no GitHub.
2. Entre em **Settings → Rules → Rulesets** ou **Settings → Branches**, conforme a interface disponível.
3. Crie uma regra direcionada à branch `main`.
4. Ative **Require a pull request before merging**.
5. Ative **Block force pushes** e **Restrict deletions** (ou as opções equivalentes).
6. Como há um único mantenedor, defina a exigência de aprovação de acordo com o fluxo real; exigir uma aprovação de outra pessoa pode bloquear todas as próprias PRs.
7. Depois que a cota da Vercel liberar e o check ficar verde, considere exigir o status de deploy da Vercel. **Não exija agora um check que esteja permanentemente vermelho por limite de deployments**, porque isso bloquearia a integração até o problema externo ser resolvido.
8. Salve a regra e confirme que a branch `main` aparece como protegida no GitHub.

## Regra operacional sugerida

- Toda mudança de código vai por PR.
- Documentação pode ser integrada depois de conferir os caminhos e o diff.
- Nenhuma migração Supabase deve ser integrada sem reconciliar o histórico remoto e testar em ambiente isolado.
- Se a Vercel sinalizar limite de deployments, não force deploys repetidos; aguarde a janela de liberação ou decida conscientemente se vale mudar de plano.

## Por que a proteção ainda não foi ativada automaticamente

O endpoint de proteção retornou `403 Resource not accessible by integration`; a listagem de branches confirma que `main` não está protegida. A integração atual não oferece permissão/ação para mudar esse estado. Não vou afirmar que a regra foi aplicada enquanto não houver confirmação do GitHub.
