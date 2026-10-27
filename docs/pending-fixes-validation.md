# Rabbitech: roteiro de correções e validação

## Estado
- Branch de trabalho: `fix/pending-ui-and-diagnostics`
- Produção: não alterada; mudanças de interface continuam em preview.
- Supabase principal: migrações aditivas do espaço de equipe aplicadas. Não houve alteração de pontuações, equipes existentes ou configurações globais.
- O HTML principal é um arquivo grande e a integração de leitura não retornou seu conteúdo; o carregamento do módulo Kanban foi integrado por meio do controlador existente `assets/js/mobile-dock.js`, sem reescrever o HTML completo.

## Alterações da revisão
- Corrigido helper de escape ausente em `assets/js/mobile-dock.js`.
- Removido o planejador de estratégia duplicado e o cronômetro extra; o site mantém seu cronômetro original.
- Criado `assets/js/team-workspace.js` para o quadro privado de equipe.
- Criadas tabelas com RLS para associações de membros, convites, tarefas e eventos de status.
- Criadas RPCs com validação de sessão/liderança para identificar o espaço, gerar convites, ingressar por código e alterar status de tarefa.
- Convites armazenam somente hash; o código é mostrado uma única vez à liderança.
- Adicionados índices para as chaves estrangeiras do espaço de equipe.

## Verificações feitas
- As quatro tabelas novas existem e têm RLS habilitado.
- As RPCs novas estão registradas no banco.
- `mobile-dock.js` e `team-workspace.js` passaram pela verificação de sintaxe JavaScript.
- Preview Vercel atual ficou `READY`; página inicial e os dois arquivos JS retornaram HTTP 200.
- Não foi possível executar o fluxo completo de login/convite com duas contas reais pelo teste automatizado disponível.

## Checklist manual obrigatório antes do merge
- [ ] Entrar com a conta Google que é dona/líder de uma equipe e gerar convite.
- [ ] Entrar com uma segunda conta Google e aderir usando o código de convite.
- [ ] Confirmar que o menu Equipe só aparece para integrante autenticado.
- [ ] Criar tarefa, atribuir responsável, definir prioridade e prazo.
- [ ] Mover tarefa entre A fazer, Em andamento e Concluída.
- [ ] Conferir contagens, média individual/coletiva e atividade recente.
- [ ] Tentar acessar outra equipe e confirmar que os dados são bloqueados por RLS.
- [ ] Testar a interface em 360 px, 390 px e desktop.
- [ ] Testar idioma/privacidade, dock, Admin/Placar e avisos globais.
- [ ] Conferir logs e status do preview mais recente.

## Bloqueios conhecidos
- A validação estática e o HTTP 200 não substituem um teste funcional com contas reais.
- Não fazer merge nem publicar em produção antes de concluir o checklist acima.
