# Startprompt · three.js Demo 6

Der Prompt, mit dem ich anfangen würde, um diese Demo nachzubauen. Er liefert nicht genau diese Seite, sondern eine erste Version der Idee. Danach beginnt die eigentliche Arbeit.

Ersetzen Sie die Teile in `[eckigen Klammern]` durch Ihr eigenes Thema.

```text
Ich möchte eine scrollgesteuerte Landingpage bauen für [ein Architekturbüro, Ihr Thema].

Die Idee: Ein weißes Arbeitsmodell aus Karton von [einem zweigeschossigen Haus mit Garten] steht nachts auf dem
Tisch eines Architekten. Kartonwände, Fenster aus Acetatfolie, Höhenschichten aus Graupappe für
das Gelände, Bäume aus Karton und eine winzige Maßstabsfigur. Eine Schreibtischlampe beleuchtet
es, und Zeichnungen desselben Hauses hängen an der dunklen Wand dahinter.

Der Scrollablauf, der Reihe nach:
1. Der Loader: Ein Skalpell ritzt eine Linie über einen Kartonbogen, dann teilt sich der Bogen
   entlang des Schnitts.
2. Der Hero baut sich auf: Die Lampe klickt an, die Höhenschichten fallen ein, das Haus gleitet
   auf sein Grundstück, die Bäume stellen sich auf.
3. Das Eintauchen. Die Kamera kommt auf die Augenhöhe der Maßstabsfigur herunter. Jede
   Halbierung der Höhe kostet gleich viel Scroll. Eine Anzeige zeigt die Höhe in Zentimetern
   auf dem Tisch und in Metern im Haus.
4. Der Übergang. Eine Kugel wächst aus der Glühbirne der Lampe. In ihr wird der Karton zu Putz,
   Eiche, Glas und Gras, mit einer dünnen roten Scan-Linie, wo sie eine Fläche schneidet.
   Die Kamera nimmt den Platz der Figur ein, und das Licht der Lampe wird zu einer tiefen Sonne
   aus derselben Richtung. Die Kugel stoppt, sobald Haus und Gelände fertig sind, und das dunkle
   Atelier bleibt drumherum. Kein Himmel.
5. Der Rundgang: durch die große Glastür mit zwei Schiebeflügeln in [den Wohnraum], hinauf in
   [das Arbeitszimmer auf der Galerie], wo dasselbe Kartonmodell auf dem Tisch steht.
6. Wieder hinaus. Die Kugel schrumpft, das Haus wird wieder zu Karton, die Lampe klickt aus,
   und [Projekt starten] erscheint.

Worauf es mir ankommt:
- Das Modell ist kein Bild. 1 Einheit ist 1 m Haus, der Tisch ist 100-mal größer darum herum
  gebaut, und eine einzige Bauteilliste wird entweder als Karton oder in echten Materialien an
  denselben Koordinaten gerendert.
- Karton und Haus werden getrennt beleuchtet: der Karton von der Lampe, das Haus von der Sonne.
- Der Look: ein blaugraues Dämmeratelier #323841 mit grüner Schneidematte #2a7a57, weißer Karton 
  #f5f2ea, graue Pappe für das Gelände, ein bernsteinfarbener Akzent #f2a531. Das echte Haus: weißer Putz, Eiche,
  Bronzerahmen, gedämpfte Wiese, Moos und Senf als Textilien. Chakra Petch für Überschriften, IBM Plex Mono für Beschriftungen, Passermarken in
  den Ecken.
- Die Kamera kommt nie näher als 40 cm an eine Fläche. Baue eine Prüfung ein, die das über den
  ganzen Weg misst.
- three.js 0.160 von einem CDN, einfache Dateien, kein Build-Schritt. Keine Bilddateien, jede
  Textur wird im Code gezeichnet.

Bevor du Code schreibst, schlage das Haus mit Maßen vor, die ich mir vorstellen kann, und den
Kameraweg Station für Station, und warte auf meine Antwort. Dann baue in Etappen. Nur die
erste Etappe: der Loader, der Hero und das Eintauchen bis zur Figur. Nimm es auf und zeig es
mir, bevor du weitermachst.
```

Der letzte Absatz ist genauso wichtig wie die Idee. Ohne ihn bekommen Sie eine fertige Seite, die Sie nicht selbst ausgewählt haben.
