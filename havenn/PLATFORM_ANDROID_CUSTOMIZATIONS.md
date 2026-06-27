# Android Platform Customizations (RE-APPLY AFTER `cordova platform add android`)

> **Why this file exists**
> `havenn/platforms/android/` is **git-ignored** and is **deleted** by
> `cordova platform rm android`. Every edit made directly inside it is wiped on
> remove/re-add, which is why the APK "stops building until we redo some changes."
> This file is the checklist of those changes so a fresh platform builds on the
> first try instead of after many attempts.
>
> Captured from a known-good `platforms/android` on **2026-06-22**.
> cordova-android: **13.0.0** | AGP: **8.3.0** | Gradle (config): **8.7**

---

## TL;DR — the order of operations

```bash
# 0. ONE-TIME (already done 2026-06-22): JAVA_HOME -> JDK 17 as a User env var.
#    Make sure you opened a FRESH terminal so it's in effect:
echo "$JAVA_HOME"   # should print the jdk-17 path
java -version       # should say 17.0.16

cd havenn

# 1. Re-add the platform (wipes platforms/android)
cordova platform rm android
cordova platform add android@13

# 2. Build (this also bundles the web UI into ./www — see package.json)
npm run build:android            # debug
# npm run build:android:release  # release/signed
```

With `JAVA_HOME` set to JDK 17 (Section A1), no manual platform edit is normally
needed. Only revisit Section A if a build fails (A2 = gradle wrapper version).

---

## Section A — Manual edits INSIDE `platforms/android` (these get wiped)

These are NOT present in any source file and MUST be re-applied by hand (or by the
helper script in Section D) after every `platform add`.

### A1. JDK 17  ✅ NOW HANDLED VIA JAVA_HOME (no per-platform edit needed)

Two JDKs are installed on this machine:
`jdk-11.0.28.6-hotspot` and `jdk-17.0.16.8-hotspot`. AGP 8.3 requires JDK 17. If
Gradle picks up JDK 11, the build fails.

**Chosen fix (2026-06-22):** a persistent **User** environment variable was set so
Gradle always uses JDK 17 — you no longer need to edit `gradle.properties`:

```
JAVA_HOME = C:\Program Files\Eclipse Adoptium\jdk-17.0.16.8-hotspot
```

Set via PowerShell:
```powershell
[Environment]::SetEnvironmentVariable("JAVA_HOME", "C:\Program Files\Eclipse Adoptium\jdk-17.0.16.8-hotspot", "User")
```
> ⚠️ Only affects **new** terminals — close and reopen your shell/IDE before building.
> Verify with: `echo $JAVA_HOME` (bash) then `java -version` → should say `17.0.16`.

**Fallback** (only if `JAVA_HOME` ever gets unset/overridden) — re-add this line to
`platforms/android/gradle.properties`:
```properties
org.gradle.java.home=C:/Program Files/Eclipse Adoptium/jdk-17.0.16.8-hotspot
```
The full known-good `platforms/android/gradle.properties` was:
```properties
org.gradle.jvmargs=-Xmx2048m
org.gradle.java.home=C:/Program Files/Eclipse Adoptium/jdk-17.0.16.8-hotspot
android.useAndroidX=true
android.enableJetifier=true
```

### A2. Gradle wrapper pinned to 8.4

**File:** `platforms/android/gradle/wrapper/gradle-wrapper.properties`

cordova-android 13 declares Gradle 8.7 in `cdv-gradle-config.json`, but the
known-good platform used the **8.4** wrapper:

```properties
distributionUrl=https\://services.gradle.org/distributions/gradle-8.4-all.zip
```

Re-apply only if a fresh `platform add` pulls 8.7 and the build fails. If 8.7 builds
cleanly, leave it — prefer the default. (Documented because it was changed on the
working copy; verify which one actually builds for you.)

---

## Section B — Things that are ALREADY in source (restored automatically, do NOT redo)

These come back on their own from `config.xml` / `build.json` / plugins. Listed so
you don't waste time re-applying them.

| Concern | Source of truth | Notes |
|---|---|---|
| RevenueCat plugin + Billing dep | `config.xml` → `cordova-plugin-purchases ^8.0.7` | Pulls `com.revenuecat.purchases:purchases-hybrid-common:18.15.1` into `app/build.gradle`. |
| `BILLING` permission | `config.xml` `<config-file>` block | Lands in `AndroidManifest.xml`. |
| Release signing | `havenn/build.json` + `havenn/my-release-key.keystore` | Generates `platforms/android/release-signing.properties`. |
| SDK / minSdk / targetSdk (23 / 35 / 35) | `config.xml` `<preference>`s | → `cdv-gradle-config.json`. |
| App namespace `com.havenn.studyspace` | `config.xml` `<widget id>` | |
| Local web UI bundle (`<content src="index.html">`) | `config.xml` (fixed 2026-06-22) | Was previously a remote URL — see CORDOVA_BRIDGE_FIX below. |
| Web assets in `www/` | `npm run sync:www` copies `Frontend/dist` | Run by `build:android`. |

---

## Section C — Cleanup / known junk in the platform folder

Safe to delete; not needed for builds (they're just noise / can confuse tooling):

- `platforms/android/hs_err_pid*.log`, `platforms/android/replay_pid*.log`
  — JVM crash dumps from a previous OOM/failed build.
- `platforms/android/CON`
  — a file literally named `CON`, a **reserved device name on Windows**. It can
  break recursive copy/delete tooling (cpr/rimraf/Explorer). Remove it:
  ```bash
  # Windows reserved name — normal rm may fail; use the \\?\ prefix from cmd:
  #   del "\\?\D:\WebSoftware\HavennMain\havenn\platforms\android\CON"
  ```

---

## Section D — Optional: one-shot re-apply script

Save as `havenn/scripts/post-platform-add.sh` and run it right after
`cordova platform add android`:

```bash
#!/usr/bin/env bash
set -e
PLATFORM_GP="platforms/android/gradle.properties"

# A1: pin JDK 17 if not already present
if ! grep -q "org.gradle.java.home" "$PLATFORM_GP"; then
  echo "org.gradle.java.home=C:/Program Files/Eclipse Adoptium/jdk-17.0.16.8-hotspot" >> "$PLATFORM_GP"
  echo "[post-add] pinned JDK 17 in $PLATFORM_GP"
fi

# C: remove junk
rm -f platforms/android/hs_err_pid*.log platforms/android/replay_pid*.log 2>/dev/null || true

echo "[post-add] done. Now run: npm run build:android"
```

---

## Section E — Verify after building & installing the APK

Remote-debug the device in Chrome (`chrome://inspect`) and run in the console:

```js
typeof window.cordova    // expect "object"
typeof window.Purchases  // expect "object"  (RevenueCat bridge)
```

Both `"object"` → the Cordova bridge is injected and RevenueCat can load offerings.
If either is `"undefined"`, the web UI is not loading from the local shell — re-check
`config.xml` `<content src="index.html" />` and that `www/` was populated by
`npm run sync:www`.
