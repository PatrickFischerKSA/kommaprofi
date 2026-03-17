# Kommaprofi

Kommaprofi ist ein browserbasierter Kommatrainer fuer den Deutschunterricht. Die App laeuft ohne Build-Schritt direkt als statische Seite, speichert Lernfortschritt lokal im Browser und arbeitet mit 120 kuratierten Uebungen ueber vier Niveaus.

## Was jetzt funktioniert

- Vier Niveaus mit jeweils 30 Aufgaben: `Starter`, `Azubi`, `Profi`, `Expert`
- Alle Wortgrenzen sind anklickbar, auch bei Aufgaben ohne Komma
- Regelzuordnung per Duden-Code in den schweren Niveaus oder optional auch in leichten
- Lokaler Fortschritt mit geloesten Aufgaben, Trefferquote und Level-Statistik
- Schweiz-Option fuer Briefanreden ohne Komma
- Direkte Nutzung ueber `index.html`, weil die Uebungsdaten als JavaScript mitgeliefert werden
- GitHub-Pages-Deployment ueber Workflow auf `main`

## Projektstruktur

- `index.html` - App-Struktur
- `styles.css` - Layout, Responsive Design, visuelle Gestaltung
- `app.js` - Trainerlogik, Fortschritt, Auswertung, Feedback
- `data/rules.js` - eingebettete Duden-Regeln
- `data/exercises.js` - eingebetteter kuratierter Aufgabenpool
- `.github/workflows/pages.yml` - Deployment fuer GitHub Pages
- `assets/Kommasetzen.jpg` - Hintergrundmotiv

## Lokal starten

1. `index.html` direkt im Browser oeffnen
2. Oder das Repo statisch ausliefern, zum Beispiel ueber GitHub Pages

## Inhaltliche Hinweise

- Die Datenbasis stammt aus dem gelieferten kuratierten ZIP und wurde in eine robustere Offline-App ueberfuehrt.
- Fehlende Regelcodes `D108` und `D109` wurden ergaenzt, damit alle Aufgaben saubere Beschriftungen haben.
