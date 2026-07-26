# SiedliskoOS 0.2.0

Ta wersja dodaje automatyczne aktualizacje przez GitHub Releases.

## Pierwsza konfiguracja

1. Uruchom `KONFIGURUJ_GITHUB_I_AKTUALIZACJE.command`.
2. Dodaj na GitHubie dwa sekrety wskazane przez skrypt.
3. Uruchom `ZBUDUJ_PIERWSZA_WERSJE_Z_UPDATEREM.command`.
4. Przenieś `SiedliskoOS.app` do folderu Aplikacje.

Od kolejnego wydania aplikacja sprawdza aktualizacje po uruchomieniu i pokazuje komunikat z przyciskiem „Aktualizuj teraz”.

Klucz prywatny znajduje się lokalnie w `~/.tauri/siedliskoos.key`. Nie udostępniaj go i wykonaj bezpieczną kopię zapasową.
