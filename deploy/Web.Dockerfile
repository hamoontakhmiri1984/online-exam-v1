FROM node:22-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
COPY client/package.json client/package.json
COPY server/package.json server/package.json
RUN npm ci --workspace client --ignore-scripts
COPY client/ client/
ENV VITE_API_BASE_URL=/api
ENV VITE_SOCKET_URL=
ARG VITE_GOOGLE_CLIENT_ID=
RUN npm run build -w client

FROM nginx:stable-alpine
COPY deploy/nginx.production.conf /etc/nginx/nginx.conf
COPY --from=build /app/client/dist /usr/share/nginx/html
USER nginx
EXPOSE 8080 8443
ENTRYPOINT ["nginx", "-g", "daemon off;"]
