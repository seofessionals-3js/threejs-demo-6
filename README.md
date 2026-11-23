# three.js Demo 1

In der Übersicht und in der durchlaufenden Schau ist das die Nummer 1; das Repository heißt weiter `threejs-demo-6`, damit alle Adressen gültig bleiben. Mit ihr beginnt die Schau.

Ein weißes Kartonmodell eines Hauses am Abend auf der grünen Schneidematte eines Architekten. Scrollen Sie hinunter zur kleinen Maßstabsfigur, und der Karton wird zum gebauten Haus, dort wo er steht: Das Atelier, der Tisch und das Kartongelände bleiben, nur das Haus wird echt, mit Zedernholz, Licht in den Fenstern und beleuchteten Gartenstufen. Gehen Sie durch die große Glastür hinein und hinauf auf die Galerie ins Arbeitszimmer, wo dasselbe Modell auf dem Tisch steht. Dann wieder hinaus, und die Lampe klickt aus.

Das Haus dieser Fassung heißt **Haus Passepartout**: ein weißer Rahmen aus Dach, Boden und zwei Seitenwänden, zwei Geschosse hoch und nach Süden ganz verglast. Hinter der hohen Scheibe bleibt der Wohnraum über beide Geschosse offen, oben liegt das Arbeitszimmer als Galerie. Die Farben: Das Atelier ist die eine dunkle Szene der Reihe, aber aufgehellt: blaugraue Dämmerung (`#323841`), grüne Schneidematte (`#2a7a57`) mit hellem Raster, weißer Karton (`#f5f2ea`), Graupappe (`#a69d90`), Korkwand (`#b88d5e`), Birkensperrholz (`#cfb58a`) und eine Messinglampe (`#c7a04a`) mit warmem Licht. Der einzige Akzent ist Lampenbernstein (`#f2a531`) für die Scan-Linie, die Pinnnadeln und die Anzeigen. Das gebaute Haus: ein weißer Putzrahmen (`#f4f1ea`), außen und in den Laibungen mit Zedernholz verkleidet, Holzuntersichten mit Einbauleuchten, ein Holzdeck, Bronzerahmen (`#4c4239`), Beton (`#bcb8af`), ein Schiebeladen aus Zedernlamellen am Balkon, Zinkabdeckungen und sechzehn Solarmodule auf dem Dach. Innen Eiche (`#cfae7e`), Moos (`#70856a`) und Senf (`#c79a31`) als Textilien.

[**Live ansehen**](https://seofessionals-3js.github.io/threejs-demo-6/) · [**Startprompt**](PROMPT.md) · [**Alle Demos**](https://seofessionals-3js.github.io/threejs-demos/)

## So funktioniert es

- **Eine Bauteilliste, zwei Welten.** `js/house.js` ist das Haus mit 1 Einheit = 1 m. Tisch, Lampe und Atelier sind 100-mal größer darum herum gebaut, sodass Kartonmodell und echtes Haus dieselben Quader an denselben Koordinaten sind.
- **Das Eintauchen verteilt den Scroll nach Maßstab.** Jeder Schritt kostet seine Länge geteilt durch die Höhe über dem Garten, sodass jede Halbierung der Höhe gleich viel Scroll braucht (`measurePath` in `js/page.js`).
- **Der Übergang ist eine Kugel.** Jedes Material wird in `js/sweep.js` gepatcht: Das Kartonhaus wird außerhalb einer Kugel um die Glühbirne der Lampe gezeichnet, das gebaute Haus innerhalb, mit einer bernsteinfarbenen Linie, wo die Kugel eine Fläche schneidet. Die Linie wird über die Fläche gelegt und nicht addiert, denn auf weißem Karton würde ein addiertes Bernstein nur cremefarben. Die Kugel wächst, während Sie dort stehen, wo die Figur stand. Das Gelände des Modells, seine Kartonbäume und das Atelier gehören zu keiner der beiden Seiten: Sie bleiben stehen, und die Linie läuft nur über sie hinweg.
- **Zwei Beleuchtungen in einer Szene.** Die Lichtschleife ist so gepatcht, dass der Karton von der Lampe beleuchtet wird und das gebaute Haus von einem tiefer stehenden Licht aus derselben Richtung, das bis in die Räume reicht, dazu von seinen eigenen Leuchten.
- **Die Tür.** Zwei Glasflügel in Bronzerahmen, zusammen 3,00 m breit, fahren auseinander, sobald Sie die Terrasse betreten, und schließen sich hinter Ihnen wieder.
- **Kein Clipping.** Die Kamera hält auf dem ganzen Weg mindestens 40 cm Abstand zu jeder Fläche. `window.__rig.clear()` misst das (mit `?rec` in der Adresse): der exakte Abstand vom Auge zu jedem gezeichneten Dreieck, über den ganzen Scroll. Zurzeit ist der kleinste Wert 0,52 m, über dem Geländer der Galerie.
- **Die Haut des Hauses.** Am Ende der Bauteilliste steht, was das gebaute Haus vom Modell unterscheidet (`skin` in `js/house.js`): Holzverkleidung, Untersichten, Leuchten, Schiebeladen, Abdeckungen, Solarmodule. Nichts davon wird in Karton geschnitten.
- **Keine Bilddateien.** Karton, Graupappe, Beton, Eiche, Zedernholz und die angepinnten Zeichnungen werden alle im Code auf Canvas gemalt.

## Dateien

`index.html`, `css/page.css`, `js/page.js` (Kamera, Scrollen, Post-Processing, HUD), `js/desk.js` (der Tisch und das Kartonmodell), `js/real.js` (das gebaute Haus und seine Einrichtung), `js/sweep.js` (der Übergang), `js/house.js` (die Bauteilliste). Insgesamt etwa 180 KB.

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
