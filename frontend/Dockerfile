# ===== Etapa 1: construir la app de React =====
FROM node:22-slim AS build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# ===== Etapa 2: servir los archivos con Nginx =====
FROM nginx:alpine
# Copiamos SOLO el resultado (dist) de la etapa anterior
COPY --from=build /app/dist /usr/share/nginx/html
# Nuestra config de Nginx
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80