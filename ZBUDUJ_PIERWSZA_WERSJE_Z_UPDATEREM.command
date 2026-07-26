#!/bin/bash
set -e
cd "$(dirname "$0")"
KEY_PATH="$HOME/.tauri/siedliskoos.key"
if [ ! -f "$KEY_PATH" ]; then
  echo "Najpierw uruchom KONFIGURUJ_GITHUB_I_AKTUALIZACJE.command"
  read -p "Naciśnij Enter..."
  exit 1
fi
read -s -p "Hasło klucza aktualizacji: " KEY_PASSWORD
echo
export TAURI_SIGNING_PRIVATE_KEY="$KEY_PATH"
export TAURI_SIGNING_PRIVATE_KEY_PASSWORD="$KEY_PASSWORD"
npm install
npm run tauri build -- --bundles app
open "src-tauri/target/release/bundle/macos"
echo "Gotowe — otworzyłem folder z SiedliskoOS.app"
read -p "Naciśnij Enter..."
