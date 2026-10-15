# Portfólio e templates dos projetos

A página `/portifolio` apresenta quatro projetos, sem a estrutura comercial das landing pages. O item fica antes de Contato no menu compartilhado.

## Conteúdo e apresentação

- `src/content/portfolio.json`: nomes, textos, imagens e destinos de cada projeto.
- `src/pages/portifolio.html`: abertura, galeria e encerramento.
- `tools/portfolio.js`: renderização dos quatro cards no build.
- `src/styles/portfolio.css`: layout exclusivo do portfólio.
- `public/assets/images/portfolio/`: prints das landing pages, sem iframes ou vídeos no portfólio.

O Askora aponta diretamente para `https://askora.com.br/` com “Explorar produto”. Nos demais projetos, “Ver website” abre a apresentação local. Na Osler, `system: null` mantém “Ver sistema” desabilitado, sem aviso de disponibilidade na página. AML e Gear usam `system: false` para omitir essa ação. Quando o template do sistema estiver pronto, use seu caminho local nesse campo para emitir um link. A ordem dos cards é Askora, Osler, AML e Gear; no desktop, AML fica à esquerda da Gear.

## Templates independentes

| Projeto          | Pasta editável                      | URL                           |
| ---------------- | ----------------------------------- | ----------------------------- |
| Osler Medicina   | `public/projetos/osler/website/`    | `/projetos/osler/website/`    |
| Gear SEO         | `public/projetos/gear-seo/website/` | `/projetos/gear-seo/website/` |
| AML Reputacional | `public/projetos/aml/website/`      | `/projetos/aml/website/`      |

Os arquivos vieram de `Project - sub4sites/Websites/`, respectivamente: `Osler Medicina - valiant-ambition`, `Gear SEO - vigilant-growth` e `aml_landing_fullscreen_v6_brand`. Os originais permanecem intactos. A cópia da AML inclui a landing principal e seus recursos; não inclui o portfólio independente de produção audiovisual, seus vídeos brutos ou histórico Git.

Cada pasta contém HTML, CSS, JavaScript e os recursos próprios. Os futuros sistemas podem ficar em `public/projetos/{projeto}/sistema/`, sem misturar as implementações. Osler, AML e Gear SEO já foram revisadas e participam das verificações de formatação e lint.

Adaptações de integração: metatag `noindex,nofollow`, retorno discreto ao portfólio em `public/projetos/shared/`, bloqueio de envio dos formulários demonstrativos, script inline da AML extraído para arquivo local e remoção da chamada externa de fontes da Gear para compatibilidade com a política de segurança. O vídeo de fundo da Gear foi comprimido para 1280px, sem áudio, mantendo o original no projeto de origem.

## Atualização das imagens

Com Chromium do Playwright e `cwebp` instalados:

```sh
node tools/capture-portfolio.js
```

A captura da AML usa o quadro de 8,5 segundos do vídeo de abertura, com o controle “Pausar animações” visível.

O comando atualiza os três websites locais. Para atualizar também o Askora, passe o caminho de sua pasta pública já construída:

```sh
node tools/capture-portfolio.js '/caminho/Project - Askora/askora_v2/apps/public/frontend'
```

O script usa exclusivamente a landing pública local, intercepta suas requisições e bloqueia acessos externos. Não acessa contas, sistemas autenticados, APIs de produção ou analytics. Os quatro prints têm o mesmo enquadramento de 1280 × 800px.

## Revisão da Osler

O template mantém sua paleta bordô, papel creme e tipografia serifada. O menu foi reunido em um card de vidro expansível, com acesso por teclado, fechamento por Escape/clique externo e links de seção fora da ordem de foco quando fechado. Sem JavaScript, os links continuam visíveis.

O enquadramento da foto é feito no CSS, sem alterar os arquivos de imagem: `.hero-image` controla zoom e deslocamento no desktop; a regra mobile define o ponto de atenção no retrato. A grade de residência ocupa todas as colunas e a jornada usa uma linha contínua. As animações são progressivas: o conteúdo é visível por padrão, respeita movimento reduzido e só recebe efeitos após a inicialização do observador.

`tests/e2e/osler.spec.js` verifica menu, foco, navegação, acessibilidade, responsividade, animação e falha do script. Para atualizar apenas a imagem da Osler no portfólio:

```sh
node tools/capture-portfolio.js --project=osler
```

## Revisão da AML

A apresentação mantém o vídeo de abertura, o roxo da marca e a alternância de seções claras e escuras. O cabeçalho usa apenas a marca e links em texto, inclusive no mobile; a curva da primeira tela foi removida. Cards de soluções passam de uma a duas e quatro colunas conforme o espaço disponível. Links sem destino foram removidos. O contato usa uma composição integrada ao fundo escuro: canais diretos à esquerda e formulário em duas colunas à direita, empilhados no mobile. O seletor de soluções usa um botão de expansão e opções nativas de rádio, com seleção, Escape e retorno de foco; nome, e-mail e empresa têm validação. A mensagem é opcional. Após a validação, o formulário exibe uma confirmação local e permite preencher novamente; não envia nem armazena dados. O atributo `data-preview-custom` mantém o bloqueio global de envio e delega a confirmação visual ao script da AML. No mobile, a confirmação ocupa apenas o espaço necessário e recebe enquadramento automático; o retorno ao portfólio fica no rodapé para não cobrir campos. O seletor calcula direção e altura usando a área visível, inclusive com alterações de orientação e do teclado.

Os segmentos estão no HTML para permanecerem disponíveis sem JavaScript. O script adiciona uma cópia inacessível a leitores de tela apenas para a continuidade visual do carrossel. Com movimento reduzido, a lista pode ser explorada por rolagem horizontal. Vídeo e faixas animadas respeitam a preferência de movimento e a economia de dados; o vídeo só carrega ao entrar em tela e pausa quando sai ou quando a aba fica oculta. Controles de pausa ficam na abertura e junto aos segmentos.

`tests/e2e/aml.spec.js` cobre navegação, responsividade, contraste, formulário demonstrativo, carregamento condicional do vídeo, pausa, contadores e conteúdo sem o script. Para atualizar apenas seu print:

```sh
node tools/capture-portfolio.js --project=aml
```

## Revisão da Gear SEO

A abertura mantém o vídeo, o azul da marca e os botões arredondados, com título e descrição alinhados à esquerda. A tipografia usa fontes locais, pesos moderados e mais espaço entre letras e linhas. A composição distribui conteúdo e métricas em fluxo normal, evitando sobreposição. Cards, etapas e indicadores compartilham espaçamentos e bordas mais discretos.

O menu mobile controla foco e links inativos, fecha por Escape ou clique externo e preserva navegação sem JavaScript. A apresentação pessoal usa um popup flutuante que se expande no próprio card, com controles de reprodução e progresso. Pode ser minimizado e restaurado pelo botão no canto; no mobile, suas dimensões respeitam a área visível. O retorno ao portfólio fica no rodapé no mobile. O player usa `presentation.mp4`, uma versão H.264/AAC reduzida do original. O preview roda sem áudio e respeita movimento reduzido e economia de dados; a expansão por clique inicia a apresentação com áudio. Minimizar pausa o vídeo. Os posters locais evitam quadros vazios. O print do portfólio inclui o popup compacto. O vídeo de fundo respeita movimento reduzido e economia de dados, pausa fora de tela e oferece controle manual.

`tests/e2e/gear.spec.js` cobre tipografia e dimensões, navegação por teclado, acessibilidade, player em duas orientações, carregamento de mídia e conteúdo sem o script. Para atualizar apenas seu print:

```sh
node tools/capture-portfolio.js --project=gear-seo
```
