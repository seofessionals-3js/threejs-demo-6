# three.js Demo 1

In der Übersicht und in der durchlaufenden Schau ist das die Nummer 1; das Repository heißt weiter `threejs-demo-6`, damit alle Adressen gültig bleiben. Mit ihr beginnt die Schau.

Ein weißes Kartonmodell eines Hauses am Abend auf der grünen Schneidematte eines Architekten. Scrollen Sie hinunter zur kleinen Maßstabsfigur, und der Karton wird zum echten Haus, beleuchtet von der Schreibtischlampe als Sonne. Gehen Sie durch die große Glastür hinein und hinauf auf die Galerie ins Arbeitszimmer, wo dasselbe Modell auf dem Tisch steht. Dann wieder hinaus, und die Lampe klickt aus.

Das Haus dieser Fassung heißt **Haus Passepartout**: ein weißer Rahmen aus Dach, Boden und zwei Seitenwänden, zwei Geschosse hoch und nach Süden ganz verglast. Hinter der hohen Scheibe bleibt der Wohnraum über beide Geschosse offen, oben liegt das Arbeitszimmer als Galerie. Die Farben: Das Atelier ist die eine dunkle Szene der Reihe, aber aufgehellt: blaugraue Dämmerung (`#323841`), grüne Schneidematte (`#2a7a57`) mit hellem Raster, weißer Karton (`#f5f2ea`), Graupappe (`#a69d90`), Korkwand (`#b88d5e`), Birkensperrholz (`#cfb58a`) und eine Messinglampe (`#c7a04a`) mit warmem Licht. Der einzige Akzent ist Lampenbernstein (`#f2a531`) für die Scan-Linie, die Pinnnadeln und die Anzeigen. Das gebaute Haus: weißer Putz (`#f4f1ea`), Eiche (`#cfae7e`), Bronzerahmen (`#4c4239`), Beton (`#bcb8af`), Moos (`#70856a`) und Senf (`#c79a31`) als Textilien, gedämpfter Rasen (`#839b5c`) und ein Himmel im goldenen Licht (`#f3e3c4` am Horizont bis `#b9cfe0`).

[**Live ansehen**](https://seofessionals-3js.github.io/threejs-demo-6/) · [**Startprompt**](PROMPT.md) · [**Alle Demos**](https://seofessionals-3js.github.io/threejs-demos/)

## So funktioniert es

- **Eine Bauteilliste, zwei Welten.** `js/house.js` ist das Haus mit 1 Einheit = 1 m. Tisch, Lampe und Atelier sind 100-mal größer darum herum gebaut, sodass Kartonmodell und echtes Haus dieselben Quader an denselben Koordinaten sind.
- **Das Eintauchen verteilt den Scroll nach Maßstab.** Jeder Schritt kostet seine Länge geteilt durch die Höhe über dem Garten, sodass jede Halbierung der Höhe gleich viel Scroll braucht (`measurePath` in `js/page.js`).
- **Der Übergang ist eine Kugel.** Jedes Material wird in `js/sweep.js` gepatcht: Karton wird außerhalb einer Kugel um die Glühbirne der Lampe gezeichnet, das echte Haus innerhalb, mit einer bernsteinfarbenen Linie, wo die Kugel eine Fläche schneidet. Die Linie wird über die Fläche gelegt und nicht addiert, denn auf weißem Karton würde ein addiertes Bernstein nur cremefarben. Die Kugel wächst, während Sie dort stehen, wo die Figur stand.
- **Zwei Beleuchtungen in einer Szene.** Die Lichtschleife ist so gepatcht, dass der Karton von der Lampe beleuchtet wird und das Haus von einer tiefen Sonne aus Richtung der Lampe.
- **Die Tür.** Zwei Glasflügel in Bronzerahmen, zusammen 3,00 m breit, fahren auseinander, sobald Sie die Terrasse betreten, und schließen sich hinter Ihnen wieder.
- **Kein Clipping.** Die Kamera hält auf dem ganzen Weg mindestens 40 cm Abstand zu jeder Fläche. `window.__rig.clear()` misst das (mit `?rec` in der Adresse): der exakte Abstand vom Auge zu jedem gezeichneten Dreieck, über den ganzen Scroll. Zurzeit ist der kleinste Wert 0,52 m, über dem Geländer der Galerie.
- **Keine Bilddateien.** Karton, Graupappe, Beton, Eiche, Rasen und die angepinnten Zeichnungen werden alle im Code auf Canvas gemalt.

## Dateien

`index.html`, `css/page.css`, `js/page.js` (Kamera, Scrollen, Post-Processing, HUD), `js/desk.js` (der Tisch und das Kartonmodell), `js/real.js` (das echte Haus und das Gelände), `js/sweep.js` (der Übergang), `js/house.js` (die Bauteilliste). Insgesamt etwa 180 KB.

`?noao` schaltet die Umgebungsverdeckung ab. `?dpr=1` legt die Renderauflösung fest.

## Lokal starten

Die Seiten nutzen JavaScript-Module und brauchen deshalb einen lokalen Server. Ein Doppelklick auf `index.html` funktioniert nicht.

```bash
python -m http.server 8000
```

Dann http://localhost:8000/ öffnen. Am besten auf einem Laptop mit aktuellem Browser.

## Herkunft und Lizenz

Basiert auf „Card Model“ aus [flat-to-3d](https://github.com/Sam1983Aing/flat-to-3d) von Samnang Aing, veröffentlicht unter der MIT-Lizenz, und ins Deutsche übersetzt. Haus, Grundstück, Einrichtung und Farbwelt dieser Fassung sind neu. Die Lizenz liegt unverändert in [LICENSE](LICENSE).

Alle Büros, Häuser, Adressen und Kontaktdaten in der Demo sind erfunden. three.js (MIT) wird von einem CDN geladen, die Schriften Chakra Petch und IBM Plex Mono von Google Fonts (SIL Open Font License).
