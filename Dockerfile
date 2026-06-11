# Etape 1: Build Angular
FROM node:20-alpine AS build
WORKDIR /app

# Installer les dépendances
COPY package*.json ./
RUN npm install

# Copier le code et build
COPY . .
RUN npm run build -- --configuration=production

# Etape 2: Nginx
FROM nginx:alpine

# Copier le build Angular
COPY --from=build /app/dist/facturation-front/browser /usr/share/nginx/html

# Copier la config Nginx custom
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]