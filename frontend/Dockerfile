FROM node:20-alpine AS deps

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN mkdir -p public/images

ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

RUN npm run build


FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

COPY package*.json ./
RUN npm ci --omit=dev

COPY --from=deps /app/.next ./.next
COPY --from=deps /app/public ./public
COPY --from=deps /app/next.config.js ./next.config.js

EXPOSE 3000

CMD ["npm", "run", "start"]