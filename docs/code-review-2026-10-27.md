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

### Alta prioridade: duas camadas de consentimento disputavam a tela inicial
O HTML usa `#rbPrivacyGate` e cria também `#rbLanguageConsent` por script, com estados separados. Isso podia empilhar dois diálogos e competir com as regras CSS que escondem a navegação. Na branch, `mobile-dock.js` agora mantém `#rbPrivacyGate` como a única tela obrigatória e oculta o overlay duplicado quando ambos existem. O seletor de idioma gerado como `#rbLanguageHeader` também é reconhecido pelo controlador do dock. O aceite explícito da política continua sendo exigido pelo `#rbPrivacyGateConfirm`; não foi removido nem contornado.

### Alta prioridade: vários controladores mexem na mesma navegação
O HTML contém scripts inline acumulados que adicionam listeners de navegação, controle de acesso e reparos de interface. O controlador externo também altera visibilidade e página ativa. É uma fonte plausível de regressões como o placar desaparecer depois de atualizar o painel. É preciso consolidar esses fluxos e reproduzir a sequência em navegador antes de declarar o bug corrigido.

### Média prioridade: configurações globais têm mais de um aplicador
O HTML aplica configurações globais e avisos por `rbApplyGlobalSettings`/`rbApplyFeatureFlags`. O controlador `mobile-dock.js` também consulta `get_rabbitech_public_settings` e aplica visibilidade de módulos e aviso global. Na branch, foram corrigidos dois conflitos observáveis: quando um módulo é reativado, o controlador externo remove o `display:none!important` inline deixado pelo aplicador original; e avisos ativos sem texto continuam ocultos, em vez de mostrar um banner vazio. Ainda é recomendável consolidar os aplicadores depois de testes de interação, porque ambos continuam consultando e atualizando o mesmo estado.

### Média prioridade: warning em `/api/youtube-search`
Os logs de produção mostram o aviso Node.js `DEP0169` ligado a `url.parse()`. A versão atual do arquivo `api/youtube-search.js` já usa `new URL()` e não contém chamada direta a `url.parse()`; a origem pode estar no runtime ou em uma dependência. Não fiz uma alteração especulativa. É preciso obter um stack trace útil para identificar a origem.

## Verificações executadas

- Compilação sintática com `new Function` dos 8 scripts inline com conteúdo e dos 2 arquivos JS externos: **10/10 sem erro de sintaxe**.
- O preview Vercel consultado respondeu HTTP 200.
- A fonte do preview verificado incluía os dois arquivos JS esperados.
- O preview anterior respondeu HTTP 200 e incluía os dois arquivos JS externos. Os commits posteriores de correção precisam de novo preview e teste manual antes de considerar os fluxos validados.
- Não há teste automatizado de interface configurado no `package.json`.
- Não foram executados cliques reais em navegador nem testes end-to-end. A compilação sintática e o HTTP 200 não comprovam que os fluxos de consentimento, placar, avisos ou dock estão corretos.

## Próxima ordem recomendada

1. Consolidar e testar a sequência única de idioma/privacidade, sem ignorar o aceite explícito.
2. Reproduzir e corrigir o fluxo `Admin → Atualizar painel`, confirmando que a aba e o placar ficam estáveis.
3. Centralizar a aplicação das configurações e avisos globais.
4. Testar o dock a 360 px, 390 px e desktop, em contas de administrador e visitante.
5. Diagnosticar a origem do warning `DEP0169` antes de mexer em código da API.
6. Somente então integrar a branch e avaliar publicação.


## Correções de conflitos aplicadas após a revisão

- Um único overlay obrigatório de privacidade: `#rbPrivacyGate`; o overlay duplicado de idioma é ocultado se ambos existem.
- O controlador do dock reconhece o seletor que o script inline renomeia para `#rbLanguageHeader`.
- A função de escape HTML usada pelo diagnóstico foi definida.
- O planejador de estratégia duplicado foi removido para não disputar IDs com o comparador de `competition-tools.js`.
- O cronômetro adicional foi removido; permanece o cronômetro original do placar.
- Reativar módulos limpa o `display:none!important` antigo aplicado pelo controlador inline.
- Avisos globais sem texto não aparecem como banners vazios.
- Os dois arquivos JS externos passaram pela verificação sintática `new Function` após as alterações.
- As alterações permanecem na branch; a produção e o Supabase não foram modificados.
