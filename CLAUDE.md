# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Vue 3 + TypeScript + Vite application with Pinia for state management, Vue Router for routing, and PrimeVue for UI components.

## Key Architecture

- **State Management**: Pinia stores using Composition API pattern (see `src/stores/counter.ts` for example)
- **Routing**: Vue Router with history mode configured in `src/router/index.ts`
- **Path Aliasing**: `@/` maps to `src/` directory (configured in `vite.config.ts`)
- **Type Checking**: Uses `vue-tsc` instead of `tsc` for `.vue` file type support

## Common Commands

### Development

```sh
npm run dev          # Start dev server with hot-reload
```

### Building

```sh
npm run build        # Type-check and build for production
npm run build-only   # Build without type-checking
npm run type-check   # Run type-checking only
npm run preview      # Preview production build locally
```

### Testing

```sh
npm run test:unit                              # Run Vitest unit tests in watch mode
npm run test:e2e                               # Run Playwright e2e tests
npm run test:e2e -- --project=chromium        # Run e2e tests on specific browser
npm run test:e2e -- tests/example.spec.ts     # Run specific e2e test file
npm run test:e2e -- --debug                    # Run e2e tests in debug mode
```

Note: First-time e2e testing requires `npx playwright install` to install browsers.

### Code Quality

```sh
npm run lint         # Lint and auto-fix with ESLint
npm run format       # Format code with Prettier
```

## Node Version

Requires Node.js `^20.19.0` or `>=22.12.0`.

- all business logic should have unit test coverage
- never bypass commit hooks
- never commit without being instructed to do so
- rely on best practices for primevue, search https://primevue.org/ when needed
- before starting the dev server, check if it's already running - it will often be the case
- all work is done on branches. If the user attempts to commit on 'main' - instead commit to a branch, use a branch prefix that matches conventional commits types
