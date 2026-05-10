# Repo Rules

- Single-package TypeScript library for promise-based RPC over `postMessage`, iframes, web workers, and Node worker threads.
- Package source lives in `src/`; public exports start at `src/index.ts`.
- Docs and runnable examples live in `docs/` and are served through Storybook.
- Tests currently live in `tests/` and run with Vitest using `happy-dom`.
- Build output is generated into `lib/`. Do not edit generated `lib/` files directly.
- Use `npm` for project commands. `package-lock.json` is committed and CI uses `npm ci`.
- Do not introduce another package manager unless the task is an explicit package-manager migration.

# Required Workflow

Follow TDD for behavior changes:

1. Red: write the smallest failing test that proves the behavior.
2. Green: make the minimum code change needed to pass.
3. Refactor: clean up structure, naming, and unused code while tests stay green.

Skip tests only when no valid test applies, such as documentation-only, config-only, or visual-only changes.

Bug fixes must reproduce the issue before fixing it and must add or update a regression test.

# Validation

For code changes, run the focused test first, then the full validation set before finishing:

```sh
npm test
npm run lint
npm run build
```

If dependencies are missing in a fresh checkout, run:

```sh
npm ci
```

Documentation-only changes do not require the full validation set.

# Common Commands

- `npm test` - run all Vitest tests.
- `npm run test:coverage` - run tests with coverage thresholds.
- `npm run lint` - run ESLint.
- `npm run build` - typecheck source and tests, then build the library with Vite.
- `npm run storybook` - start Storybook for docs/examples.
- `npm run build-storybook` - build Storybook.

# Coding Rules

- Keep the implementation simple and preserve the package structure.
- Prefer pure functions and small helpers when they make behavior easier to read.
- Assume the happy path first; do not add defensive or speculative code.
- Avoid backwards compatibility work unless explicitly requested.
- Clean up legacy or unused code touched by the task.
- Split files before they become hard to scan. Treat roughly 350 lines as the upper target.
- Comment why something exists, not what each line does.
- Do not specify TypeScript return types unless the type is part of the public contract or improves clarity.
- Avoid nested ternaries.
- Keep imports local and clear. Do not create deep cross-boundary import paths.

# Library Behavior Rules

- Preserve the public API exposed from `src/index.ts`.
- When changing handshake, transport, listener, or RPC behavior, check iframe, web worker, and Node worker-thread implications.
- Avoid mutating caller-provided API schemas unless the behavior is explicitly documented and tested.
- Ensure listeners registered for handshakes or RPC responses are removed when no longer needed.
- Keep message shapes and method-path handling covered by tests when behavior changes.

# Testing Rules

- Use Vitest for behavior tests.
- Prefer real behavior over mocks when practical.
- Keep tests focused on public behavior and meaningful integration points.
- Do not add tests that assert implementation details, literal bundled copy, or generated wording.
- Current tests are in `tests/`; if adding colocated tests later, keep the pattern consistent with the surrounding code unless the repo is intentionally migrated.

# Generated And Packaged Artifacts

- Do not edit `lib/` directly. Update `src/`, then run `npm run build`.
- If dependencies change, update `package-lock.json` through npm commands rather than manual edits.
- Do not manually edit `package.json` versions as part of routine code changes.

# Git

- Branches: `<category>/<kebab-description>`, where category is `feature`, `bugfix`, `hotfix`, `test`, or `chore`.
- Commits: `<category>: <statement>; <statement>`.
- Commit categories: `feat`, `fix`, `refactor`, `chore`, `test`, or `docs`.
- Each commit statement should complete "This commit will ...".
- Open pull requests against `main` unless told otherwise.

# Project Planning And Documentation

This project uses `pstdio` to manage tickets.

- Tickets live under `.pstdio/tickets/` and currently use IDs like `R-2`.
- After editing tickets, save them with `pstdio tickets save --id R-XXX`.
- Run `pstdio --help` for CLI usage.
- When asked to edit plugins, do not update generated templates in `pstdio/files`.
