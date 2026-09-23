# Integração da landing ByAskora

## Fonte e escopo

A versão 1.9 parte de `byaskora-landing-v1.8-sem-card-preto.zip`. Corrige o fundo da cena animada, sem modificar o conteúdo institucional aprovado na v1.7 ou as demais seções. Continua sendo uma única landing, sem páginas separadas de institucional ou portfólio.

Não adicionar projetos, logotipos, nomes, telas ou resultados de clientes sem nova aprovação. As interfaces pequenas da seção de serviços são exemplos genéricos e seus números são fictícios. Não representam clientes nem um produto pronto.

## Build

Edite `src/sections/*.html` e `src/shared/*.html`, não apenas o HTML compilado. Rode:

```sh
python3 tools/build.py
```

O script monta `index.html` e `assets/js/config.js`. `src/site.json` é a fonte dos contatos. Marcadores `{{icon:nome}}` referenciam a sprite de ícones local. Não é necessário Node, bundler ou biblioteca de interface.

## Identidade

Use o ciano exato `#1fe1e7` no “by” da assinatura e na interação dos pontos. `--blue` permanece como alias de compatibilidade, agora com o mesmo valor ciano. `--blue-dark` é um tom mais escuro para foco e legibilidade de controles sobre o fundo claro, não uma substituição da cor da marca.

A base tipográfica continua no arquivo compartilhado, com família Inter e fallbacks do sistema, sem arquivos de fonte ou CDN. A marca preta é o arquivo original. O uso editorial é “o Askora”, “do Askora”, “pelo Askora”, “o ByAskora” e “do ByAskora”. Não reintroduzir “a ByAskora”, “na ByAskora” ou “da Askora” nas referências à marca. ByAskora é a frente de desenvolvimento; Askora LTDA permanece como identificação jurídica.

A área de contato reutiliza a composição centralizada do CTA de referência do Askora, sem os rótulos superiores. O centro permanece claro para a leitura e o degradê grafite fica nas bordas inferiores.

## Institucional e manutenção

O institucional é dedicado ao ByAskora e a demandas que não são atendidas por sistemas prontos. O conteúdo atual está em `src/sections/05-institutional.html`. Não reutilizar “Somos a ByAskora” nem o texto anterior centrado no SPM.

A marca fica diretamente sobre o fundo da página, sem cartão, preenchimento, contorno ou sombra. No desktop, uma linha vertical a separa do texto; no celular, essa linha desaparece. Restauradas as legendas originais “MESMA ORIGEM. OUTRA FRENTE.” e “DESENVOLVIMENTO SOB MEDIDA”. Esses textos pertencem à composição da marca, não são rótulos de seção. Preservar o ciano e a proporção do símbolo.

O link abre o mesmo formulário de projeto das demais chamadas. Não alterar o circuito, o contato ou as outras seções durante ajustes no institucional.

A seção `#continuidade` usa `#141718`, o mesmo fundo de `#como-trabalhamos`. Seu conteúdo não mudou: projeto, manutenção recorrente e a observação sobre novas funcionalidades. Preservar o contraste de textos, ícones e divisórias; o modo de impressão retorna ao fundo branco com texto escuro.

## Circuito aprovado: não redesenhar

A composição e a lógica da animação aprovada foram preservadas. Na v1.9, os arquivos `assets/css/signal-scene.css` e `assets/js/signal-scene.js` foram ajustados somente para exibir o circuito diretamente sobre o fundo da página: superfície e pseudoelementos transparentes, remoção da textura exclusiva do antigo painel e de suas marcas de canto, contraste de fios e fragmentos, sombras de contato mais leves e botão de pausa legível no fundo claro. As peças continuam grafite.

A causa da falha anterior era a especificidade de `.hero-stage.signal-stage`, carregada depois de `landing.css`. Alterar apenas `.hero-stage` não removia seu fundo. Não reintroduzir fundo, borda, raio, sombra ou vinheta nesse seletor. A textura agora pertence somente a `hero-dots.css`, compartilhada com a abertura.

Preservar ativação pelo símbolo, montagem das conexões, circulação contínua, pulso adicional, pausa, comportamento vertical no celular, pausa fora da tela e redução de movimento. A revisão dos textos e das seções não deve reconstruir esse componente.

## Contato sob demanda

Links com `data-open-project` abrem `#project-dialog`. Um atributo opcional `data-interest` preenche o assunto interno, sem acrescentar um campo à tela. O formulário tem três campos obrigatórios (nome, e-mail e descrição) e empresa opcional. O assunto é um input oculto.

O mesmo diálogo contém o formulário e a revisão da mensagem, sem empilhar modais. Escape, clique fora e botão de fechar encerram o diálogo. O foco retorna à chamada original, ou ao botão do menu quando necessário no celular. Campos preenchidos permanecem apenas na memória da página durante a visita.

Esta prévia não envia mensagens para backend. Depois da validação, o texto é mostrado para revisão e transformado em link `mailto:`; também pode ser copiado. O link de WhatsApp é exatamente o canal herdado do Askora. Por ser um link de mensagem comercial, não presumir suporte a um parâmetro `text` nem fabricar um número de destino. O visitante copia a mensagem e envia na conversa.

Ao conectar um backend, implementar validação no servidor, limites de envio, prevenção de abuso e respostas reais. Não substituir a etapa atual por uma mensagem de sucesso sem confirmar a entrega. Revisar o aviso de privacidade conforme o funcionamento efetivamente implantado.

## Canais e navegação

O menu tem Institucional, Askora e Contato. Institucional leva à seção da landing; Askora é um link externo; Contato abre o diálogo. O botão secundário do hero leva aos serviços. Não há Projetos nem referências escondidas a clientes.

Instagram, LinkedIn, YouTube, Facebook e WhatsApp são os canais do Askora recuperados da landing aprovada. Estão centralizados em `src/site.json`. Não foram criados perfis ByAskora. Os endereços foram preservados do arquivo de referência, sem verificação de disponibilidade em produção nesta etapa.

## Publicação

Esta entrega não publica o site. Mantém `noindex,nofollow` e `robots.txt` de prévia. Na implantação aprovada, revisar domínio, HTTPS, canonical, URLs absolutas de Open Graph, metadados, robots, sitemap e política institucional. Não inventar datas de publicação ou estatísticas de clientes.

Os testes desta revisão usaram Chromium com o documento e seus recursos locais incorporados em memória, além de conferência dos caminhos no pacote. Foram verificadas larguras de 320, 390, 768, 1440 e 1920 px. Não houve publicação, requisições externas nem envio de mensagens. Não se afirma validação de produção, de abertura `file://` neste ambiente, de Safari ou de Firefox.
