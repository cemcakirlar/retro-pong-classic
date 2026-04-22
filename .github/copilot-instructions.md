# Copilot Instructions for retro-pong-classic

This repository is a React + TypeScript + Vite arcade game project.

## Project Defaults

- Prefer TypeScript-first, small focused functions, and readable names.
- Keep gameplay behavior deterministic where possible and preserve existing game feel.
- Avoid unnecessary dependencies; use existing project tooling and patterns.
- Run or suggest relevant checks after changes: `pnpm run lint` and `pnpm run test`.

## Instruction Files

Use and prioritize the specialized instruction files in `.github/instructions/` for scoped guidance:

- Accessibility: `a11y.instructions.md`
- Performance: `performance-optimization.instructions.md`
- Security: `security-and-owasp.instructions.md`
- JS/Vitest coding standards: `nodejs-javascript-vitest.instructions.md`
- Playwright testing: `playwright-typescript.instructions.md`
- CI/CD workflows: `github-actions-ci-cd-best-practices.instructions.md`
- HTML/CSS color and style rules: `html-css-style-color-guide.instructions.md`
- Documentation sync on code change: `update-docs-on-code-change.instructions.md`

## Working Style

- Make minimal, targeted edits that match existing structure and style.
- Do not refactor unrelated code.
- When changing behavior, update tests and docs where applicable.
