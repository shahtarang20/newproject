# @vastra/api

Express + TypeScript + Mongoose API (CommonJS, `@/` alias = `src/`).

```bash
cp .env.example .env        # repo root; set JWT_SECRET / JWT_REFRESH_SECRET (required in production)
npm run dev:api             # tsx watch, http://localhost:4000/api/health
npm run build -w @vastra/api && npm run start -w @vastra/api
npm run seed                # stub until phase C
```

Requires MongoDB (`MONGODB_URI`). Local uploads are written to `apps/api/uploads` and served at `/uploads`.
Conventions: see `docs/ARCHITECTURE.md`; schema reference: `docs/DATA_MODEL.md`.
