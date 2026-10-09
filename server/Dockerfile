FROM node:20-alpine
WORKDIR /app
# heif-convert, used to turn HEIC uploads into JPEGs the browser can show
RUN apk add --no-cache libheif-tools
COPY . .
ENV PORT=8080
EXPOSE 8080
CMD ["node", "server/server.js"]
