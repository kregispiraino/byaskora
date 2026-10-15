# Google Ads — clique de encaminhamento ao WhatsApp

Implementação de 15/10/2026. A correção final de `prompt.md` prevalece: a abertura do modal **não** é uma conversão. Mede-se o clique no link final de WhatsApp do modal, sem afirmar que houve uma conversa ou um lead confirmado.

## Identificadores conferidos

Consulta somente de leitura à conta Google Ads Askora `8039511031`, em 15/10/2026. Os cinco `send_to` foram comparados aos `conversion_action.tag_snippets` da API; todos coincidem, inclusive capitalização e caracteres especiais. Nenhuma configuração da conta nem conversão do site Askora foi modificada.

| Rota              | Ação       | `send_to`                             |
| ----------------- | ---------- | ------------------------------------- |
| `/websites`       | 7848288916 | `AW-18509101979/o_xZCJTFrZ4dEJv36flE` |
| `/aplicativos`    | 7848288919 | `AW-18509101979/OJNrCJfFrZ4dEJv36flE` |
| `/sistemas`       | 7848288922 | `AW-18509101979/-LYLCJrFrZ4dEJv36flE` |
| `/ai-solutions`   | 7848288925 | `AW-18509101979/OIzpCJ3FrZ4dEJv36flE` |
| `/reestruturacao` | 7848289108 | `AW-18509101979/7jDQCNTGrZ4dEJv36flE` |

Na consulta, as cinco ações estavam secundárias (`primary_for_goal=false`), com contagem `ONE_PER_CLICK`. Isso foi preservado. O papel delas na otimização das campanhas depende da configuração de metas da conta e não é alterado por este código.

## Funcionamento

- `src/js/analytics.js`: ID da tag, mapeamento das rotas, consentimento e único emissor de conversão. As variantes com barra final ou `/index.html` também são reconhecidas.
- `src/js/components/dialogs.js`: uma função de abertura captura `{ service, route, trigger }`, mantendo o contexto enquanto o modal está aberto. A origem também fica nos atributos `data-origin-*` para inspeção. Fecha e limpa o contexto; cada nova abertura lê a rota novamente.
- `src/js/main.js`: inicialização compartilhada, com proteção contra instalação duplicada.
- `src/shared/dialogs.html`: marcador no link existente de WhatsApp, aviso de cookies e preferências no diálogo Privacidade. O modal de contato mantém sua aparência e seu link nativo em nova aba.
- `src/styles/consent.css` e `finishing.css`: estilos isolados do aviso e das preferências, com ações equivalentes de aceitar e recusar.
- `tools/security.js`: autoriza os endpoints necessários do Google Ads na CSP, sem liberar scripts inline arbitrários ou `unsafe-eval`.

Cada clique final gera uma chamada `gtag('event', 'conversion', { send_to })`. Não há callback de navegação nem espera por entrega: o WhatsApp abre normalmente mesmo se a tag falhar. Cliques separados são interações separadas; a regra de contagem do Google continua sendo aplicada pela conta. CTAs externos, abertura, fechamento, mudanças de assunto da IA, formulário e links diretos de WhatsApp fora do modal não emitem essa conversão.

O assunto sugerido pelo chat de IA permanece separado do serviço de origem. Não enviamos campos de formulário, mensagens, assunto da conversa ou dados pessoais como parâmetros do evento.

## Consentimento

A inspeção inicial não encontrou instalação anterior de analytics ou interface de consentimento. Foi adicionado consentimento básico: sem escolha ou após recusa, nenhum script do Google é carregado e nenhum evento de conversão é enfileirado. Após aceitação, `ad_storage` e `ad_user_data` são permitidos; `ad_personalization` e `analytics_storage` permanecem negados.

A preferência é armazenada na origem ByAskora, em `byaskora.ads-consent.v1`, e pode ser alterada em Privacidade. Se o armazenamento estiver indisponível, a escolha vale apenas na página atual. Revogações atualizam o Consent Mode e bloqueiam novos eventos; outras abas sincronizam a preferência pelo evento `storage`. Cliques anteriores à aceitação nunca são reenviados. Uma tag já carregada pode emitir a atualização de consentimento ao revogar; não é possível desfazer requisições já enviadas.

A integração preserva uma fila `dataLayer` e uma função `gtag` preexistentes, reutiliza uma instalação de `gtag.js` e evita configurar o mesmo destino duas vezes.

## Validação

`tests/e2e/analytics.spec.js` verifica todos os acionadores nas cinco landing pages, incluindo o CTA dinâmico do chat, header desktop/mobile, origem, cliques repetidos com o modal aberto, fechamento/reabertura, navegação entre rotas, páginas sem serviço, consentimento inicial, aceitação, recusa, persistência, revogação, armazenamento indisponível, falha da tag e instalação preexistente. Os testes interceptam Google, WhatsApp e IA para não enviar conversões ou contatos reais.

Resultado local: lint, formatação, build e 16 testes unitários aprovados. A suíte de navegador cobre 244 cenários em Chromium, Firefox, WebKit e iPhone: 242 cenários aprovados considerando a execução geral e a revalidação dos ajustes mobile; dois cenários de mouse/teclado são ignorados por projeto no iPhone. Após corrigir a sobreposição do aviso sobre o menu e preparar a escolha de cookies antes da medição do chat, os 26 testes mobile de analytics, chat e site passaram integralmente.

Comandos executados: `npm run check`; após os ajustes finais, `npm run lint`, `npm run format:check`, `npm test`, `npm run build` e `npx playwright test tests/e2e/analytics.spec.js tests/e2e/ai-chat.spec.js tests/e2e/site.spec.js --project=mobile`.

Também foi executado um teste nas cinco landing pages com o JavaScript real de `gtag.js`: o clique gerou requisições com o ID e label esperados para os endpoints de conversão, sem violações de CSP. As requisições de medição foram interceptadas antes do envio, para não contaminar a conta com conversões de teste. Isso confirma a montagem e tentativa de envio no navegador, não a atribuição final no relatório do Google Ads.

A confirmação de processamento e atribuição no Google Ads depende de interações reais consentidas após a publicação. O Tag Assistant pode ser usado para diagnóstico. Bloqueadores, rede e consentimento podem impedir a entrega.

Referências oficiais: [conversões por clique](https://developers.google.com/tag-platform/devguides/conversions), [Consent Mode](https://developers.google.com/tag-platform/security/guides/consent) e [CSP para Google Ads](https://developers.google.com/tag-platform/security/guides/csp).
