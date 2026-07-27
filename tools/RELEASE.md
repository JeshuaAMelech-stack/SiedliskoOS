# RELEASE.md

# SiedliskoOS Release Guide

This is the official release procedure for SiedliskoOS.

------------------------------------------------------------------------

## Before starting

Verify:

-   Working tree is clean (`git status`)
-   GitHub Secrets contain the current updater signing key
-   You have access to the updater private key in
    `~/.tauri/siedliskoos.key`

------------------------------------------------------------------------

# 1. Update version

Update **all three** files:

-   `package.json`
-   `src-tauri/tauri.conf.json`
-   `src-tauri/Cargo.toml`

Example:

    0.2.1 -> 0.2.2

Commit:

``` bash
git add .
git commit -m "Release v0.2.2"
git push
```

------------------------------------------------------------------------

# 2. Load updater signing key

``` bash
export TAURI_SIGNING_PRIVATE_KEY="$(cat ~/.tauri/siedliskoos.key)"

read -s "TAURI_SIGNING_PRIVATE_KEY_PASSWORD?Signing key password: "
export TAURI_SIGNING_PRIVATE_KEY_PASSWORD
echo
```

------------------------------------------------------------------------

# 3. Build

``` bash
npm run tauri build
```

Expected output:

-   SiedliskoOS.app
-   SiedliskoOS.app.tar.gz
-   SiedliskoOS.app.tar.gz.sig

------------------------------------------------------------------------

# 4. Create ZIP

``` bash
cd src-tauri/target/release/bundle/macos

ditto -c -k --sequesterRsrc --keepParent \
SiedliskoOS.app \
SiedliskoOS-macOS.zip
```

------------------------------------------------------------------------

# 5. Generate latest.json

Create a new `latest.json` using:

-   current version
-   current signature from `SiedliskoOS.app.tar.gz.sig`
-   current UTC date
-   GitHub release URL

Example URL:

    https://github.com/JeshuaAMelech-stack/SiedliskoOS/releases/download/vX.Y.Z/SiedliskoOS.app.tar.gz

------------------------------------------------------------------------

# 6. GitHub Release

Tag:

    vX.Y.Z

Title:

    SiedliskoOS X.Y.Z

Upload exactly these files:

-   SiedliskoOS-macOS.zip
-   SiedliskoOS.app.tar.gz
-   SiedliskoOS.app.tar.gz.sig
-   latest.json

Do NOT mark as Pre-release.

------------------------------------------------------------------------

# 7. Verify

Install or run the previous release.

Confirm:

-   Update detected
-   Download succeeds
-   Installation succeeds
-   App restarts
-   New version is displayed

------------------------------------------------------------------------

# Checklist

-   [ ] Version updated in 3 files
-   [ ] Git commit
-   [ ] Git push
-   [ ] Build successful
-   [ ] ZIP regenerated
-   [ ] latest.json regenerated
-   [ ] Release published
-   [ ] Auto-update verified
