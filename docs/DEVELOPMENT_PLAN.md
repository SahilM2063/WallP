# Development plan

10 October 2026

## 1 — Definition, before implementation

- Write PRD, TRD, locked visual direction, acceptance criteria, and credential setup guides.
- Choose Android-first Expo development build, NativeWind v4, Google-only login, Neon and R2.
- Separate local artwork preview from live identity and authorization.

## 2 — Foundation

- Bootstrap npm workspaces, TypeScript contracts, environment examples, and dependency lockfile.
- Build theme tokens, bundled fonts, icons, safe-area shell, error/loading primitives.
- Create original abstract demo artwork in the chosen hybrid-style vocabulary.

## 3 — Discovery experience

- Compact Discover header, search, monochrome text filters, short featured card, and masonry grid.
- Immersive vertically paged feed and detailed preview.
- Editorial collections, monthly archive, collection detail.
- Local preview likes, persistent themes, profile and live login connection.

## 4 — Live services

- PostgreSQL migrations and server catalog pagination.
- Google verification, opaque sessions, owner-only middleware, idempotent likes.
- Owner upload: validated image normalization + R2 original/thumbnail.
- Collection creation/membership, scheduled features, archive controls, account deletion.

## 5 — Native actions and Studio

- Android home/lock/both wallpaper module; save to photo library.
- Private Studio upload and publishing UI, collection builder and scheduling form.
- Attach live API client and consistent error/loading state handling.

## 6 — Verification and handoff

- Run compilation, security/unit tests, Expo version check, Android/web bundling.
- Use native Android emulator screenshots and interaction checks as the primary UI validation; web is an optional preview.
- Generate native project and run emulator when Android SDK/device is available.
- User supplies configured Google/Neon/R2 environment values; migrate database and validate end-to-end.
- Finish device test checklist before release; document any pending external checks explicitly.

## MVP definition of done

All requested screens and connected paths implemented; credential-free preview runnable; private access enforced by API; Android native module included; setup guides ready; local checks pass. Real Google/Neon/R2 integration and device validation remain release requirements until those environments are available.

## Later

Server-side query/search and cursor caching for larger catalogs; refresh/session device management; crop positioning before Apply; download history; scheduled daily auto-change; image generation pipeline; moderation tooling; optional analytics; deeper animations after performance profiling.
