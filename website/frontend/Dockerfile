FROM node:26-alpine

WORKDIR /app

ENV CI=true
ENV CONFIRM_MODULES_PURGE=false
ENV PNPM_CONFIRM_MODULES_PURGE=false

RUN npm install -g pnpm

COPY package.json pnpm-lock.yaml* pnpm-workspace.yaml* .npmrc* ./

RUN pnpm install --ignore-scripts --no-frozen-lockfile

COPY . .

ARG NODE_ENV=development
RUN if [ "$NODE_ENV" = "production" ]; then pnpm build; fi

EXPOSE 3000

CMD if [ "$NODE_ENV" = "production" ]; then pnpm start; else npx next dev --webpack; fi
