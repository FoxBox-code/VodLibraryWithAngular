FROM node:20 AS build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . . 
RUN npm run build -- --configuration production
FROM nginx:stable-alpine
COPY --from=build /app/dist/vodlibrarywithangular.client/browser /usr/share/nginx/html
EXPOSE 80

