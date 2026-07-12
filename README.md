# Robo Racer (Android)

Native Android WebView wrapper around the Robo Racer PlayCanvas HTML5 game.

- Package: `com.roboracer.game`
- Signed with the same release keystore used for other apps (alias `roadrunner`), via GitHub Actions secrets (`KEYSTORE_BASE64`, `KEYSTORE_PASSWORD`, `KEY_ALIAS`, `KEY_PASSWORD`).
- No ad SDK is wired in yet by design — ships first as a plain WebView wrapper to get approved/live, then an ad SDK gets added in a follow-up update.
- Game already handles its own leaderboard and "double score" reward state locally via `localStorage` inside `app/src/main/assets/game/`.
- Push to `main` triggers `.github/workflows/build-apk.yml`, which builds and uploads a signed release APK as a workflow artifact.
