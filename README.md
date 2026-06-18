# Deusa Analytics

Plataforma interna de inteligência comercial B2B para a Deusa Alimentos.

## Estrutura

```text
deusa-analytics/
  frontend/          # React + Vite + TypeScript
  backend/           # NestJS + Prisma + PostgreSQL
  docker-compose.yml # PostgreSQL local
  README.md
```

## Banco local

O PostgreSQL local usa a porta `5435` no host para evitar conflito com outros bancos já ativos na máquina.

```bash
docker compose up -d
```

## Frontend

```bash
cd frontend
npm install
npm run dev
```

## Backend

Veja [backend/README.md](backend/README.md).
