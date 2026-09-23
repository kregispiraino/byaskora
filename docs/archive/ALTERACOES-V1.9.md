# v1.9 · Circuito integrado à página

A v1.8 alterou o seletor genérico `.hero-stage`. O seletor mais específico `.hero-stage.signal-stage` continuou desenhando o painel preto. Esta revisão corrige a origem efetiva do fundo.

## Alterações

Em `assets/css/signal-scene.css`: fundo transparente; borda, raio e sombra externos removidos; pseudoelementos de fundo eliminados; sombras das peças ajustadas ao fundo claro; controle de pausa com contraste adequado. A regra mobile também não cria painel.

Em `assets/js/signal-scene.js`: a camada de fundo do canvas permanece transparente, sem textura de placa e marcas de canto; fios, fragmentos e sombras foram ajustados para legibilidade sobre a página. Tempos, trajetórias, estados, montagem, movimento contínuo e controles foram preservados.

Sem alterações nos textos, contatos, cabeçalho, rodapé, institucional, manutenção, formulário ou pontos interativos da abertura. Não há publicação no domínio.

## Evidência

Prévias de desktop e celular atualizadas no pacote. Conferido no navegador: fundo transparente, sem borda/raio/sombra e sem pseudoelementos em 320, 390, 768, 1440 e 1920 px; pixels de canto do canvas com alfa zero. Ativação, fluxo contínuo, pulso, pausa, retorno, desligamento, redução de movimento e pausa fora da tela exercitados. Detalhes em `QA-V1.9.json`.
