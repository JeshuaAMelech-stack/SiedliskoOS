#!/bin/bash
set -e
cd "$(dirname "$0")"

REPO_URL="https://github.com/JeshuaAMelech-stack/SiedliskoOS.git"
KEY_DIR="$HOME/.tauri"
KEY_PATH="$KEY_DIR/siedliskoos.key"

printf '\n=== SiedliskoOS — jednorazowa konfiguracja aktualizacji ===\n\n'
npm install
mkdir -p "$KEY_DIR"

if [ -f "$KEY_PATH" ]; then
  echo "Klucz już istnieje: $KEY_PATH"
else
  echo "Utwórz hasło dla klucza aktualizacji. Zapisz je w bezpiecznym miejscu."
  read -s -p "Hasło: " KEY_PASSWORD
  echo
  read -s -p "Powtórz hasło: " KEY_PASSWORD_2
  echo
  if [ "$KEY_PASSWORD" != "$KEY_PASSWORD_2" ]; then
    echo "Hasła nie są takie same. Uruchom plik ponownie."
    read -p "Naciśnij Enter..."
    exit 1
  fi
  npm run tauri signer generate -- -w "$KEY_PATH" -p "$KEY_PASSWORD"
fi

PUB_PATH="$KEY_PATH.pub"
if [ ! -f "$PUB_PATH" ]; then
  echo "Nie znaleziono klucza publicznego: $PUB_PATH"
  read -p "Naciśnij Enter..."
  exit 1
fi

PUBKEY="$(cat "$PUB_PATH")"
PUBKEY="$PUBKEY" node <<'NODE'
const fs = require('fs');
const path = 'src-tauri/tauri.conf.json';
const conf = JSON.parse(fs.readFileSync(path, 'utf8'));
conf.plugins.updater.pubkey = process.env.PUBKEY;
fs.writeFileSync(path, JSON.stringify(conf, null, 2) + '\n');
NODE

echo
if [ ! -d .git ]; then
  git init
  git branch -M main
fi
if ! git remote get-url origin >/dev/null 2>&1; then
  git remote add origin "$REPO_URL"
fi

git add .
git commit -m "SiedliskoOS 0.2.0 with automatic updater" || true

echo
echo "Teraz wysyłam projekt do GitHub. GitHub może poprosić o zalogowanie."
git push -u origin main

cat > DANE_DO_GITHUB_SECRETS.txt <<DATA
SEKRET 1 — nazwa:
TAURI_SIGNING_PRIVATE_KEY

Wartość:
$(cat "$KEY_PATH")

----------------------------------------
SEKRET 2 — nazwa:
TAURI_SIGNING_PRIVATE_KEY_PASSWORD

Wartość: HASŁO, KTÓRE PRZED CHWILĄ USTAWIŁEŚ
DATA

open "https://github.com/JeshuaAMelech-stack/SiedliskoOS/settings/secrets/actions/new"
open "DANE_DO_GITHUB_SECRETS.txt"

echo
echo "Projekt jest na GitHubie. Otworzyłem stronę dodawania sekretów oraz plik z pierwszym sekretem."
echo "Dodaj dwa sekrety zgodnie z plikiem. Hasła nie zapisaliśmy — wpisz hasło, które ustawiłeś."
echo
echo "NIE wysyłaj nikomu prywatnego klucza ani hasła."
read -p "Naciśnij Enter, aby zakończyć..."
