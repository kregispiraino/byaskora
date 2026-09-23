# Verificação da versão 1.9

157 verificações passaram; 0 falhas. Resultados em `QA-V1.9.json`. Relatórios antigos são históricos e não se referem à apresentação atual do circuito.

Conferidos fundo efetivamente transparente, ausência de borda, raio, sombra e pseudoelementos de painel, transparência do canto do canvas e ausência de transbordamento em 320, 390, 768, 1440 e 1920 px. Inspeção visual da cena em desktop e celular, desligada e ligada.

Exercitados ativação pelo teclado, transição completa, movimento contínuo após a transição, pulso ao clicar, pausa e retomada, desligamento, pausa automática fora da tela, retorno à cena, redução de movimento, formulário e abas de serviços. Nenhum erro JavaScript observado.

Preservação comparada ao ZIP v1.8: todas as fontes HTML e todos os recursos de implementação, exceto `signal-scene.css` e `signal-scene.js`. Prévias e documentação foram atualizadas. O build foi executado novamente; referências locais e âncoras foram verificadas.

## Limites

Chromium com HTML e recursos locais incorporados em memória, sem alteração de políticas do navegador e sem requisições externas. Não foram testados Safari, Firefox, abertura `file://` neste ambiente, publicação remota, envio de mensagens ou disponibilidade de canais sociais. Nada foi publicado. A prévia continua com `noindex,nofollow`.
