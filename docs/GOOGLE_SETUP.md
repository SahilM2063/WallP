# Google login — step by step

This app uses Google login directly, without Firebase. Android package: `com.sahilsensei.wallp`. Owner account: `sahilsensei.work@gmail.com`.

## 1. Create the project

1. Open [Google Cloud Console](https://console.cloud.google.com/).
2. Create a project called `wallp` and select it.
3. Open **Google Auth Platform** (or APIs & Services → OAuth consent screen).
4. Configure Branding: app name `wallp.`, your support email, developer contact email, and logo if desired.
5. Select External audience. While in Testing, add your Gmail and anyone testing the app as test users.
6. Request only basic OpenID identity scopes: `openid`, `email`, `profile`. No Drive/Photos access is needed.

## 2. Create a Web application OAuth client

1. In Clients/Credentials, create OAuth client → **Web application** → `wallp API`.
2. Copy its **Client ID**, ending in `.apps.googleusercontent.com`.
3. Put that same ID in both files:
   - `apps/mobile/.env`: `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=...`
   - `apps/api/.env`: `GOOGLE_WEB_CLIENT_ID=...`
4. The native library uses the web ID to request an ID token for the API. This MVP does not require the web client's secret or a browser redirect URI. Do not put any client secret in the mobile app.

## 3. Generate the Android project and find debug SHA-1

The debug APK built in this workspace currently uses:

```text
Package: com.sahilsensei.wallp
SHA-1: 5E:8F:16:06:2E:A3:CD:2C:4A:0D:54:78:76:BA:A6:F3:8C:AB:F6:25
```

Use this for the Android debug OAuth client. Re-run the signing report if you replace the debug keystore. Release and Play signing require their own fingerprints.

1. Install Android Studio, Android SDK, emulator tools, and JDK 17.
2. From repository root run `npm install`, then `npm run android` (or `npx expo prebuild --platform android` inside `apps/mobile` to generate only).
3. In `apps/mobile/android`, run PowerShell `./gradlew.bat signingReport`.
4. Find the **debug** variant's SHA-1. If the debug keystore already exists, an alternative is:
   ```powershell
   keytool -list -v -alias androiddebugkey -keystore .\apps\mobile\android\app\debug.keystore -storepass android -keypass android
   ```
5. Create another OAuth client → **Android** → name `wallp Android debug`.
6. Package name: `com.sahilsensei.wallp`. SHA-1: the debug fingerprint.
7. The Android client ID does not replace the web client ID in the mobile environment file.
8. For release, create additional Android OAuth clients for the release certificate and Google Play App Signing certificate (Play Console → App integrity). Every certificate/package combination must be registered.

## 4. Enable local API and rebuild

1. Finish [Neon setup](./NEON_SETUP.md) and [R2 setup](./R2_SETUP.md).
2. Generate a random server session token automatically through the implemented opaque-token flow; there is no JWT secret to invent.
3. Set `EXPO_PUBLIC_API_URL=http://10.0.2.2:4000` for the Android emulator. A real phone uses the development computer's LAN address, not `localhost`.
4. Run API from root: `npm run api:dev`.
5. Run `npm run android` for a custom Expo development build. Google sign-in **does not run inside Expo Go**.
6. Restart Metro after editing `.env`; use `npm run start -- --clear` if needed. Rebuild after native config changes.
7. Sign in using your owner Gmail. Profile should show **Open Studio** only for that identity.

## 5. Owner identity hardening

The server validates Google ID tokens and verified email and checks the exact owner Gmail. For additional protection, set `ADMIN_GOOGLE_SUB` to that account's Google subject after verifying it in the database (`users.google_sub`). Do not copy this value from an unverified client. Restart the API. Other Google users can browse and like but cannot upload or schedule features.

## 6. Troubleshooting

- `DEVELOPER_ERROR` / code 10: check package, signing SHA-1, web client ID type, and that Android/web clients belong to the same Google project.
- API 401 after Google success: web ID and server `GOOGLE_WEB_CLIENT_ID` must match; test audience must include the account.
- API unreachable: `10.0.2.2` maps the Android emulator to the computer; bind API to `0.0.0.0`, allow local firewall traffic, and check port 4000.
- Play Services unavailable: use a Google Play emulator image.
- Missing native sign-in module: use the development build and rebuild after package/plugin changes.
- Web preview: login is intentionally native-only; test auth on Android.

## Values to configure

Only client IDs are public. Set database and R2 secrets directly in the API environment file or hosting secret manager; never commit them. Keep `.env` files out of version control.

Official guides: [Expo integration](https://react-native-google-signin.github.io/docs/setting-up/expo), [configuration](https://react-native-google-signin.github.io/docs/setting-up/get-config-file), [server verification](https://developers.google.com/identity/gsi/web/guides/verify-google-id-token).
