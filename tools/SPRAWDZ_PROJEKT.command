#!/bin/bash

set -euo pipefail

cd "$(dirname "$0")/.."

echo ""
echo "========================================"
echo "  SiedliskoOS — kontrola projektu"
echo "========================================"
echo ""

if [[ ! -f "package.json" || ! -f "src-tauri/Cargo.toml" ]]; then
  echo "BŁĄD: Nie znaleziono projektu SiedliskoOS."
  exit 1
fi

echo "1/5 Sprawdzam Git..."
git status --short
git diff --check

echo ""
echo "2/5 Sprawdzam TypeScript i frontend..."
npm run build

echo ""
echo "3/5 Sprawdzam część Rust/Tauri..."
cargo check --manifest-path src-tauri/Cargo.toml

echo ""
echo "4/5 Sprawdzam, czy ważne katalogi nie są śledzone przez Git..."

if [[ -n "$(git ls-files node_modules src-tauri/target dist)" ]]; then
  echo "BŁĄD: Git śledzi pliki buildów lub node_modules:"
  git ls-files node_modules src-tauri/target dist | head -30
  exit 1
fi

echo "OK — node_modules, dist i target nie są śledzone."

echo ""
echo "5/5 Ostatni status Git..."
git status

echo ""
echo "========================================"
echo "  WSZYSTKIE TESTY ZAKOŃCZONE POMYŚLNIE"
echo "========================================"
echo ""
