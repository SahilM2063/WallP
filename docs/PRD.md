# wallp. — Product requirements

Version 1.0 · 10 October 2026 · Owner: Sahil

## Product

An Android-first wallpaper gallery for original, non-representational art made by mixing two art styles, abstract techniques, or pattern systems. Browse effortlessly, find an artwork that feels personal, and apply it to a phone. The catalog is curated and uploaded by Sahil; image generation inside the app is outside this MVP.

Working name: **wallp.** Tagline: **A little less ordinary.**

## Audience and outcomes

- People who want distinctive abstract wallpapers without advertising, visual clutter, or conventional photography.
- Sahil, who needs a private, simple publishing workflow.
- A visitor can discover an artwork and reach Apply in three taps.
- A returning Google user can find liked artworks in Profile.
- Sahil can upload an image, describe its two styles, place it in a collection, and publish it.

## Scope

Android is the first full platform. React Native and NativeWind are required. iOS can browse and save images but cannot programmatically set system wallpaper; its Apply action explains the manual Photos workflow. Web is a development preview of the gallery, not a second production authentication platform.

Google is the only account provider. Visitors may browse without an account. Live likes and Studio require Google sign-in. Neon PostgreSQL stores catalog and account data. Cloudflare R2 stores original images and optimized previews. No payments, ads, social messaging, public uploads, or password accounts.

## Content policy

Publish only non-representational hybrid artwork: e.g. Bauhaus × fluid ink, risograph × generative geometry, or op-art × soft gradients. No objectified people, nature photography, landscapes, figurative portraits, or traditional scene wallpapers. Every upload requires two distinct style labels and the owner's explicit abstract-content and rights confirmation. This confirmation is editorial, not an automated image classifier.

## Information architecture

Three persistent tabs: **Discover**, **Collections**, **You**. Feed is a mode of Discover, reached with the grid/feed toggle. Details, collection contents, authentication, filters, and Studio open as focused screens or sheets.

### Discover

- Editorial header with wordmark, short greeting, theme control, and search.
- Wallpaper of the day hero with artwork, title, style pairing, and detail link.
- Day / Week / Month selector changes the curated feature.
- All / Trending / New filters, search, style chips, and grid/feed switch.
- Two-column masonry grid with varying card heights, titles, and like affordances.
- Filter sheet supports art style and light/dark artwork mood. Theme selection is separate from artwork mood.
- Pagination and pull-to-refresh in the connected catalog. Empty/error/loading states are explicit.

### Immersive feed

- One artwork per page; vertical paging with safe-area controls and nearby-page rendering.
- Like, details, and Apply affordances; back returns to gallery with filters preserved.
- Visible title, two-style pairing, artwork count, and navigation hints.
- Swiping never applies a wallpaper automatically.

### Wallpaper details

- Large artwork preview, title, style pairing, description, resolution, color palette, collection, and like count.
- Favorite, Save image, and Apply actions.
- Apply offers Home screen / Lock screen / Both on supported Android devices.
- Loading and success/error feedback; success is shown only after the native system call succeeds.
- Save requests Photos/media permission only when used. Web downloads the demo asset; iOS saves for manual application.

### Collections

- Curated thematic collections and a month archive.
- Large editorial cover cards with count, label, title, and short description.
- Month groups use a year picker and YYYY-MM collection dates, never inferred from local device clock alone.
- Collection details show its artworks using the same grid and details components.

### Profile (You)

- Google sign-in card for guests; Google name/avatar/email for signed-in users.
- Liked wallpaper library; theme preferences: System / Light / Dark.
- Privacy explanation, local preview status, sign-out, and account deletion.
- Studio entry exists only when the authenticated API response grants owner access.
- Guest catalog browsing is retained after sign-out; user likes and session data are cleared.

### Private Studio

- Visible only to the verified Google identity for `sahilsensei.work@gmail.com`.
- Select JPEG/PNG/WebP, preview it, enter title/description/two styles/palette/mood, and optionally choose a collection.
- Validate image dimensions and size before uploading. Minimum 1080 × 1920, portrait, maximum 20 MB; originals and thumbnails are generated/validated by the API.
- Upload to a private staging key; publish only after server-side image decoding, normalization, and R2 delivery succeeds.
- Create curated or monthly collections; choose a cover from published artwork.
- Schedule Day/Week/Month features with explicit UTC dates; reject overlapping periods of the same kind.
- Draft image uploads are not listed in the public catalog. Unpublish published artwork without deleting liked-history rows.

## Visual direction (locked for MVP)

Use reference 4's masonry rhythm, references 1/5's compact floating navigation, and reference 2's month-card typography. Reference imagery supplies layout inspiration only; none of its photographed subjects enter the catalog.

- Typography: locally bundled Figtree for headings, body, and controls.
- Light: pure white #FFFFFF, black text #111111, neutral gray secondary text and hairline borders.
- Dark: pure black #000000, white text #FAFAFA, neutral gray secondary text and hairline borders.
- Monochrome app chrome: black/white selection and action states. Color belongs to the wallpaper artwork only. No tinted backgrounds or colored controls.
- Artwork corners 14–16 px; buttons 10–12 px; a compact, lightly outlined navigation dock. Round corners are restrained rather than applied to every element.
- Compact gallery header with search, one short featured card, and masonry visible immediately. No marketing headline, repeated art badges, or heavy shadows.
- Art dominates. Simple wallpaper titles, calm typography, underlined text filters, and consistent icon strokes. Profiles and settings use straightforward labels.
- Honor safe areas, reduced motion, accessibility labels, font scaling, and system theme.

## Stories and acceptance criteria

| Story          | Acceptance                                                                                                         |
| -------------- | ------------------------------------------------------------------------------------------------------------------ |
| Browse         | Grid renders local demo artwork without credentials; connected catalog uses real API data.                         |
| Search/filter  | Search matches title/styles; sort and mood/style filters compose; clear returns full catalog.                      |
| Feed           | Scroll snaps to one artwork; current artwork actions refer to the visible item.                                    |
| Details/apply  | Home/lock/both picker invokes Android native wallpaper code and reports actual result.                             |
| Like           | Signed-in likes persist in PostgreSQL; repeated like/unlike requests are idempotent. Demo likes are clearly local. |
| Collections    | Curated and month filters show correct counts and collection contents.                                             |
| Themes         | System/light/dark preference persists across restarts. Both themes use the same layout.                            |
| Google         | Server verifies Google's ID token signature/audience/issuer/expiry; user ID derives from Google sub.               |
| Owner          | Non-owner and guest admin API requests return 403/401 even when UI is bypassed.                                    |
| Upload         | Arbitrary client object URLs cannot be published; uploaded bytes are decoded and checked by server.                |
| Features       | Only active UTC window is featured; missing selection shows an honest empty state in live mode.                    |
| Delete account | User can delete account and likes; session is invalidated and local identity is cleared.                           |

## Empty and degraded states

Bundled artwork enables a credential-free **local preview**, explicitly identified in Profile. It does not simulate Google identity or grant admin privileges. If live API configuration is present, network failures show retry controls, never silently replace the real catalog with demo data. Sign-in configuration errors explain what needs setup. Missing scheduled features show no active pick.

## Metrics for a later release

Time to first detail/apply, apply success rate, liked artworks per user, collection opens, upload failure rate. No third-party analytics in MVP; use structured API logs without tokens or personal email.

## Release gate

Pass TypeScript and meaningful API/security tests; compile Android bundle; inspect light/dark gallery, feed, details, collections, profile, and owner Studio on an Android emulator. Verify real Google login, Neon persistence, R2 upload, and home/lock/both on device after credentials are configured. No claim of production readiness before these external checks.
