# Revisão de código Rabbitech — 27/10/2026

## Escopo e segurança

- Branch revisada: `fix/pending-ui-and-diagnostics`.
- A revisão leu o HTML principal, os controladores de navegação/recursos e as ferramentas de competição.
- Nenhuma migração ou alteração foi aplicada ao Supabase.
- Nenhuma mudança foi integrada à branch `main` nem publicada em produção.
- O site é uma página HTML monolítica de aproximadamente 2,4 MB, com vários scripts inline e patches de interface acumulados.

## Defeitos confirmados e alterações feitas na branch

### 1. Inicialização administrativa podia parar por função inexistente
`assets/js/mobile-dock.js` usava `escapeDiagnosticText()` ao desenhar o diagnóstico de módulos sem definir essa função. Isso provocava `ReferenceError` quando a seção era criada e podia interromper o restante do controlador. Foi adicionada uma função de escape HTML.

### 2. Planejador duplicado e conflito de IDs
O planejador adicionado ao controlador do dock reutilizava IDs como `rbStrategyName`, `rbStrategyPoints`, `rbStrategySave` e `rbStrategyList`, que também são usados por `assets/js/competition-tools.js`. IDs duplicados podem fazer um controlador ler ou alterar a ferramenta errada. A cópia redundante foi removida; o comparador de estratégias ficou em `competition-tools.js`.

### 3. Cronômetro redundante
O projeto já tem cronômetro em `#page-score` (`#clock`, `#startTimer`). O novo cartão de cronômetro foi removido de `competition-tools.js`; o cronômetro original foi preservado.

### 4. Trabalho repetido no tradutor
O observador de `rb-site-i18n` reexecutava uma varredura completa de texto a cada mutação do DOM, inclusive com scripts, estilos e dados embutidos numa página grande. Foi alterado para traduzir inicialmente a página e depois processar apenas nós de texto alterados ou elementos recém-adicionados, ignorando elementos que não devem ser traduzidos, como `script` e `style`.

### 5. Robustez de estado e diagnósticos
- A leitura do armazenamento local agora exige que o JSON seja uma lista antes de usar métodos de array.
- A atualização de configurações públicas tem uma trava para impedir chamadas RPC sobrepostas.
- O observador do dock agrupa atualizações por quadro de animação.
- O diagnóstico não classifica a ausência da tela de idioma como sucesso.
- O diagnóstico informa tempo de resposta do RPC e descreve a checagem administrativa como indicador local, não como autorização do banco.
- Foram removidas iterações duplicadas sobre `data-feature-flag`.

### 6. Campos do comparador
O limite de comprimento é aplicado somente ao campo de nome, e a confiança estimada pode ser zero, coerente com a validação.

## Achados que exigem correção dedicada

### Alta prioridade: duas camadas de consentimento disputam a tela inicial
O HTML usa `#rbPrivacyGate` e cria também `#rbLanguageConsent` por script. Eles têm controladores e estados de aceite separados. A folha `assets/css/mobile-dock.css` dá prioridade de camada à tela de privacidade, enquanto o seletor de idioma usa outra camada; além disso, os botões de cada camada fecham elementos diferentes e atualizam a preferência de aceite de formas diferentes. Isso pode fazer a primeira tela parecer bloqueada ou exigir etapas duplicadas. A correção adequada é consolidar o fluxo em uma sequência única, preservando a confirmação explícita da política. Não alterei esse comportamento sem teste de interação para evitar contornar a confirmação de privacidade.

### Alta prioridade: vários controladores mexem na mesma navegação
O HTML contém scripts inline acumulados que adicionam listeners de navegação, controle de acesso e reparos de interface. O controlador externo também altera visibilidade e página ativa. É uma fonte plausível de regressões como o placar desaparecer depois de atualizar o painel. É preciso consolidar esses fluxos e reproduzir a sequência em navegador antes de declarar o bug corrigido.

### Média prioridade: configurações globais têm mais de um aplicador
O HTML aplica configurações globais e avisos por `rbApplyGlobalSettings`/`rbApplyFeatureFlags`. O controlador `mobile-dock.js` também consulta `get_rabbitech_public_settings` e aplica visibilidade de módulos e aviso global. Como ambas as rotas alteram elementos relacionados, mudanças podem competir. A correção recomendada é manter uma única fonte de verdade e um único aplicador de estado público, depois testar publicar/desativar/reativar avisos.

### Média prioridade: warning em `/api/youtube-search`
Os logs de produção mostram o aviso Node.js `DEP0169` ligado a `url.parse()`. A versão atual do arquivo `api/youtube-search.js` já usa `new URL()` e não contém chamada direta a `url.parse()`; a origem pode estar no runtime ou em uma dependência. Não fiz uma alteração especulativa. É preciso obter um stack trace útil para identificar a origem.

## Verificações executadas

- Compilação sintática com `new Function` dos 8 scripts inline com conteúdo e dos 2 arquivos JS externos: **10/10 sem erro de sintaxe**.
- O preview Vercel consultado respondeu HTTP 200.
- A fonte do preview verificado incluía os dois arquivos JS esperados.
- O preview consultado correspondia ao commit `87f553659d7024f0ec5ef9f793cb3c905423493f`. O commit posterior de limpeza de campos precisa de um novo preview antes de validar a versão completa.
- Não há teste automatizado de interface configurado no `package.json`.
- Não foram executados cliques reais em navegador nem testes end-to-end. A compilação sintática e o HTTP 200 não comprovam que os fluxos de consentimento, placar, avisos ou dock estão corretos.

## Próxima ordem recomendada

1. Consolidar e testar a sequência única de idioma/privacidade, sem ignorar o aceite explícito.
2. Reproduzir e corrigir o fluxo `Admin → Atualizar painel`, confirmando que a aba e o placar ficam estáveis.
3. Centralizar a aplicação das configurações e avisos globais.
4. Testar o dock a 360 px, 390 px e desktop, em contas de administrador e visitante.
5. Diagnosticar a origem do warning `DEP0169` antes de mexer em código da API.
6. Somente então integrar a branch e avaliar publicação.
