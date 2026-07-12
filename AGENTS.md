# Repository Guidelines

## Project Structure & Module Organization

This repository is a TypeScript RidePool monorepo. `Server/` contains the Express API, with controllers, routes, middleware, services, config, and utilities under `Server/src/`; backend tests live in `Server/tests/`. `Client/CarPoolApp/` is the passenger Expo app and `Client/DriverApp/` is the driver Expo app, both using Expo Router `app/` screens plus reusable components, services, hooks, stores, and config files. `shared/src/` contains shared TypeScript contracts. Supabase migrations are in `Server/supabase/migrations/`, and documentation is under `__docs__/`.

## Build, Test, and Development Commands

Run commands from the package directory unless noted.

- `cd Server && npm run dev`: start the backend with Nodemon.
- `cd Server && npm run build`: compile backend TypeScript to `dist/`.
- `cd Server && npm test`: run all Vitest backend tests.
- `cd Client/CarPoolApp && npm start`: start the passenger Expo app.
- `cd Client/DriverApp && npm start`: start the driver Expo app.
- `npm run android`, `npm run ios`, or `npm run web`: run an Expo app on the selected target.
- `cd shared && npm run build`: build shared type declarations and JS output.

## Coding Style & Naming Conventions

Use TypeScript for app and server code. Follow existing 2-space indentation, single quotes in backend files, and Expo/React Native patterns in client files. Name components in PascalCase, hooks with `use...`, services as `*.service.ts`, routes as `*.routes.ts`, and platform files as `.native.tsx` or `.web.tsx`. Run `npm run lint` in each Expo app before UI changes.

## Testing Guidelines

Backend tests use Vitest and match `Server/tests/**/*.test.ts`. Client tests use Jest and live in `__tests__/` folders. Prefer focused unit tests for services, utilities, stores, and API clients; add integration tests when behavior crosses Supabase, routes, or realtime flows.

## Commit & Pull Request Guidelines

Recent history uses short, imperative or descriptive commits, for example `bug fixing driver cancel` and `Documentation update...`. Keep commits scoped to one concern and mention the affected area when useful. Pull requests should include a concise summary, test commands run, linked issue or task, and screenshots or screen recordings for UI changes.

## Security & Configuration Tips

Do not commit real secrets. Use `.env.example` files in `Server/`, `Client/CarPoolApp/`, and `Client/DriverApp/` as templates. Treat Supabase credentials, map keys, push notification credentials, and payment settings as environment-specific configuration.
