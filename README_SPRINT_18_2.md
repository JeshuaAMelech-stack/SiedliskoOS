# Sprint 18.2 — bezpieczna migracja i poprawiony odczyt powierzchni

Zmiany:
- naprawa błędu SQLite/sqlx `index out of bounds` po dodaniu nowych kolumn,
- zachowanie wszystkich istniejących nieruchomości i rekordów testowych,
- jawne pobieranie kolumn zamiast `SELECT *`,
- poprawiony odczyt powierzchni zapisanej jako `35 400 m2 (3,54 ha)`,
- ignorowanie mniejszych powierzchni klas gruntów jako powierzchni całej działki,
- wykrywanie Adresowo.pl,
- zapis ID ogłoszenia z końcówki adresu URL,
- pole i przycisk „Otwórz ogłoszenie”.

Ta wersja nie usuwa ani nie odtwarza tabeli `properties`.
