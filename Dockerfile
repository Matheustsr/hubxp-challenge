FROM node:20-alpine

WORKDIR /usr/src/app

# Copiar package files primeiro para aproveitar cache do Docker
COPY package*.json ./

# Instalar todas as dependências (incluindo devDependencies para build)
RUN npm ci

# Copiar código fonte
COPY . .

# Build da aplicação
RUN npm run build

# Remover devDependencies após build
RUN npm prune --production

# Usar porta dinâmica do Heroku
EXPOSE $PORT

# Comando para iniciar a aplicação
CMD ["npm", "start"]
