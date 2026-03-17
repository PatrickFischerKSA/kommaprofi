# Kommaprofi – Inline‑Kommasetzung (unsichtbare Klickbereiche)

Diese Version vermeidet sichtbare Einsetzstellen vollständig. Kommas werden **direkt im Satz** durch Klick zwischen Wörtern gesetzt/entfernt. Optional: Schweiz‑Option (D132), Lehrkraftmodus, Begründungspflicht ab *Profi*/*Expert*in*.

## Start
1. Ordner öffnen, `index.html` im Browser starten (offline nutzbar)
2. Level wählen → **Start**
3. Zwischen Wörter klicken, um Kommas einzufügen/zu entfernen
4. **Prüfen** für Feedback; Optional: **Begründung abfragen** aktivieren

## Besonderheiten
- **Unsichtbare Klickbereiche** (keine Slots → kein Vorwegnehmen der Positionen)
- **Schweiz‑Option (D132)**: Briefanrede ohne Komma wird akzeptiert
- **Regelbegründung**: erscheint *nur* dort, wo ein gesetztes Komma an einer bewertungsrelevanten Stelle steht
- **Teacher‑Mode**: `?teacher=1` → zusätzliche Hinweise nach der Prüfung

## Struktur
- `index.html` – App
- `assets/app.js`, `assets/style.css`
- `assets/duden.pdf` – Regelwerk D100–D132
- `data/exercises.json` – Aufgabenbank (mit Soll‑Kommas & Regeln)
- `data/rules.json` – Regelkürzel → Kurztexte
- `.github/workflows/pages.yml` – GitHub Pages

## Lizenz
MIT
