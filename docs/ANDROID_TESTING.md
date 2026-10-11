# Android test checklist

## Setup

1. Use Android Studio Device Manager to start a **Google Play** emulator. The installed device on this machine is `Medium_Phone_API_37.0`; the app compiles against SDK 36.
2. Ensure `adb devices` reports `device`, not `offline`. If offline, use Device Manager → Stop → Cold Boot. Do not wipe emulator data unless you intentionally want to reset it.
3. Use JDK 17; this machine has `C:\Program Files\Microsoft\jdk-17.0.20.101-hotspot`. The Android Studio bundled JDK 25 is too new for this project's Gradle 8 wrapper.
4. If needed set current terminal environment variables:
   ```powershell
   $env:JAVA_HOME = 'C:\Program Files\Microsoft\jdk-17.0.20.101-hotspot'
   $env:ANDROID_HOME = 'C:\Users\devsa\AppData\Local\Android\Sdk'
   npm run android
   ```
5. A first build downloads native dependencies and takes several minutes. Later builds reuse them. Google Sign-In and applying require this custom development build.

## Credential-free device checks

- Gallery: safe-area header, feature day/week/month changes, two masonry columns, no card text clipping at 390 px width.
- Search and filters: title + art style search; combined style/mood filter; reset; zero-results state; New/Trending sorting.
- Details: artwork, lock-screen preview, metadata, palette; back retains the grid's filter/search state.
- Feed: swiping snaps to full-height artwork; like targets visible artwork; details/back restores the feed index.
- Likes: local preview hearts survive restart and appear in Profile.
- Collections: thematic and monthly cards, year selection, correct member counts and detail navigation.
- Appearance: System, Light, Dark; preference survives restart; text is readable at larger system font size.
- Apply: test home, lock, and both; actually inspect launcher/lock screen after the success result.
- Save: request permission at the action; grant and reject cases; verify saved image in Photos.
- Android back: details/feed/collections/Studio → previous screen; root tabs → Discover.

## Connected checks after credentials

- Google: owner and second test account; cancel sign-in; Play Services error; restart session restore; expired/revoked session; logout.
- Likes: persisted in Neon and after restart; rapid repeated taps do not duplicate database rows.
- Owner Studio: only the owner's Profile shows it; direct API calls from another account fail 403.
- Upload: valid portrait JPEG/PNG/WebP; wrong bytes/MIME; undersized/landscape; >20 MB; two equal styles; missing rights confirmation; R2 failure.
- Publish: original JPEG and thumbnail exist in R2; catalog shows image without client secrets; failed uploads create no public row.
- Collections: create curated and monthly; add members; duplicate month rejected; replace membership; archived artwork disappears from public counts.
- Features: day/week/month schedules; UTC boundary; same-kind overlap rejected; missing feature shows empty pick state.
- Account deletion: only on a disposable test account; account/likes/sessions removed; no owner account deletion during ordinary testing.

## Known platform boundaries

iOS requires an iOS Google OAuth configuration and manual wallpaper application through Settings. Web is an app design preview and does not provide Google login or native wallpaper application.
