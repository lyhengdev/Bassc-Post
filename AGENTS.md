# Repository Guidelines

## Project Structure & Module Organization
- `backend/` hosts the Node.js/Express API. Source lives in `backend/src/` with `config/`, `controllers/`, `middleware/`, `models/`, `routes/`, `services/`, `utils/`, and `validators/`.
- `backend/uploads/` stores local media uploads during development.
- `frontend/` contains the React + Vite UI. Source is in `frontend/src/` with `components/`, `pages/`, `hooks/`, `services/`, `stores/`, and `utils/`. Static assets live in `frontend/public/`.
- Architecture notes and production guidance live in `ARCHITECTURE.md`.

## Build, Test, and Development Commands
Run commands from each package directory.
- Backend dev server: `cd backend && npm run dev` (nodemon with hot reload).
- Backend production start: `cd backend && npm start`.
- Seed database: `cd backend && npm run seed`.
- Backend tests: `cd backend && npm test` (Jest).
- Frontend dev server: `cd frontend && npm run dev` (Vite on `http://localhost:5173`).
- Frontend build/preview: `cd frontend && npm run build`, `cd frontend && npm run preview`.

## Coding Style & Naming Conventions
- JavaScript/JSX uses 2-space indentation and semicolons; keep imports grouped and ordered by module type.
- Use ES modules (`import`/`export`) throughout.
- Frontend components are `PascalCase.jsx` (e.g., `AdsManager.jsx`), hooks are `useX.js`, stores are `*Store.js`.
- Backend files use `camelCase.js` for services and utilities (e.g., `sanitizationService.js`).
- Tailwind is configured via `frontend/tailwind.config.js`; prefer utility classes in JSX over ad-hoc CSS.

## Testing Guidelines
- Backend uses Jest via `npm test`. There are no dedicated test folders yet; add focused tests where you introduce logic changes.
- Frontend has no test runner configured; if you add tests, document the setup in `frontend/README.md`.

## Commit & Pull Request Guidelines
- Recent commit messages are short and informal (e.g., `--change-authenticate`). There is no enforced convention; keep messages concise and action-oriented.
- PRs should include: a clear description of changes, linked issues (if any), and screenshots/GIFs for UI changes.
- Note any required environment variables or migration steps in the PR description.

## Security & Configuration Tips
- Backend environment is configured via `.env` (see `backend/.env.example`). Ensure `JWT_SECRET` and database credentials are set locally.
- The frontend proxies `/api` to `http://localhost:5000` in development; keep the backend running when testing UI features.
