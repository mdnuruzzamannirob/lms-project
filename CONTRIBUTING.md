# Contributing Guide

## Getting Started

1. Fork the repository and clone your fork.
2. Install dependencies:

```bash
pnpm install
```

3. Copy environment variables and configure local secrets:

```bash
cp .env.example .env
```

4. Start development server:

```bash
pnpm dev
```

## Development Workflow

1. Create a branch from `main`.
2. Make focused changes with tests.
3. Run local checks before opening a PR:

```bash
pnpm typecheck
pnpm test
pnpm docs:rebuild
```

4. Commit with clear messages.
5. Open a pull request using the PR template.

## Code Standards

- Use TypeScript strict typing.
- Keep modules isolated by domain.
- Add or update validation schemas for new request payloads.
- Regenerate API docs when routes or validation change.
- Prefer small, reviewable pull requests.

## Pull Request Requirements

- Describe the problem and solution clearly.
- Link related issues.
- Include tests for behavior changes.
- Update docs, examples, and changelog when needed.
