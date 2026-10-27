# Publicação na Vercel

## Princípio

A publicação atual depende de `index.html` na raiz e dos caminhos relativos existentes. Não renomeie o arquivo nem altere o diretório de saída sem verificar as configurações do projeto Vercel.

## Fluxo seguro

1. Faça alterações em uma branch dedicada.
2. Revise o diff e confirme que os caminhos de CSS, JavaScript, API e assets continuam válidos.
3. Teste a prévia do deploy antes de promover para produção.
4. Verifique o estado final do deploy na Vercel.
5. Abra a URL publicada e confirme HTTP 200, versão esperada e carregamento dos recursos críticos.
6. Só então marque a tarefa como concluída.

## Variáveis de ambiente

Configure variáveis privadas no painel da Vercel. Nunca grave valores reais em arquivos versionados. Quando o nome de uma variável mudar, atualize a documentação com o nome, finalidade e local de configuração, nunca com o valor secreto.

## Reversão

Se uma publicação quebrar o site, use o mecanismo de rollback da Vercel para a última implantação conhecida como boa. Não substitua o código de produção por um backup histórico sem comparar o conteúdo e confirmar a compatibilidade com o banco atual.
