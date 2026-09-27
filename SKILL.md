---
name: shadcn-ui
description: Build or modify UI components and pages using shadcn/ui in any React-based project (Next.js, Vite, Remix, Astro, etc.). Use this whenever the user asks to create a page, screen, form, dashboard, table, modal, or any UI component, add or install a shadcn component, theme or restyle an app, or mentions shadcn/ui, Radix, Tailwind components, or "components.json" - even if they don't say "shadcn" explicitly. Not project-specific; applies to any codebase using or adopting shadcn/ui.
---

# shadcn/ui

shadcn/ui is not an npm package you import — it's components whose source code gets copied directly into the project (usually `components/ui/`) via a CLI, so the user owns and can freely edit every file. Treat it as "our code" from the start, not a black-box library.

## Before writing any UI code

1. **Check the project is set up.** Look for `components.json` at the project root.
   - If missing, this project hasn't been initialized. Run the init flow (see "Setup" below) before adding components — don't hand-write shadcn-style components from memory into an uninitialized project.
   - If present, read it to learn the project's conventions: `style` (new-york vs default), `tailwind.cssVariables`, `baseColor`, `aliases` (where `ui`, `components`, `lib`, `hooks` resolve to), and `rsc` (React Server Components on/off). Match these — don't introduce a different style or import path convention.

2. **Check what's already installed.** List `components/ui/` (or wherever `aliases.ui` points). Reuse existing components instead of re-adding or hand-rolling duplicates. If a needed primitive (e.g. `dialog`, `form`, `data-table`) isn't there yet, install it rather than writing it from scratch — shadcn's version is accessible, tested, and matches the user's theme.

3. **When unsure about a specific component's API, install steps, or a newer pattern (e.g. Tailwind v4 setup, a recently-added component, a framework's install page), fetch the docs rather than relying on memory:**
   - Start at `https://ui.shadcn.com/llms.txt` — an index of every docs page with a one-line description and a link to a clean markdown version of that page (installation guides per framework, CLI reference, theming, each component's usage page, etc.).
   - Fetch the specific linked page you need (e.g. the `button` or `data-table` component page, or `docs/installation/next`) rather than the whole site.
   - Only reach for `https://ui.shadcn.com/llms-full.txt` (the entire docs bundled) for a broad task touching many components at once — it's large, so prefer the targeted page first.

## Setup (new project)

Ask which framework if it isn't obvious (Next.js, Vite, Remix, Astro, Laravel, Gatsby, React Router, TanStack Router/Start, manual), then either:

- Run `npx shadcn@latest init` and follow prompts, or
- If the CLI can't detect the framework, fetch the manual installation page from llms.txt and create `components.json` + the Tailwind/utils setup by hand.

Confirm the base color, style, and whether CSS variables are wanted before scaffolding — these are hard to change cleanly later.

## Adding a component

```
npx shadcn@latest add button
```

- Multiple at once: `npx shadcn@latest add button dialog form`
- If a component depends on others (e.g. `form` needs `label`, `input`), the CLI pulls them automatically — don't manually pre-install dependencies.
- After adding, the file lives in the project (e.g. `components/ui/button.tsx`) and is yours to edit. Prefer editing it directly over wrapping it if the change is structural (new variant, different default), and prefer composition/props over editing it if the change is one-off/local to a single usage.

## Building a page

1. Sketch the page as a composition of existing/needed primitives before writing markup — e.g. "a form (Form + Input + Select + Button) inside a Card, with a Table below." Identify which components need installing first.
2. Compose from the top down: layout primitives (e.g. flex/grid via Tailwind) wrapping shadcn components — shadcn doesn't do page layout, only the components themselves.
3. Use existing patterns in the codebase (check `app/` or `pages/` for how other pages structure loading states, error boundaries, metadata) so the new page matches house style, not just component style.
4. For data-heavy UI (tables, forms with validation), check whether the project already uses the standard pairings — TanStack Table for data tables, React Hook Form + Zod for forms — before introducing a different approach.
5. Respect `rsc` from `components.json`: if `true`, keep components as Server Components by default and only add `"use client"` where interactivity (state, event handlers) requires it.

## Theming

- Colors/spacing/radii are CSS variables (if `cssVariables: true`) defined once (usually `globals.css`) and consumed via Tailwind classes — change the variables, not individual component files, for a global restyle.
- For a new palette, prefer generating it via shadcn's theme tooling (check the theming page via llms.txt) over hand-picking hex values, to keep light/dark mode and contrast consistent.
- Dark mode: confirm the project's dark-mode strategy (class-based via `next-themes` is the common default) before assuming one.

## Conventions to keep consistent

- Import path: use the project's configured alias (e.g. `@/components/ui/button`), not relative paths, matching `components.json` → `aliases`.
- Don't reformat or "clean up" untouched shadcn component internals while adding a feature — keep diffs scoped.
- If the user asks for something shadcn doesn't ship as a primitive (e.g. a rich date-range picker, a kanban board), compose it from existing primitives (Popover + Calendar, etc.) rather than pulling in an unrelated new UI library, unless the user asks for that.
