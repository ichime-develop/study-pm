---
name: implementation
description: Use when implementing study-pm features from approved basic design and detailed design into backend, frontend, tests, migrations, or integration code. Trigger for MVP implementation tasks, Spring Boot backend work, React frontend work, Flyway migrations, API wiring, business logic implementation, and implementation fixes that must follow docs/development/coding-guidelines.md.
---

# Implementation Skill

## Purpose

承認済みの基本設計・詳細設計を入力として、PC Web版 `study-pm` の実装を進める。

## Inputs

Before editing code, read only the documents needed for the task.

- Start from `docs/INDEX.md` to locate current sources of truth.
- Use `docs/basic-design/` for feature scope, API list, data model, screen flow, and technology stack.
- Use `docs/detailed-design/` for DB schema, business logic, validations, exceptions, and persistence behavior.
- Use `docs/requirements/` when implementation behavior must be traced back to requirements.
- Use `docs/development/coding-guidelines.md` for naming, comments, class design, method design, frontend naming, and test naming.
- Use `mock/` only as a UI/reference source. Do not retrofit coding-style comments or naming fixes into `mock/` unless the user explicitly asks.

## Workflow

1. Inspect the relevant design and existing implementation before changing files.
2. State the implementation target and the design documents used as inputs.
3. Keep implementation within the approved MVP scope.
4. Prefer existing local patterns and project terminology over inventing new structure.
5. Implement backend, frontend, migration, and tests in small dependency-safe slices.
6. If a design contradiction or missing decision blocks implementation, report it instead of silently inventing product behavior.
7. Run the most relevant available validation and report any validation that could not be run.

## Coding Rules

- Follow `docs/development/coding-guidelines.md`.
- Add a short responsibility comment at the top of each new source file.
- Use names from requirements, basic design, detailed design, and glossary.
- Avoid `Info`, `Data`, `Manager`, `Util`, `Common`, and `xxxFlag` unless there is a clear boundary reason.
- Keep business logic out of controllers and UI components. Put it in domain objects, services, calculators, or validators with clear responsibility names.
- Use `is...`, `has...`, or `can...` for boolean values.
- Keep comments focused on responsibility, rationale, business rules, security decisions, or non-obvious exceptions. Do not comment by restating the code.

## Backend Rules

- Use Java 21 + Spring Boot 3.x + Spring Data JPA + Flyway + PostgreSQL as defined in `tech-stack.md`.
- Keep database objects aligned with `docs/detailed-design/database-schema.md`.
- Use Flyway migrations for schema changes. Do not rely on Hibernate DDL generation.
- Use `BigDecimal` for hours and calculation values that represent study effort.
- Use `LocalDate` for business dates and `Instant` or `OffsetDateTime` for timestamps.
- Preserve the common API error envelope from `api-list.md`.
- Keep authentication behavior aligned with JWT, refresh token hash storage, and cookie rules from `api-list.md`.

## Frontend Rules

- Build the real app under `frontend/`; treat `mock/` as reference only.
- Use React + TypeScript + Vite, React Router, TanStack Query, and independent CSS as defined in `tech-stack.md`.
- Use PascalCase components, `useXxx` hooks, `onXxx` props, and `handleXxx` local handlers.
- Avoid `any`; use typed API models and narrow `unknown` values.
- Keep server state in TanStack Query and local UI state in React state.
- Preserve UI terminology, layout intent, and interaction patterns from the approved UI mock unless design docs say otherwise.

## Testing And Validation

- Add or update tests with the implementation slice when behavior risk is meaningful.
- Name backend unit tests `XxxTest` and Testcontainers/PostgreSQL integration tests `XxxIT`.
- Name frontend tests `Xxx.test.tsx` and test through user-visible behavior.
- For backend schema/API work, prefer validation in this order: compile/tests, Flyway migration against PostgreSQL, targeted API tests.
- For frontend work, prefer validation in this order: typecheck, unit/component tests, build, browser verification when local UI behavior matters.

## Output

When reporting completion, include:

- What was implemented.
- Which design documents drove the implementation.
- Files changed at a high level.
- Validation run and failures or unavailable tools.
- Remaining risks or follow-up implementation slices.
