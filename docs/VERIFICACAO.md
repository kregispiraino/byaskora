# Validação técnica

A entrega preserva o conteúdo institucional e a composição visual. Foram reorganizados o código e os estilos, corrigido o reaproveitamento indevido do interesse no formulário, melhorados contrastes de textos secundários e preparado o build estático para o Railway. O aviso de privacidade agora descreve o site, em vez de uma prévia.

Resultado da rodada final: **6 testes unitários e 40 testes de navegador aprovados**, além da validação HTTP da imagem Docker, lint, formatação e build.

## Verificações reproduzíveis

`npm run check` executa lint, formatação, testes unitários, build e testes de navegador. `node tools/check-server.js` valida uma imagem Docker já iniciada na porta local 8080. O modelo de integração contínua em `ci-workflow.yml` executa ambos quando ativado; a credencial disponível não autoriza criar workflows no GitHub.

Os testes de navegador cobrem Chromium, Firefox, WebKit e emulação de iPhone. Há verificações de:

- Metadados SEO, canonical, sitemap, robots, imagens, âncoras e IDs únicos.
- Abas por clique, teclado e atalhos do rodapé.
- Campos obrigatórios, e-mail inválido, revisão/edição da mensagem e dados tratados como texto.
- Restauração de foco, Escape, menu móvel e diálogo de privacidade.
- Acessibilidade automatizada na página, nas quatro abas e nas duas etapas do formulário.
- Ausência de transbordamento horizontal em 320, 390, 768, 1024, 1440 e 1920 pixels.
- Redução de movimento, ativação explícita e pausa da animação.
- Alternativas com JavaScript desativado, falha no download do módulo e Canvas indisponível.
- Erros JavaScript e mensagens de erro no console.

As interações automatizadas usam redução de movimento para evitar que animações e rolagem suave interfiram na posição dos cliques. O teste do circuito habilita explicitamente o movimento e verifica a evolução e a parada do relógio da animação.

A validação Docker usa `PORT=9090`, publicada localmente em 8080, para conferir o contrato de porta do Railway. Verifica resposta da página, gzip, cache de arquivos versionados, cabeçalhos de segurança, redirecionamento de `/index.html`, respostas 404 e ausência de arquivos fonte na raiz publicada.

A geometria dos títulos, do circuito, da grade de soluções e do rodapé foi comparada com a versão original em 390 e 1440 pixels, sem diferenças acima de 1 pixel. As capturas também foram inspecionadas visualmente. Os arquivos originais da marca foram preservados.

## Desempenho

A medição Lighthouse local com simulação móvel registrou:

| Categoria      | Nota |
| -------------- | ---: |
| Desempenho     |  100 |
| Acessibilidade |   97 |
| Boas práticas  |  100 |
| SEO            |  100 |

Os valores e a data exata estão em `lighthouse-summary.json`. CLS foi zero após corrigir a troca entre a apresentação estática e a interativa na primeira renderização. O bootstrap é autorizado por hash na CSP e restaura a apresentação estática se o módulo não carregar.

A observação de contraste remanescente do Lighthouse se refere às letras ciano do logotipo original, preservadas por identidade visual. A [WCAG 1.4.3 isenta logotipos do requisito de contraste](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html). O teste axe exclui somente essas letras da medição de contraste; as outras regras continuam sendo aplicadas à página inteira. Os textos secundários e do formulário tiveram contraste corrigido.

## Limites

Resultados locais e automatizados não garantem ausência de falhas em todo dispositivo ou rede. WebKit e emulação de iPhone não substituem testes em aparelhos físicos; a auditoria automatizada não equivale a certificação completa de acessibilidade. Não houve entrega real de mensagens nem validação do domínio no Railway, DNS, certificado, indexação pelo Google ou disponibilidade de todos os serviços externos. Essas conferências dependem da criação do projeto e da ativação do domínio.

Relatórios em `archive/` pertencem às versões anteriores e não substituem esta validação.
