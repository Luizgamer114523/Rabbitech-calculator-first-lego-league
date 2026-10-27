# Backups e manutenção do repositório

## Situação atual

O repositório contém backups históricos em `backup/`, `backups/` e na raiz. Alguns arquivos são grandes e há cópias com nomes semelhantes. Eles serão preservados durante a primeira etapa de organização.

## Política proposta

- `index.html` é o arquivo ativo atual.
- Backups históricos devem ficar em um único local arquivado depois de verificar referências e confirmar que a Vercel não os usa.
- Cada backup deve ter data, motivo e commit de origem quando essas informações estiverem disponíveis.
- Não gerar um novo backup para cada pequena alteração de documentação.
- Não apagar cópias antigas apenas por parecerem duplicadas; compare hashes/conteúdo e mantenha pelo menos uma cópia validada de cada ponto de recuperação útil.
- Backups não substituem Git, snapshots de banco ou backups de dados Supabase.

## Rotina de manutenção

1. Revisar arquivos grandes e duplicados.
2. Conferir referências no HTML e configuração de build da Vercel.
3. Confirmar quais backups são realmente necessários.
4. Mover arquivos em branch dedicada, sem apagá-los na primeira etapa.
5. Testar uma prévia do site antes de integrar a mudança.
6. Documentar decisões e caminhos finais.

## Segredos

Não armazene arquivos `.env`, chaves privadas, tokens ou dumps de banco com dados pessoais no repositório. Se uma credencial já foi publicada, rotacione-a; apagar o arquivo não remove o segredo do histórico Git.
