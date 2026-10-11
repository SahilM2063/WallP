# Verification and remaining integration work

10 October 2026

## Completed

- PRD, TRD, visual direction, development plan, and setup instructions written before app implementation.
- React Native / NativeWind app screens and connected API paths implemented.
- 12 original hybrid abstract sample artworks generated and bundled; font loading narrowed to four local files.
- Revised UI to pure white/pure black chrome: compact header, short featured card, underlined sorting, restrained card corners, simple captions and neutral navigation. Removed green accents and marketing decoration. Native Android screenshots inspected for both themes, details, feed, collections/months, and Profile.
- Android prebuild generates successfully; native autolinking includes Google Sign-In and `WallpWallpaper`.
- Custom Kotlin wallpaper module compiles in the Android build.
- Android Metro/Hermes export passes (16 assets, bundled fonts and artwork).
- Android debug APK builds successfully for the x86_64 emulator; `:app:assembleDebug` passes after the Windows path fix.
- Final TypeScript checks and API production compilation pass.
- Browser interaction checks verify weekly pick changes, Bauhaus search (four results), details/back retaining the search, monthly collection counts, persisted preview favorites, and guest Profile hiding Studio.
- All 18 credential-free API security/validation/upload tests pass. Upload route tests check decoding, normalization, MIME spoofing, required rights confirmation, and cleanup after R2 failure. One opted-in PostgreSQL test awaits `TEST_DATABASE_URL`.

## Native Android checks after the UI revision

Device: `Medium_Phone_API_37.0`, `emulator-5554`, 1080 × 2400.

- Both light and dark themes visually inspected on Android; colors in app chrome are neutral.
- Fixed native Pressable callback styling that made active grid/primary button backgrounds disappear. The shared controls now use deterministic object styles.
- Checked curated and monthly collections (October 8, September 4), Profile, details and floating navigation.
- Liked Soft signal, verified its filled heart in the feed and one favorite in Profile after native wallpaper changes.
- Swiping the feed snaps to page 2 (After hours); details/back restores page 2.
- Weekly pick changes to Chromatic drift.
- Both targets: Android wallpaper ID changed from 2 to 3 with `mWhich=3`; actual launcher screenshot shows Soft signal.
- Home only: system wallpaper changed to ID 4 with `mWhich=1`; lock stayed ID 3 with `mWhich=2`.
- Lock only: lock changed to ID 5 with `mWhich=2`; home stayed ID 4.
- The emulator has no enabled lock screen, so the lock-only result is confirmed by Android service state rather than a visual locked-screen check.
- On this API 37 emulator, applying changes recreates the app activity and returns to Discover. Appearance and favorites restore. Preserving transient navigation through this OS-triggered recreation remains a refinement.

Evidence: `artifacts/android-light.png`, `android-dark.png`, `android-details.png`, `android-collections.png`, `android-months.png`, `android-feed-second.png`, `android-home-applied.png`, and the `android-wallpaper-*.txt` service snapshots.

## Pending external checks

- Real Google account login and owner subject pinning.
- Neon schema migration and opted-in PostgreSQL constraint test (`TEST_DATABASE_URL`).
- R2 credentials, delivery domain, and real object upload/publication.
- Media saving permission grant/reject behavior and lock-screen visual inspection on a device with an enabled lock screen.
- Owner Studio visual interaction test under a real authenticated owner session.
- Production API hosting, HTTPS URL, release signing fingerprint, and release review.

## Environment findings

- Installed Android Studio bundles JDK 25; Gradle 8 requires a compatible JDK. Installed Microsoft JDK 17 was used successfully to compile the native module.
- The workspace's long Windows path hit Ninja's 260-character object filename limit. `plugins/withShortCmakePaths.js` moves generated app CMake files to the repository's `.cxx` folder and applies object-path hashing; prebuild reproduces the fix.
- The emulator initially reported `offline`. Reconnect did not recover it; it subsequently came online during cold-boot recovery, without wiping data. Installed the debug APK and connected it to Metro on port 8081 via ADB reverse. Android is now the primary preview/testing surface.
- Sandbox isolation prevented Hermes from writing a temporary bytecode file; the authorized export outside isolation succeeded.

## Dependency advisories

The server's Google verification and sharp image libraries were upgraded to current patched versions; the API workspace reported zero advisories after the update. The root audit still reports advisories in the Expo/React Native/NativeWind/Tailwind tooling graph (including unpatched transitive dependencies). A forced audit fix proposes incompatible downgrades and a Tailwind major migration, so it was not applied. Review the toolchain audit and an Expo/NativeWind upgrade before production release. This is a release task, not a claim that the current development environment has a clean root audit.

Run final checks with `npm run typecheck`, `npm test`, `npm run build:api`, `npm run export:web`, and `npm run export:android`. See `ANDROID_TESTING.md` for the device matrix.
