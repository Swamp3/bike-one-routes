# QR-Codes

Druckbare QR-Codes für die Routen 1–6.

## Benutzung

1. `qr-codes/index.html` im Browser öffnen (einfach Doppelklick, keine Installation nötig).
2. Button **Drucken** klicken (oder `Cmd+P`).
3. Im Druckdialog:
   - Format: **A4**
   - Ränder: **Standard** (oder `1 cm`)
   - Skalierung: **100%** (nicht „An Seite anpassen")
   - Hintergrundgrafiken: aus (nicht nötig)
4. Ergebnis: 6 Kacheln à 9 × 9 cm, je QR-Code + Routennummer + URL.

Alle QR-Codes verwenden Fehlerkorrektur-Level **H** (~30%), sodass auch leicht verschmutzte
oder teilweise beschädigte Codes noch scannbar bleiben.

## Zielen auf andere URLs oder Routen

In `qr-codes/index.html` unten im `<script>`-Block:

```js
const BASE_URL = "https://bike-one-routes.vercel.app/routes/";
const ROUTE_NUMBERS = [1, 2, 3, 4, 5, 6];
```
