# ByAskora

Site institucional de desenvolvimento web, preparado para `https://byaskora.com/` e hospedagem no Railway. HTML estático gerado no build, CSS e JavaScript em módulos, sem framework no navegador, CDN ou fontes externas. O formulário utiliza o serviço de contato compartilhado do Askora. O chat de AI Solutions usa um endpoint próprio de servidor para acessar o Gemini.

## Desenvolvimento

Use Node.js 24 LTS (versão indicada em `.nvmrc`).

```sh
npm ci
npm run dev
```

Acesse o endereço mostrado pelo Vite. Abrir o HTML fonte diretamente com `file://` não executa a montagem dos componentes.

```sh
npm run build       # gera dist/ com arquivos otimizados
npm run preview     # serve o resultado localmente
```

## Organização

- `index.html`: documento base, metadados e pontos de inclusão.
- `src/sections/`: conteúdo institucional, na ordem dos nomes dos arquivos.
- `src/pages/contato.html`: página de solicitação de contato.
- `src/styles/contact.css` e `closing.css`: modal, formulário e CTA compartilhado.
- `src/shared/`: navegação, rodapé, diálogos e ícones.
- `src/js/pages/`: entradas por página; cada rota importa somente suas demonstrações e seus estilos.
- `src/js/main.js`: inicialização compartilhada de navegação, diálogos, bolinhas e impressão.
- `src/js/components/`: navegação, abas, diálogos, contato e animações.
- `src/js/contact-validation.js`: validação dos campos de contato, sem acesso ao DOM.
- `src/styles/`: `base.css` reúne a fundação; `finishing.css` aplica CTA, contato e fallbacks ao final. Os estilos institucionais e de cada serviço ficam separados.
- `src/site.json`: domínio, identidade e canais públicos. Não coloque segredos aqui.
- `public/assets/images/`: imagens originais da identidade visual.
- `tools/`: montagem do HTML, SEO e cabeçalhos de segurança.
- `server/ai/`: configuração privada, prompt comercial, integração Gemini e endpoint do chat.
- `tests/`: testes unitários e testes de navegador.
- `deploy/`, `Dockerfile`, `railway.toml`: servidor de produção no Railway.
- `docs/archive/`: histórico e prévias anteriores; não são evidência da versão atual e não entram na imagem de produção.

Edite as fontes e execute o build. Não edite `dist/`. Marcadores desconhecidos e ícones inexistentes interrompem o build. O conteúdo completo é renderizado no HTML e pode ser lido sem executar JavaScript.

## Qualidade

```sh
npx playwright install chromium firefox webkit
npm run check
```

O comando executa lint, formatação, testes unitários, build e testes em Chromium, Firefox, WebKit e emulação de iPhone. O modelo de integração contínua em `docs/ci-workflow.yml` repete esses controles. Os testes verificam SEO, recursos locais, links internos, formulário, teclado, redução de movimento, acessibilidade automatizada, larguras de 320 a 1920 pixels e alternativas sem JavaScript/Canvas. Use `npm run format` para formatar as fontes. Para revisar apenas as páginas ByAskora, sem os templates dos projetos, use `npm run test:byaskora` após o build.

## Revisão técnica das páginas — 15/10/2026

Escopo: institucional, Websites, Aplicativos, Sistemas, AI Solutions, Reestruturação, Contato e a galeria do Portfólio. Os templates em `public/projetos/` não foram alterados nesta revisão.

- Entradas estáticas por página em `src/js/pages/`, com CSS disponível mesmo sem JavaScript. Demonstrações não utilizadas deixam de ser baixadas e inicializadas.
- Remoção de 164 seletores obsoletos das antigas demonstrações, menus e formulário em etapas. Os estilos exclusivos da institucional ficam em `institutional.css` e `institutional-solutions.css`; a moldura de navegador usada por Websites e Portfólio fica em `browser-chrome.css`.
- Remoção da composição antiga de e-mail, substituída pelo serviço de contato. A validação fica em `contact-validation.js`, incluindo telefone opcional e seus limites.
- Imagens dos pilares carregadas sob demanda, biblioteca de ícones lida uma vez por renderização e agendamento do showroom interrompido ao sair da página, com retomada ao voltar.
- Atualizações da tabela de Sistemas preservam a posição dos controles durante a transição; a animação de troca de páginas permanece.
- Testes atualizados para a navegação atual e a abertura compacta de Contato. `pages.spec.js` cobre todas as rotas e impõe limites de 25 KB de JavaScript e 65 KB de CSS por página no build, sem compressão.

Antes da revisão, cada página carregava aproximadamente **52,8 KB de JavaScript e 107,0 KB de CSS**. Os novos totais iniciais, somando os arquivos compartilhados e os específicos de cada rota, são:

| Página         | JavaScript |     CSS |
| -------------- | ---------: | ------: |
| Institucional  |    11,9 KB | 41,7 KB |
| Websites       |    14,8 KB | 42,7 KB |
| Aplicativos    |    11,6 KB | 43,8 KB |
| Sistemas       |    15,5 KB | 51,0 KB |
| AI Solutions   |    16,0 KB | 40,8 KB |
| Reestruturação |    20,9 KB | 40,9 KB |
| Contato        |    11,6 KB | 31,7 KB |
| Portfólio      |     8,1 KB | 37,4 KB |

As medidas são de recursos, não uma estimativa de tempo de carregamento em rede real. Capturas e geometria foram comparadas em desktop e mobile, com verificações de teclado, movimento reduzido, acessibilidade e fallback sem JavaScript. Integrações de contato e IA são verificadas com respostas controladas, sem envio de dados reais. A revisão não publica o site nem substitui a validação da infraestrutura de produção.

## Ativação da integração contínua

A credencial GitHub usada no envio permite publicar o código, mas não criar arquivos em `.github/workflows/` (falta o escopo `workflow`). Por isso, o workflow validado está salvo como modelo em `docs/ci-workflow.yml` e **ainda não está ativo**.

Para ativá-lo, crie `.github/workflows/ci.yml` com o conteúdo desse modelo pelo editor do GitHub, usando uma conta com permissão, ou publique esse arquivo com uma credencial que permita alterar workflows. A automação executa a validação do código, os testes nos navegadores e o build/teste HTTP do Docker a cada push ou pull request. Até ativar, rode `npm run check` antes de publicar.

## Publicação no Railway

1. Crie um serviço conectado ao repositório `kregispiraino/byaskora`, branch `main`.
2. Mantenha a raiz do repositório como diretório do serviço. `railway.toml` seleciona o Dockerfile automaticamente; não configure um comando de início adicional.
3. O build executa `npm ci` e `npm run build`. A imagem final serve `dist/` com Nginx, escuta em `0.0.0.0:$PORT` e responde ao healthcheck `/`. Um processo Node interno atende `/api/ai/chat` via proxy; nenhuma chave entra no build. Configure `GEMINI_API_KEY` e `GEMINI_MODEL` nas variáveis privadas do serviço antes de usar o chat em produção.
4. Adicione `byaskora.com` em **Networking → Custom Domain** e configure os registros DNS exatamente como o Railway informar. Ative/confira o HTTPS antes de divulgar o site.
5. Confira a página, `/robots.txt`, `/sitemap.xml` e o formulário no domínio final. Cadastre o sitemap no Google Search Console quando o domínio estiver ativo.

O domínio canônico já está configurado. Se adicionar `www`, configure redirecionamento permanente para `https://byaskora.com/` no provedor. Endereços de teste não devem ser divulgados nem enviados ao Search Console.

Para um ambiente de prévia no Railway, defina `SITE_MODE=preview` antes do build. O argumento Docker com esse nome faz o Vite gerar `noindex,nofollow` e `Disallow: /`. Produção usa `SITE_MODE=production` (padrão). A ausência de indexação de uma prévia não é controle de acesso.

Para testar a imagem localmente:

```sh
docker build -t byaskora .
docker run --rm -p 8080:8080 -e PORT=8080 --env-file .env.local byaskora
```

O Nginx aplica compressão gzip, cache longo somente aos scripts/estilos com nome versionado e revalidação do HTML. Respostas incluem CSP, proteção contra incorporação em frames, `nosniff`, política de referência e HSTS. `npm run preview` é apenas ferramenta local; produção usa Nginx.

## Contato e privacidade

O modal compartilhado oferece WhatsApp e acesso a `/contato`. A página tem validação, assunto preenchido a partir do serviço, estados de envio/erro e confirmação somente após uma resposta real do servidor. Os campos não são persistidos no navegador.

Em produção, o formulário envia para `/api/contact`. O Nginx aceita POST com a origem exata `https://byaskora.com` e `X-Askora-Request: 1`, e encaminha o JSON para `https://askora.com.br/api/public/contact` pelo servidor. Cookies, credenciais e cabeçalhos de origem do navegador não são encaminhados. A conexão com o Askora verifica o certificado TLS. Assim, a publicação do ByAskora não depende de mudanças no CORS do Askora.

Os campos são `kind`, `name`, `email`, `company`, `phone`, `topic` e `message`; a confirmação exige `data.sent === true` ou `data.saved === true`. O serviço existente mantém sua validação, limites, deduplicação e fila de entrega. O destinatário continua `contato@askora.com.br`; credenciais permanecem apenas no backend do Askora. Não há disparo automático para o visitante.

Os testes locais usam respostas controladas, sem enviar mensagens reais. O Docker define `VITE_CONTACT_ENDPOINT=/api/contact` por padrão. Fora do Docker, `src/site.json` fornece o endereço direto do Askora; `VITE_CONTACT_ENDPOINT` permite usar um receptor de teste durante desenvolvimento/build. `localhost` e domínios de prévia não têm permissão de envio pelo proxy de produção. Endpoints externos alternativos exigem ajuste explícito da CSP e das origens aceitas pelo receptor. Nunca coloque credenciais em variáveis Vite.

As capturas estáticas dos pilares ficam em `public/assets/images/pillars/`. Para atualizar a partir das próprias demonstrações, execute `node tools/capture-pillars.js` com Chromium do Playwright e `cwebp` instalados. O script abre um servidor local temporário e captura Websites, Sistemas, AI Solutions e as três abas de Aplicativos. Para atualizar somente um pilar, use `npm run snapshots:pillars -- websites` (também aceita `aplicativos`, `sistemas` ou `ai-solutions`). Essas imagens não inicializam os componentes interativos na institucional.

Referências de implantação: [Dockerfiles no Railway](https://docs.railway.com/builds/dockerfiles), [healthchecks e PORT](https://docs.railway.com/deployments/healthchecks), [build estático do Vite](https://vite.dev/guide/build) e [dados estruturados de organização](https://developers.google.com/search/docs/appearance/structured-data/organization).

## Abertura com busca

A institucional e as cinco páginas de serviço compartilham a abertura de digitação inspirada em `Project - sub4sites/sub4sites`, adaptada à paleta ByAskora. O endereço exibido é `byaskora.com` seguido do serviço; AI Solutions apresenta `/ia` apenas na animação, preservando a rota `/ai-solutions`.

O componente fica em `src/shared/entry-search.html`, `src/styles/entry-search.css` e `src/js/components/entry-search.js`. Na institucional, digita o endereço inteiro em uma sequência de aproximadamente 1,7 segundo. Nos serviços, `byaskora.com` já vem preenchido no HTML e apenas o caminho é digitado, reduzindo a abertura para aproximadamente 1 a 1,4 segundo. Permite pular pela lupa ou pelo teclado e não depende de imagens ou serviços externos. Não aparece em Contato, Portfólio, links com âncora, retorno pelo histórico ou quando há preferência por movimento reduzido. Sem JavaScript, a página abre diretamente; se o módulo falhar, a abertura é liberada automaticamente. O bootstrap inicial está incluído no hash da política de segurança.

A saída do buscador inicia uma entrada em sequência para título, descrição, ações e ilustração das seis páginas, controlada por `src/js/components/hero-entrance.js`. Usa somente opacidade e transformação, sem alterar o layout. Os efeitos são removidos ao concluir ou quando a pessoa começa a interagir; a preferência por movimento reduzido abre o conteúdo diretamente.

## Personagem institucional

`src/shared/mascot.html` contém o personagem vetorial preto com olhos ciano; `src/styles/mascot.css` controla suas proporções e `src/js/components/mascot.js` acompanha o mouse com amortecimento separado para olhos e cabeça. No celular e em dispositivos de toque, o olhar acompanha a aba de desenvolvimento selecionada, preservando a direção ao rolar a página. A mudança de aba comunica a seleção ao personagem por um evento local; olhos e cabeça fazem a transição suavemente. Com movimento reduzido, a direção é aplicada sem animação. O personagem tem piscadas discretas e suspensão fora da tela, sem botão de pausa. Continua visível sem JavaScript ou Canvas e não carrega recursos externos. A ilustração do circuito permanece em Reestruturação.

## Páginas comerciais

| Rota              | Conteúdo                                         |
| ----------------- | ------------------------------------------------ |
| `/`               | Institucional original                           |
| `/websites`       | Websites profissionais                           |
| `/aplicativos`    | Aplicativos para iOS e Android                   |
| `/sistemas`       | Sistemas, dashboards e BI                        |
| `/ai-solutions`   | Chatbots, agentes e assistentes com IA           |
| `/reestruturacao` | Profissionalização de software e projetos com IA |

Os cinco `index.html` de serviço contêm apenas um identificador de página. O documento, a navegação, o rodapé, os diálogos e o CTA final são montados a partir de fontes compartilhadas. O Vite gera um HTML completo por rota, com metadados próprios e inclusão no sitemap. Desenvolvimento, preview e Nginx atendem os endereços sem barra final.

- `src/content/services/*.json`: narrativa, entregas, processo, condições comerciais e FAQs de cada serviço, extraídos dos templates fornecidos. O campo `source` registra a origem editorial; o build não depende da pasta externa `templates`.
- `src/illustrations/*.html`: demonstrações em HTML/CSS/SVG. Sistemas adapta a estrutura visual do demo do Askora para uma aplicação gerencial genérica, sem marca ou dados do produto.
- `src/styles/services/layout.css`: composição dos títulos, descrições e ações de abertura, com proporções compartilhadas com a institucional.
- `tools/service-editorial.js` e `src/styles/services/editorial.css`: composição editorial compartilhada por Websites, Aplicativos, Sistemas, AI Solutions e Reestruturação, com entregas essenciais, etapas do projeto e continuidade em fundo escuro antes das perguntas frequentes. Os textos ficam nos respectivos arquivos de `src/content/services/`; FAQ, CTA e demonstrações mantêm seus componentes compartilhados.
- `src/styles/services/scenes.css`: estilos e transições das ilustrações.
- `src/styles/services/websites.css`, `src/js/components/web-demo.js` e `src/js/components/web-viewport.js`: showroom com largura ajustada à tela, proporção de página preservada no desktop e altura limitada na visualização mobile. Um único card muda de proporção via animação de geometria. O conteúdo mantém seus elementos e se reorganiza entre desktop e mobile; a sombra acompanha o card. Transição sincronizada entre três sites. A barra da prévia permite pausar e avançar; movimento reduzido e visibilidade interrompem o ciclo automático.
- `src/content/website-showcase.json` e `tools/web-showcase.js`: textos e composição dos exemplos de decoração, gastronomia e serviços. Fotografias locais otimizadas em `public/assets/images/showcase/`, com autoria, origem e licença em `credits.json`.
- `src/styles/services/apps.css` e `src/js/components/app-demo.js`: telefone interativo com navegação interna entre Clientes, Equipe e Gestão; agenda, checklist e aprovações compartilham estado local, reiniciado ao recarregar.
- `src/styles/services/systems.css` e `src/js/components/management-demo.js`: demonstração gerencial com sidebar, dashboard filtrável, solicitações paginadas e sincronização ilustrativa. Concluir solicitações atualiza os indicadores; o estado é local e reinicia ao recarregar a página.
- `src/shared/closing.html`: CTA final compartilhado, com texto específico por página.
- `tools/services.js`: catálogo, metadados e composição dos serviços.
- `tools/html.js`: escape de conteúdo para HTML.
- `tests/e2e/services.spec.js`: rotas, contato contextual, navegação, acessibilidade e interações das cinco páginas.

A paleta vem do projeto Askora atual: `askora_v2/apps/public/src/assets/css/tokens.css` (`--cyan: #00E8F8` e gradiente oficial iniciado em `#00D8F8`). Está centralizada em `src/styles/tokens.css`. Os tons escuros derivados preservam o contraste de textos; os efeitos Canvas leem o mesmo token por `src/js/palette.js`.

O modal compartilhado encaminha o serviço de origem para o formulário em `/contato` pelo parâmetro `interesse`. Os contatos existentes foram preservados. As demonstrações são explicitamente conceituais, sem cases fictícios, e não enviam dados.

Para revisão local em endereço fixo:

```sh
npm run dev -- --port 5173 --strictPort
```

URL: `http://127.0.0.1:5173/`. Capturas locais de revisão, quando geradas, ficam em `docs/review/` (ignorado pelo Git). Nenhuma publicação é necessária para revisar essas páginas.

### AI Solutions: chat e integração

`/ai-solutions` usa o Gemini por meio de `POST /api/ai/chat`, na mesma origem. Vite registra o handler no desenvolvimento e no preview. Em produção, `server/index.js` escuta apenas em `127.0.0.1:3001`, atrás do Nginx. `deploy/start.sh` supervisiona os dois processos no container. O navegador nunca recebe a chave ou o prompt de sistema.

Configure `GEMINI_API_KEY` e `GEMINI_MODEL` em `.env.local` para desenvolvimento, usando `.env.example` como referência, ou nas variáveis privadas do ambiente de produção. Variáveis do processo têm prioridade. A configuração local reaproveita a integração do Prospect; o modelo é configurável, sem troca automática para um modelo pago. A disponibilidade e as cotas são determinadas pelo projeto Google; o site trata HTTP 429 e mantém a opção de contato. Consulte a [referência generateContent](https://ai.google.dev/api/generate-content) e os [limites de uso](https://ai.google.dev/gemini-api/docs/rate-limits).

- `server/ai/prompt.js`: resposta comercial em português, um parágrafo de 2 ou 3 frases, solução, benefícios e convite para falar com a equipe. Não oferece valores, prazos ou resultados garantidos.
- `server/ai/gemini.js`: instrução de sistema separada dos dados do visitante, saída JSON com `reply` e `topic`, validação e normalização do retorno. Não repassa mensagens internas do provedor.
- `server/ai/handler.js`: validação de origem, método, JSON, tamanho e alternância das mensagens; cancelamento ao desconectar; limites de consumo em memória.
- `src/js/ai-topics.js`: categorias permitidas e rótulos do botão. A IA escolhe um ID, não texto HTML ou URLs. Categoria ausente/desconhecida usa “Conversar sobre uma solução”.
- `src/js/components/ai-chat.js`: histórico em memória, cancelamento, nova tentativa e nova conversa. O botão de envio dá lugar ao contato contextual após a resposta. Digitar uma nova pergunta restaura o envio.
- `src/styles/services/ai-solutions.css`: campo com altura constante; conversa posicionada no espaço da abertura, acima do campo, com rolagem e desaparecimento suave no topo. Digitar ou receber mensagens não desloca o campo.

Contrato:

```http
POST /api/ai/chat
Content-Type: application/json

{"messages":[{"role":"user","content":"Quero uma IA pro meu time de vendas"}]}
```

```json
{
  "reply": "Podemos criar um chatbot para qualificar seus contatos. Vamos conversar sobre seu projeto?",
  "topic": "chatbots"
}
```

Categorias: `chatbots`, `agents`, `analysis`, `automation`, `assistants` e `solution`. O botão abre o modal existente com o assunto selecionado. A categoria é tratada separadamente da mensagem, sem exibir JSON ao visitante.

Até cinco rodadas por conversa, com 2.000 caracteres por entrada e 520 por resposta. O prompt pede no máximo 440 caracteres; respostas excessivas ou inválidas geram erro e opção de tentar novamente, sem resposta simulada. Prazo de 18 segundos no provedor e 20 no cliente. Por processo: até 5 requisições/minuto e 30/dia por IP, 15/minuto e 100/dia no total, com três requisições simultâneas. Os limites locais reiniciam com o servidor; uma implantação com múltiplas réplicas exige limitador compartilhado. O Nginx sobrescreve o IP encaminhado e o servidor Node de produção só aceita conexões locais. Mensagens e chaves não são gravadas em logs próprios.

O modo de prévia continua disponível apenas quando o endpoint estiver explicitamente vazio, para revisão offline. Falhas da API configurada nunca ativam respostas de demonstração. A captura institucional permanece uma imagem estática do campo.

`tests/unit/ai-server.test.js` e `tests/unit/ai-chat.test.js` verificam validação, contrato Gemini, limites, falhas e categorias. `tests/e2e/ai-chat.spec.js` usa respostas controladas para testar CTA, modal, posição constante do campo, acessibilidade e cancelamento, sem consumir a cota real.

## Portfólio

`/portifolio` apresenta Askora, Osler Medicina, Gear SEO e AML Reputacional em quatro cards com prints das respectivas landing pages. Fica antes de Contato no menu. Conteúdo em `src/content/portfolio.json`; estrutura e estilos próprios em `src/pages/portifolio.html` e `src/styles/portfolio.css`.

Os três templates de website estão separados em `public/projetos/{osler,gear-seo,aml}/website/`, acessíveis pelos botões “Ver website”. “Ver sistema” fica reservado até a preparação dos templates; o Askora utiliza “Explorar produto” para seu site oficial. Organização, origem e atualização das imagens estão em [docs/PORTFOLIO.md](docs/PORTFOLIO.md).
