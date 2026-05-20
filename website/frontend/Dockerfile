FROM node:26-alpine

WORKDIR /app

RUN npm install -g pnpm

COPY package.json pnpm-lock.yaml* pnpm-workspace.yaml* ./

RUN pnpm config set node-linker hoisted
RUN pnpm install

COPY . .

ARG NODE_ENV=development
RUN if [ "$NODE_ENV" = "production" ]; then pnpm build; fi

EXPOSE 3000

CMD if [ "$NODE_ENV" = "production" ]; then pnpm start; else pnpm dev; fi