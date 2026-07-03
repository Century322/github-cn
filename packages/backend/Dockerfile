FROM node:20-slim

RUN corepack enable && corepack prepare pnpm@9 --activate

WORKDIR /app

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY packages/shared/package.json packages/shared/
COPY packages/backend/package.json packages/backend/

RUN pnpm install --frozen-lockfile

COPY packages/shared/ packages/shared/
COPY packages/backend/ packages/backend/

RUN pnpm --filter shared build && pnpm --filter backend build

EXPOSE 10000

CMD ["node", "packages/backend/dist/server.cjs"]
