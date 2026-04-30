# ShareNova

## Overview

ShareNova is a full-stack code and file sharing platform. Users can share code snippets with Monaco Editor or upload files, generate a unique 6-character shareable URL, and let others view/download the content.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **Frontend**: React + Vite (artifacts/sharenova) at `/`
- **API framework**: Express 5 (artifacts/api-server) at `/api`
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)
- **Code editor**: Monaco Editor (`@monaco-editor/react`)
- **File uploads**: Multer (stored in `artifacts/api-server/uploads/`)
- **IDs**: nanoid (6 characters)

## Features

- Code sharing with Monaco editor, language selector, syntax highlighting
- File sharing with drag-and-drop, multiple files, up to 50MB per file
- Unique 6-char shareable URLs (e.g. `/abc123`)
- Share view page with read-only Monaco editor for code
- File download support
- Expiry options: 1h / 24h / permanent
- View counter
- Delete shares
- Platform stats (total shares, views, top languages)
- Recent shares list

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)

## Routes

### API (artifacts/api-server)
- `POST /api/share/code` — create code share
- `POST /api/share/files` — create file share (multipart)
- `GET /api/share/recent` — list recent 20 shares
- `GET /api/share/stats` — platform stats
- `GET /api/share/:id` — get share by ID (increments view count)
- `DELETE /api/share/:id` — delete share

### Frontend (artifacts/sharenova)
- `/` — home page (code editor + file uploader + stats + recent)
- `/:id` — share view page

## Database Schema

Table: `shares`
- `id` (text, PK) — 6-char nanoid
- `type` (code | file)
- `content` (text, nullable) — code text
- `language` (text, nullable)
- `title` (text, nullable)
- `files` (jsonb, nullable) — array of { name, size, mimeType, url }
- `view_count` (integer, default 0)
- `created_at` (timestamp)
- `expires_at` (timestamp, nullable)

## File Storage

Uploaded files are stored in `artifacts/api-server/uploads/` and served at `/api/uploads/:filename`.

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
