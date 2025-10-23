# Repository Guidelines

## Project Structure & Module Organization
- `src/` TypeScript source: `server.ts` (Express API + Socket.IO), `crawler.ts` (Playwright crawling), `auditor.ts` / `auditor-enhanced.ts` (axe-core audits), `pdf-generator-*.ts`, `types.ts`, and `utils/` (`validation.ts`, `logger.ts`).
- `public/` Static UI served by Express.
- `dist/` Compiled JS output (tsc). Do not edit by hand.
- `reports/` Generated PDFs (gitignored). Created at runtime.
- Config: `.env` (local), `.env.example`, `tsconfig.json`, `Dockerfile`, `docker-compose.yml`.

## Build, Test, and Development Commands
- Install: `npm install && npx playwright install chromium`
- Dev server (watch): `npm run dev` (tsx, runs `src/server.ts`).
- Build: `npm run build` (tsc → `dist/`).
- Start (production): `npm start` (runs `dist/server.js`).
- Smoke tests: after build, `node test-timeout.js` or `node test-auditor-fix.js`.
- API check: `curl -X POST http://localhost:3000/api/audit -H 'Content-Type: application/json' -d '{"url":"https://example.com","maxPages":5}'`.
- Docker: `docker build -t wcag-audit-tool . && docker run -p 3000:3000 -v $(pwd)/reports:/app/reports wcag-audit-tool`.

## Coding Style & Naming Conventions
- Language: TypeScript (strict). Target ES2022, CJS modules.
- Indentation 2 spaces; single quotes; semicolons; trailing commas OK.
- File names: kebab-case (e.g., `pdf-generator-executive.ts`).
- Names: PascalCase for classes/types; camelCase for variables/functions; UPPER_SNAKE_CASE for env keys only.
- Keep types narrow; prefer named exports; avoid unnecessary new deps.

## Testing Guidelines
- No formal runner configured yet (`npm test` is a placeholder).
- Place new tests under `src/**/*.spec.ts` or `src/**/*.test.ts` if adding Jest/Vitest; favor small unit tests around pure utilities.
- Use provided Node scripts for browser-heavy smoke checks; aim to cover new code paths where feasible.

## Commit & Pull Request Guidelines
- Use Conventional Commits: `feat:`, `fix:`, `docs:`, `refactor:`, `chore:`, `test:`.
- PRs must: describe change and rationale, link issues, include repro steps; screenshots for UI changes under `public/`.
- Ensure `npm run build` succeeds and server boots; update README and `.env.example` when changing config or API.

## Security & Configuration Tips
- Never commit `.env`, PDFs, or `reports/` contents; validate URLs (HTTP/HTTPS only).
- Rate limiting and CSP are enabled; tune via `.env.example`. Use non-root Docker defaults.
