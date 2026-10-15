FROM node:24-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY index.html vite.config.js ./
COPY src ./src
COPY public ./public
COPY tools ./tools
COPY websites ./websites
COPY aplicativos ./aplicativos
COPY sistemas ./sistemas
COPY ai-solutions ./ai-solutions
COPY server ./server
COPY reestruturacao ./reestruturacao
COPY contato ./contato
COPY portifolio ./portifolio
ARG SITE_MODE=production
ARG VITE_CONTACT_ENDPOINT=/api/contact
ENV VITE_CONTACT_ENDPOINT=${VITE_CONTACT_ENDPOINT}
RUN npm run build -- --mode "$SITE_MODE"

FROM nginx:stable-alpine AS runtime
RUN apk add --no-cache nodejs
WORKDIR /app
COPY package.json ./
COPY server ./server
COPY src/js/ai-topics.js ./src/js/ai-topics.js
COPY deploy/start.sh ./deploy/start.sh
ENV PORT=8080
COPY deploy/default.conf.template /etc/nginx/templates/default.conf.template
COPY --from=build /app/dist/ /usr/share/nginx/html/
RUN mv /usr/share/nginx/html/_nginx-headers.conf /etc/nginx/security-headers.conf
EXPOSE 8080
ENTRYPOINT ["/app/deploy/start.sh"]
