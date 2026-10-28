# Building the Android app

How to build Model Trainz for Android and test it on an emulator or your own phone. The app is
a [Capacitor](https://capacitorjs.com) project in `android/` that wraps a static build of the
game, so every change to the game needs a fresh `pnpm mobile:build` (step 2) before you run it.

These steps are for macOS. On Windows or Linux they're the same apart from the paths in step 1.

## 1. Install the tools (once)

1. **Node.js 22 or newer and pnpm.** Check with `node -v`. Run `corepack enable` once to get the
   pnpm version pinned in `package.json`.
2. **Android Studio.** Install the latest stable version from
   [developer.android.com/studio](https://developer.android.com/studio). Open it once and finish the
   setup wizard with the **Standard** options; that installs the Android SDK, the emulator and
   the platform tools. Android Studio comes with its own JDK (21 or newer), which this project
   needs.
3. **The Android SDK the project builds against.** In Android Studio open **Settings → Languages &
   Frameworks → Android SDK** and, on the **SDK Platforms** tab, tick **Android 16 (API 36)**. On
   the **SDK Tools** tab make sure **Android SDK Build-Tools**, **Android SDK Platform-Tools** and
   **Android Emulator** are installed. If you skip this, Android Studio offers to install whatever
   is missing the first time it opens the project.
4. **Optional: command-line tools.** Only needed for `cap run`, `./gradlew` and `adb` in a
   terminal. Add this to `~/.zshrc`, then open a new terminal:

   ```bash
   export ANDROID_HOME="$HOME/Library/Android/sdk"
   export PATH="$ANDROID_HOME/platform-tools:$ANDROID_HOME/emulator:$PATH"
   export JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home"
   ```

   `adb version` and `java -version` (21 or newer) should now both work. Without `JAVA_HOME`,
   `cap run` and `./gradlew` use whatever `java` macOS finds first, which may be an old Java 8.

## 2. Build the game for the app

From the repository root:

```bash
pnpm install
pnpm mobile:build
```

This exports the game to `out/` and copies it into `android/app/src/main/assets/public` (and the
iOS project). Run `pnpm mobile:build` again after every change to the game.

## 3. Run it on an emulator

1. Run `pnpm mobile:android` to open the `android/` project in Android Studio. The first time,
   wait for the Gradle sync to finish (progress bar at the bottom) and accept any offers to
   install missing SDK components.
2. Create a virtual phone: **View → Tool Windows → Device Manager**, then **+ → Create Virtual
   Device**. Pick a phone (for example a Pixel), keep the recommended system image for a recent
   Android version, and click **Finish**.
3. Choose that device in the device menu on the toolbar and press **Run** (the green ▶). The app
   installs and opens on the emulator.

From a terminal (with step 1.4 done), `pnpm exec cap run android` does the same: it lists your
emulators and connected phones, builds the app and launches it.

## 4. Run it on your phone

1. On the phone, turn on developer options: **Settings → About phone**, then tap **Build number**
   seven times.
2. Turn on **Settings → System → Developer options → USB debugging**.
3. Connect the phone to your Mac with a USB cable that carries data, and accept the **Allow USB
   debugging?** prompt on the phone.
4. The phone now shows up in Android Studio's device menu. Select it and press **Run**.

No cable? Turn on **Wireless debugging** in Developer options (Android 11+), then in Android
Studio open the device menu and choose **Pair Devices Using Wi-Fi**.

## 5. Make an APK to share with testers

From a terminal (with step 1.4 done):

```bash
pnpm mobile:build
cd android
./gradlew assembleDebug
```

The APK is `android/app/build/outputs/apk/debug/app-debug.apk`. In Android Studio the same is
**Build → Generate App Bundles or APKs → Generate APKs** (older versions: **Build → Build
Bundle(s) / APK(s) → Build APK(s)**); click **locate** in the notification to find the file.

- Install it on a connected phone with
  `adb install -r app/build/outputs/apk/debug/app-debug.apk` (run from `android/`).
- Or send the file to a tester. When they open it, Android asks them to allow installs from that
  app (Files, Chrome, Drive…).
- A debug APK is signed with your Mac's debug key (`~/.android/debug.keystore`). That's fine for
  testing, but Google Play needs a release build signed with your own upload key. An APK built on
  another computer can't update this one: uninstall the app first.

## What to test

- **Start:** enter a name and press **Play**; next launch should show the **Continue** card.
- **Playing:** tap and hold to lay track; open the **Upgrades** drawer from the right edge; buy
  something; try the **Depot**, the **Cab** view, **Settings** and the language picker.
- **Phone layout:** portrait and landscape. The HUD should stay clear of the camera cutout,
  rounded corners and the navigation bar.
- **Online saves:** the **Game** panel should say **Saved online**. That needs the website at
  `https://model-trainz.luigiht.com` to be running this version, which accepts requests from the
  app. Until it's deployed, the panel says the server can't be reached, and progress stays on the
  phone.
- **Across devices:** copy the Game ID in the app and enter it on the website's start screen, and
  the other way round.
- **Performance:** **Settings → Graphics quality**. **Auto** adapts to the phone; try **Low** or
  **Medium** on older devices.

## Use another server for online saves

The app saves through `https://model-trainz.luigiht.com`. To test against another deployment,
build with its address:

```bash
API_ORIGIN=https://your-preview.vercel.app pnpm mobile:build
```

- It must be **https**: the app runs on `https://localhost`, and Android blocks its requests to
  plain `http` addresses, so your Mac's `pnpm dev` server won't work.
- The deployment must run this version of the API (it allows the app's origin).
- Vercel preview deployments with **Deployment Protection** turned on reject the app's requests.
  Turn it off for previews, or use the production site.

## Debugging

- **Web inspector:** while the app runs (emulator or USB phone), open `chrome://inspect/#devices`
  in Chrome on your Mac and click **inspect** under the Model Trainz WebView. You get the console,
  network requests and elements, as for a web page. This works for debug builds.
- **Native logs:** Android Studio's **Logcat** window; filter with `package:mine`.

## Troubleshooting

- **Blank screen, or your latest change is missing:** run `pnpm mobile:build`, then **Run** again.
- **`pnpm mobile:build` fails straight away:** the Capacitor CLI needs Node.js 22 or newer.
- **`pnpm mobile:android` can't find Android Studio:** install it in `/Applications`, or set
  `CAPACITOR_ANDROID_STUDIO_PATH` to the app's path.
- **SDK location not found:** open the project in Android Studio once (it writes
  `android/local.properties`), or set `ANDROID_HOME` (step 1.4).
- **Gradle complains about the Java version** (for example *Dependency requires at least JVM
  runtime version 11. This build uses a Java 8 JVM*): the project needs JDK 21 or newer. In
  Android Studio: **Settings → Build, Execution, Deployment → Build Tools → Gradle → Gradle JDK**
  → the bundled JDK. In a terminal: set `JAVA_HOME` as in step 1.4 and open a new terminal.
- **The phone isn't listed:** check USB debugging is on, accept the prompt on the phone, try
  another cable, and run `adb devices`.
- **Emulator says "System UI isn't responding", or `cap run` fails with `device offline`:** the
  virtual phone is short of CPU. In **Device Manager**, stop it, click **Edit** → **Additional
  settings** and set **CPU cores** to 4 and **RAM** to 4 GB, then **Cold Boot Now**.
- **The Game panel says the server can't be reached:** the website isn't running this version
  yet, the phone is offline, or `API_ORIGIN` points somewhere else.
- **App not installed when opening a shared APK:** an older copy signed with a different key is
  installed. Uninstall it first.
