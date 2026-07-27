#!/bin/bash
cd "$(dirname "$0")"
export PATH="$HOME/.cargo/bin:$PATH"
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
echo "🌲 SiedliskoOS Desktop Alpha"
echo "Pierwsze uruchomienie może potrwać kilka-kilkanaście minut."
npm install || { echo "Błąd npm install"; read -p "Enter..."; exit 1; }
npm run tauri dev
