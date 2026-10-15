# Revisão multipágina — 15/10/2026

Implementação local baseada no `prompt.md` do workspace. Nenhuma publicação realizada.

## Resultado

- Institucional preservado; navegação atualizada e CTA extraído para componente compartilhado.
- Rotas `/websites`, `/aplicativos`, `/sistemas` e `/reestruturacao` com HTML estático, metadados individuais, dados estruturados de serviço e sitemap.
- Conteúdo separado em `src/content/services/`, cenas em `src/illustrations/`, estilos em `src/styles/services/` e interações em `src/js/components/service-scenes.js`.
- Paleta oficial confirmada no Askora atual: `askora_v2/apps/public/src/assets/css/tokens.css`. Ciano `#00E8F8`, gradiente com base `#00D8F8`; variações para contraste centralizadas nos tokens.
- Header, rodapé, formulário, botões, tipografia, espaçamentos e CTA final compartilhados.
- Conteúdo comercial, processo, condições de contratação e FAQs derivados dos quatro templates. Cases do Askora substituídos por explicações de capacidade e demonstrações conceituais, sem resultados comerciais inventados.
- Websites: mudança de viewport e inspeção de grid. Aplicativos: três cenários e navegação para o próximo passo. Sistemas: filtro por área, rotina e critérios de cálculo. Reestruturação: comparação interativa da organização do software.
- Contato contextual preserva o fluxo de revisão da mensagem e os canais reais existentes.

## Validação executada

`npm run check` concluído com sucesso:

- ESLint e Prettier aprovados.
- 6 testes unitários aprovados.
- Build de produção aprovado, com cinco documentos HTML.
- 64 testes E2E aprovados em Chromium, Firefox, WebKit e emulação de iPhone.
- Rotas e links internos, metadados, página ativa, unicidade de IDs e âncoras.
- Formulário, mensagem com serviço de origem, teclado, menu mobile e retorno de foco.
- Interações das quatro cenas com movimento reduzido.
- Auditorias Axe de acessibilidade, incluindo contraste fora do logotipo.
- Ausência de overflow horizontal nas larguras testadas, de 320 a 1920 px.
- Conteúdo e contato disponíveis sem JavaScript; fallbacks existentes do institucional preservados.
- Sem erros de console nos cenários cobertos.

Capturas desktop e mobile foram revisadas visualmente e estão em `docs/review/`, ignorado pelo Git. O relatório automatizado está em `playwright-report/index.html`, também ignorado.

As cinco rotas responderam HTTP 200 no servidor de desenvolvimento, em `http://127.0.0.1:5173/`. O servidor foi mantido em execução para revisão.

## Limites da validação

O Docker está instalado, mas o daemon local estava indisponível. A imagem Nginx não foi executada nesta revisão. O build estático e o servidor de preview foram testados; o ajuste de rotas na configuração de produção está preparado para uma futura validação de implantação. Não houve envio real de mensagens, publicação ou alteração de infraestrutura.
