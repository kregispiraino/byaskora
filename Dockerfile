FROM node:24-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY index.html vite.config.js ./
COPY src ./src
COPY public ./public
COPY tools ./tools
ARG SITE_MODE=production
RUN npm run build -- --mode "$SITE_MODE"

FROM nginx:stable-alpine AS runtime
ENV PORT=8080
COPY deploy/default.conf.template /etc/nginx/templates/default.conf.template
COPY --from=build /app/dist/ /usr/share/nginx/html/
RUN mv /usr/share/nginx/html/_nginx-headers.conf /etc/nginx/security-headers.conf
EXPOSE 8080
CMD ["nginx", "-g", "daemon off;"]
