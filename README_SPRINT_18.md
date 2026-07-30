# SiedliskoOS — Sprint 18

## Smart parser architecture

Sprint 18 wydziela logikę przechwytywania ogłoszeń do osobnych modułów:

- `capture/portal.rs` — wykrywanie portalu,
- `capture/parser.rs` — wspólny silnik parsowania i generowania tytułów,
- `lib.rs` — pobieranie strony, zapis kopii HTML i metadanych.

## Najważniejsza zmiana

Nazwa nieruchomości jest generowana z miejscowości i powierzchni, np.:

- `Mierzyno • 11,5 ha`
- `Robakowo • 1250 m²`

Oryginalny tytuł ogłoszenia nadal jest przechowywany w metadanych i pokazany w podglądzie źródła.

## Obsługiwane portale

- Otodom
- OLX
- Nieruchomości-online
- Morizon
- Gratka
- inne strony przez Universal Parser v1

Istniejąca baza `siedliskoos.db` i tabela `properties` pozostają bez zmian.
