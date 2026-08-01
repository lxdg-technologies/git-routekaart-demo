# Git Routekaart — SvelteKit

This folder contains the new app version of Git Routekaart. It keeps the original single-file demo at the repository root while providing a maintainable SvelteKit foundation for future GitHub Actions integrations.

## Stack

- SvelteKit 2 + Svelte 5
- Bun for package management and scripts
- Tailwind CSS 4 through the Vite plugin
- daisyUI 5 for the component primitives
- TypeScript

## Local development

```sh
bun install
bun run dev
```

Useful checks:

```sh
bun run check
bun run build
```

## Current scope

The browser-only simulation currently covers the same learning path as the reference demo:

- create an issue and branch;
- add commits and open a pull request;
- merge or squash-and-merge into `main`;
- observe automatic promotion to `test` only;
- manually promote `test` to `live`;
- revert the latest merge as a new release;
- select an older commit as a branch start point, including branch-from-branch.

The simulation is intentionally local and does not call GitHub yet. The typed state/actions in `src/lib/gitRoutekaart.ts` are the seam for adding server-side GitHub Actions triggers later.
