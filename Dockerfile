# Frontend image — build the Vite SPA, serve it with nginx, proxy /api -> backend.
# model/ is a submodule that must be present (file:./model).
FROM node:22-slim AS build
WORKDIR /app
COPY package*.json ./
COPY model/ ./model/
RUN npm install
COPY . .
RUN npm run build

FROM nginx:alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
