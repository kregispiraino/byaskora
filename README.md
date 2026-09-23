# ByAskora

Site institucional de desenvolvimento web, preparado para `https://byaskora.com/` e hospedagem no Railway. HTML estático gerado no build, CSS e JavaScript em módulos, sem framework no navegador, CDN, fontes externas ou backend de formulário.

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
- `src/sections/`: conteúdo, na ordem dos nomes dos arquivos.
- `src/shared/`: navegação, rodapé, diálogos e ícones.
- `src/js/components/`: navegação, abas, diálogos, contato e animações.
- `src/js/contact-message.js`: validação e composição da mensagem, sem acesso ao DOM.
- `src/styles/`: estilos por responsabilidade e alternativas sem JavaScript.
- `src/site.json`: domínio, identidade e canais públicos. Não coloque segredos aqui.
- `public/assets/images/`: imagens originais da identidade visual.
- `tools/`: montagem do HTML, SEO e cabeçalhos de segurança.
- `tests/`: testes unitários e testes de navegador.
- `deploy/`, `Dockerfile`, `railway.toml`: servidor de produção no Railway.
- `docs/archive/`: histórico e prévias anteriores; não são evidência da versão atual e não entram na imagem de produção.

Edite as fontes e execute o build. Não edite `dist/`. Marcadores desconhecidos e ícones inexistentes interrompem o build. O conteúdo completo é renderizado no HTML e pode ser lido sem executar JavaScript.

## Qualidade

```sh
npx playwright install chromium firefox webkit
npm run check
```

O comando executa lint, formatação, testes unitários, build e testes em Chromium, Firefox, WebKit e emulação de iPhone. O modelo de integração contínua em `docs/ci-workflow.yml` repete esses controles. Os testes verificam SEO, recursos locais, links internos, formulário, teclado, redução de movimento, acessibilidade automatizada, larguras de 320 a 1920 pixels e alternativas sem JavaScript/Canvas. Use `npm run format` para formatar as fontes.

## Ativação da integração contínua

A credencial GitHub usada no envio permite publicar o código, mas não criar arquivos em `.github/workflows/` (falta o escopo `workflow`). Por isso, o workflow validado está salvo como modelo em `docs/ci-workflow.yml` e **ainda não está ativo**.

Para ativá-lo, crie `.github/workflows/ci.yml` com o conteúdo desse modelo pelo editor do GitHub, usando uma conta com permissão, ou publique esse arquivo com uma credencial que permita alterar workflows. A automação executa a validação do código, os testes nos navegadores e o build/teste HTTP do Docker a cada push ou pull request. Até ativar, rode `npm run check` antes de publicar.

## Publicação no Railway

1. Crie um serviço conectado ao repositório `kregispiraino/byaskora`, branch `main`.
2. Mantenha a raiz do repositório como diretório do serviço. `railway.toml` seleciona o Dockerfile automaticamente; não configure um comando de início adicional.
3. O build executa `npm ci` e `npm run build`. A imagem final serve apenas `dist/` com Nginx, escuta em `0.0.0.0:$PORT` e responde ao healthcheck `/`.
4. Adicione `byaskora.com` em **Networking → Custom Domain** e configure os registros DNS exatamente como o Railway informar. Ative/confira o HTTPS antes de divulgar o site.
5. Confira a página, `/robots.txt`, `/sitemap.xml` e o formulário no domínio final. Cadastre o sitemap no Google Search Console quando o domínio estiver ativo.

O domínio canônico já está configurado. Se adicionar `www`, configure redirecionamento permanente para `https://byaskora.com/` no provedor. Endereços de teste não devem ser divulgados nem enviados ao Search Console.

Para um ambiente de prévia no Railway, defina `SITE_MODE=preview` antes do build. O argumento Docker com esse nome faz o Vite gerar `noindex,nofollow` e `Disallow: /`. Produção usa `SITE_MODE=production` (padrão). A ausência de indexação de uma prévia não é controle de acesso.

Para testar a imagem localmente:

```sh
docker build -t byaskora .
docker run --rm -p 8080:8080 -e PORT=8080 byaskora
```

O Nginx aplica compressão gzip, cache longo somente aos scripts/estilos com nome versionado e revalidação do HTML. Respostas incluem CSP, proteção contra incorporação em frames, `nosniff`, política de referência e HSTS. `npm run preview` é apenas ferramenta local; produção usa Nginx.

## Contato e privacidade

O formulário valida e prepara a mensagem localmente. A pessoa revisa o texto e confirma o envio no aplicativo de e-mail ou no WhatsApp. Não há envio automático, banco de dados, cookies de rastreamento nem persistência dos campos. O link comercial do WhatsApp foi preservado; a mensagem precisa ser copiada para a conversa. Um envio por `mailto:` depende de um cliente de e-mail configurado.

Ao adicionar um backend no futuro, implemente validação no servidor, proteção contra abuso, resposta de entrega real e atualização do aviso de privacidade. O servidor de hospedagem pode registrar acessos independentemente do formulário.

Referências de implantação: [Dockerfiles no Railway](https://docs.railway.com/builds/dockerfiles), [healthchecks e PORT](https://docs.railway.com/deployments/healthchecks), [build estático do Vite](https://vite.dev/guide/build) e [dados estruturados de organização](https://developers.google.com/search/docs/appearance/structured-data/organization).
