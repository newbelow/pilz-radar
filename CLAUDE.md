# pilz-radar

Kleine Webapp, die anzeigen soll, wie wahrscheinlich es ist, dass an Andrejs
Stellen gerade Pilze stehen. **Diese Datei ist selbsttragend** — sie enthält
alles Nötige, ohne dass der Brunnen (`C:\Mimir\Mimisbrunnr`) geladen werden muss.
Die Langfassung mit allen Messungen liegt dort unter
`PARAZ/Projekte/pilz-radar.md`.

Sprache: **Deutsch**, auch in Code-Kommentaren und Commit-Nachrichten.

---

## Die harten Regeln

1. **Das GitHub-Repo ist öffentlich.** `github.com/newbelow/pilz-radar`. Alles,
   was committet wird, ist weltlesbar — und die Git-Historie vergisst nichts.
2. **Fundorte gehören nie ins Repo.** Keine Koordinaten, keine Fotos, keine
   Auswertungsdateien mit Ortsbezug — und **keine Stellennamen**. Ein benannter
   Ort („Schwarzes Moor", „Buchenhang") verrät das Revier so gut wie eine
   Koordinate. Regionen (Ostwestfalen, Sauerland) sind grob genug und in Ordnung.
   Vor jedem Commit prüfen — **beides**:
   ```
   git grep -E "5[0-9]\.[0-9]{4}"        # Koordinaten
   git grep -niE "<die eigenen Stellennamen>"   # Ortsnamen
   ```
   ⚠️ Am 05.09. beinahe passiert: Mímir hatte zwei Stellennamen in diese Datei
   geschrieben, um einen Fehler zu dokumentieren. Vor dem Commit gefunden — die
   Prüfung auf Koordinaten allein hätte sie **nicht** gefangen.
3. **Fotos und Auswertungen liegen außerhalb**, in
   `C:\Projects\pilz-radar-fotos\` (Geschwisterordner, nicht im Repo).
   `werkzeug/*.json` und `werkzeug/sichtung-lokal.md` sind per `.gitignore`
   gesperrt.
4. **Keine erfundenen Zahlen.** Wo keine Daten sind, bleibt das Feld leer.
   Lieber „unbekannt" anzeigen als eine Prozentzahl behaupten.
5. **Keine Pilzbestimmung.** Die App ist kein Bestimmungswerkzeug und darf nie
   den Eindruck erwecken, etwas sei essbar. Der Fliegenpilz ist als `giftig`
   und `rolle: zeigerpilz` geführt — Indikator, nie Sammelziel.

## Haltung

Messen statt raten. Reibung statt Bestätigung. Wenn eine Faustregel den Daten
widerspricht, gewinnen die Daten — auch wenn die Faustregel von mir stammt.
Beispiel: „10–14 Tage nach Regen" hält Andrejs eigenen Funden nicht stand.

**Und wenn ein Befund der Methode widerspricht, gewinnt die bessere Methode.**
Am 04.09. abends fiel so ein Befund: „Bodentemperatur trägt nichts bei" war
falsch — mit Perzentilen gemessen, wo ein **Optimalfenster** hingehört. Wer hier
misst, prüft zuerst, ob die Messform zur Behauptung passt.

---

## Stand (05.09.2026)

**Stufe 1 läuft.** `index.html` + `stil.css` + `app.js` im Wurzelverzeichnis,
Vanilla, kein Build. Stellenverwaltung (leer startend, nur `localStorage`),
Tagesreihe über heute + Vorhersage, Detailansicht je Tag mit beiden Werten,
jedem Fenster, seiner Trapezlage und der gemessenen Trennkraft.
Gebaut von Litr (ausgeliehen), fertiggestellt und im Browser geprüft.

✅ **Committet und gepusht (05.09., `e9e7a43`).** 6 Dateien, 2775 Zeilen.
Identität: die repo-lokale Noreply-Adresse; die globale Gitea-Identität blieb
unberührt.
⚠️ **Start braucht einen lokalen Server** (`python -m http.server`), weil
`fetch` auf `daten/arten.json` über `file://` blockiert wird. Auf Pages egal.
⚠️ **Versionsmarke `?v=N`** in `index.html` bei jeder Änderung an `app.js` oder
`stil.css` erhöhen — sonst zeigt der Browser die alte Fassung. Beim Testen am
05.09. genau so passiert und eine Debug-Runde gekostet. **Steht auf `v=5`.**

- Lokal `C:\Projects\pilz-radar` ↔ `github.com/newbelow/pilz-radar`, Branch
  `main`, Push über SSH (`~/.ssh/id_ed25519_github`, eigener Schlüssel, getrennt
  vom Gitea-Schlüssel).
- Commit-Identität **repo-lokal**: `newbelow
  <1722201+newbelow@users.noreply.github.com>`. Global bleibt `andrej
  <kontakt@andrejbelow.de>` — nicht anfassen, daran hängt die Gitea-Arbeit.
- **GitHub Pages ist noch nicht eingeschaltet** (Settings → Pages, `main`/root).
  Künftige Adresse: `https://newbelow.github.io/pilz-radar/`.

### Wo die Seite laufen soll

Andrej plant **abends zu Hause**, nicht im Wald. Damit ist die **NAS das
Fernziel** (Web Station läuft, Port 80/443 offen; sein eingespielter Weg ist
Gitea → Docker). Pages bleibt vorerst, weil es sofort funktioniert und keine
`sudo`-Schritte braucht. Der Umzug ist billig — es ist dieselbe statische Seite.
⚠️ `file://` über Synology Drive wurde **verworfen**: Browser-Sonderfall,
Fremdabrufe werden blockiert, auf dem Handy unbrauchbar.

---

## ⚠️ Aussagegrenze von Wert B (05.09., gemessen)

Andrej beim ersten Benutzen: „Bei dem Wert meiner Befunde ist oft der Wert 100." 
Nachgemessen über 854 Saisontage — er hat recht, und es ist keine Anzeigeschwäche:

| Monat | Median Wert B | Anteil Tage mit **100** |
|---|---|---|
| August | 17,5 | 9,7 % |
| **September** | 89,0 | **39,0 %** |
| **Oktober** | 91,0 | **38,2 %** |
| November | 23,3 | 2,9 % |

**Wert B trennt Saisonphasen, kaum Tage innerhalb der Kernsaison.** Im August ist
es zu warm, im November zu kalt — dazwischen stimmt die Temperatur meistens.
Genau in den Wochen, in denen Andrej rausgeht, steht der Wert an vier von zehn
Tagen auf 100. Das ist die ehrliche Grenze von drei Temperaturfenstern, nicht
ein Fehler in der Aggregation (das Minimum ist bereits die schärfere Form).

**Eingebaut als Gegenmittel:** Neben dem Wert steht jetzt, **wie häufig** ein Wert
dieser Höhe vorkommt („so hoch oder höher an 23 % aller Saisontage — im September
sogar an 39 %"). Damit wirkt eine 100 nicht mehr wie ein Ausnahmetag.
Stufentabelle in `arten.json` unter `befundmodell.haeufigkeit`.

⚠️ **Nicht verwechseln:** Das ist eine Einordnung des **fertigen Index** (monoton)
— nicht die verworfene Perzentil-Messung von **Einzelgrößen**, die an
Optimalfenstern scheitert (siehe Befund 2 oben).

**Offen:** Was die Kernsaison wirklich unterscheiden könnte, ist der Regen — der
steht bisher nur als Kontext daneben, weil er über die ganze Saison schwach
trennt (Hebel 1,14) und im Minimum Fundtage kostet (88 % → 62 %). Ob er
**innerhalb** der Kernsaison mehr taugt, ist noch nicht gemessen.

### Zwei Vorschläge von Andrej dazu — geprüft (05.09.)

**a) Bodenfeuchte als viertes Fenster ins Minimum** (`soil_moisture_0_to_7cm`,
„bildet Wasserverfügbarkeit direkter ab als lückenhafter Regen"). Sachlich
richtig — ändert an der Trennschärfe aber nichts:

| | Median | Wert 100 an | Hebel (≥ 85) |
|---|---|---|---|
| Saison, ohne Feuchte | 62,5 | 22,5 % | 2,48 |
| Saison, **mit** Feuchte | 60,0 | 22,1 % | 2,57 |
| Kernsaison Sep+Okt, ohne | 90,0 | 38,6 % | 1,51 |
| Kernsaison Sep+Okt, **mit** | 88,8 | 37,9 % | 1,56 |

⚠️ **Diesmal war es kein Methodenfehler** — geprüft wurde ausdrücklich als
**Fenster**, mit belegter Untergrenze (0,233 = trockenster Fund) und **nach oben
offen**, weil Staunaße in diesen Daten nirgends belegt ist. Der Gewinn liegt bei
+0,05 Hebel: Rauschen. Grund: 0,233 wird im September/Oktober fast immer
überschritten. Um zu trennen, müsste die Grenze auf ~0,29 (Median der Funde) —
dann fällt die Hälfte der eigenen Fundtage heraus und die Grenze wäre aus
denselben neun Punkten gefischt. **Nicht aufgenommen.**

⚠️ **Der Hebel in der Kernsaison ist 1,51 statt 2,48.** Wert B trennt dort kaum —
mit oder ohne Feuchte. Das bestätigt den Befund oben.

**b) Nach Dürre verschiebt sich die Latenz auf 14–20 Tage.** An den **echten
Fundkoordinaten** gerechnet (nicht am Revierpunkt — der liefert falsche Latenzen,
für den 24.10.2022 etwa 27 statt 4 Tage):

```
Fundtag       Regen -30..-15   Regen -14..0   seit >=10 mm
2019-10-12          27,5 mm       76,7 mm          8 d
2020-07-11          55,5 mm       67,9 mm         10 d
2022-09-28          20,8 mm       43,3 mm          1 d
2022-10-03          31,0 mm       37,2 mm          6 d
2022-10-08          32,0 mm       36,5 mm         11 d
2022-10-18          43,5 mm       10,7 mm         21 d
2022-10-24          51,9 mm       28,0 mm          4 d
2023-08-04          30,7 mm      127,5 mm          1 d
2024-09-26          26,2 mm       36,5 mm          0 d
```

**Nicht prüfbar: kein einziger Fundtag hatte trockenen Vorlauf.** Alle neun
liegen zwischen 20,8 und 55,5 mm im Monat davor. Die Hypothese ist damit weder
bestätigt noch widerlegt — es gibt schlicht keinen Fall. Und der 21-Tage-Ausreißer
(18.10.2022) hatte einen **nassen** Vorlauf, die Dürre-Erklärung greift dort nicht.

⚠️ **Der Befund dahinter:** Andrej hat nie nach einer Trockenperiode gefunden —
oder er ist nach einer Trockenperiode nie losgegangen. Ohne Nullfund-Tage nicht
zu unterscheiden. Das ist dieselbe Grenze wie oben, und sie blockiert jetzt zum
**zweiten Mal** eine konkrete Frage. Die Entscheidung vom 04.09. (ohne Nullfunde
arbeiten) bleibt Andrejs — aber jeder künftige Waldgang **ohne** Fund wäre ab
sofort wertvoller als der nächste Fundtag. `pilz-radar-fotos\ohne-fund\` steht
leer bereit; ein Foto vom Waldweg mit GPS genügt.

## Ein Fehler beim ersten Benutzen (05.09.): Stellen verschwanden

Andrej trug zwei Stellen ein — eine war weg. Nachgestellt und
behoben: Der Zustand lag im Arbeitsspeicher **je Tab**, gespeichert wurde aber in
denselben `localStorage`. Zwei offene Tabs überschrieben sich gegenseitig; wer
zuletzt schrieb, löschte die Stellen des anderen.

**Behoben:** `sichereStellen()` liest vor jedem Schreiben den aktuellen Stand und
übernimmt, was der eigene Tab nicht kennt (`zustand.geloescht` verhindert, dass
gelöschte Stellen zurückkehren). Dazu ein `storage`-Listener, damit ein Tab
Veränderungen des anderen sofort übernimmt. Beides im Browser geprüft: vier
Stellen aus zwei Tabs bleiben erhalten, Gelöschtes kehrt nicht zurück.

## Gangprotokoll (05.09., auf Andrejs Wunsch)

Ein Eingabefenster in der Seite: **Datum, Stelle, Fund oder kein Fund**, bei einem
Fund zusaetzlich Art und Anzahl, dazu eine Notiz. Damit entstehen die
**Nullfund-Tage**, an denen bisher beide Modelle scheitern — ohne Umweg ueber
Fotos mit EXIF (Andrejs Fall vom 22.08.2026 war ein *Video*, aus dem sich der Ort
nicht ohne Weiteres lesen liess).

- Speicher: `localStorage` unter `pilzradar.gaenge`, **zusammenfuehrend**
  geschrieben wie die Stellen (zwei Tabs koennen sich nicht ueberschreiben).
- Beim Eintragen werden **SPI und Befundwert des Tages mitgespeichert** — aus der
  geladenen Reihe oder dem Zwischenspeicher der jeweiligen Stelle. Fehlen sie,
  bleibt das Feld leer (Regel 4); rekonstruierbar sind sie ohnehin, weil Datum
  und Koordinate im Eintrag stehen.
- **Sichern / Aus Datei laden**: JSON-Datei, additiv importiert (vorhandene
  Eintraege bleiben unberuehrt).
  ⚠️ Die Datei enthaelt **Koordinaten** — sie gehoert nicht ins Repo. Der Hinweis
  steht auch in der Oberflaeche.
- Ein Gang **ohne** Fund wird nicht blass dargestellt. Er ist der wertvollere.

### Erster Pruefpunkt — und er sitzt

Andrej, 22.08.2026, eine seiner Stellen, **kein Fund**. Probeweise durchgerechnet:

| | Wert |
|---|---|
| SPI | **17** — niedrig, passt zum Nullfund |
| Befundmodell | **100** — passt **nicht** |

⚠️ Gerechnet mit einer **Platzhalterkoordinate** (51,9 / 8,3), nicht mit Andrejs
echten Stelle — seine Zahlen koennen abweichen. Aber die Richtung deckt sich
mit dem gemessenen Befund oben: **Wert B ist in der Saison zu grosszuegig.** Der
allererste Nullfund-Tag ist damit ein Gegenbeleg fuer Wert B und ein Beleg fuer
Wert A. Genau dafuer ist das Protokoll da.

## Datenquelle: Open-Meteo

Gesetzt, aus einem harten Grund: Pages ist statisch, es gibt keinen Server, der
einen API-Schlüssel verstecken könnte. **Open-Meteo verlangt keinen** und setzt
`access-control-allow-origin: *` — direkt aus dem Browser abrufbar.

- Vorhersage + Rückblick: `api.open-meteo.com/v1/forecast`
  (`past_days` bis 92, `forecast_days` bis 16, ein Abruf ~16 KB)
- Historie: `archive-api.open-meteo.com/v1/archive` (reicht Jahrzehnte zurück)
- Nützliche Felder: `precipitation_sum`, `soil_temperature_0_to_7cm`,
  `soil_moisture_0_to_7cm` (Archiv) bzw. `soil_temperature_6cm`,
  `soil_moisture_3_to_9cm` (Vorhersage). ⚠️ Die Feldnamen **unterscheiden sich
  zwischen beiden APIs** — das kostet sonst eine Debug-Runde.

---

## Was die Daten sagen (Stand 04.09.2026)

Grundlage: 14 Fundfotos aus 2019–2025, 12 mit Koordinate, 13 verschiedene Tage.
Reviere: **Ostwestfalen** (~52° N / 8,3° E, 110–145 m) und **Sauerland**
(~51,5° N / 8,1° E, bis 342 m). Nicht Brandenburg — eine frühere Annahme, die
sich als falsch erwies.

Fundtage gegen **alle 845 Saisontage (Aug–Nov 2019–2025)** desselben Reviers:

| Größe | typischer Tag | Fundtage | Perzentile der Fundtage |
|---|---|---|---|
| Regen 14 Tage | 26,8 mm | 39,3 mm | 15, 43, 65, 70, 71, 73, 88, 95, 100 |
| Bodenfeuchte 0–7 cm | 0,220 | 0,246 | 41, 58, 61, 63, 71, 74, 80, 95, 96 |
| Bodentemperatur 0–7 cm | 14,5 °C | 15,4 °C | 19, 29, 43, 44, 55, 55, 57, 58, 69 ⚠️ irreführend, s. Befund 2 |

1. **Feuchte schiebt, schwach.** Kein Schwellenwert trennt sauber — ein Fund lag
   im 15. Perzentil.
2. ~~**Bodentemperatur trägt nichts bei.**~~ ❌ **WIDERRUFEN (04.09., abends).**
   Das war ein **Methodenartefakt**: Perzentile messen monoton („mehr ist
   besser"), ein **Optimalfenster** ist nicht monoton. Ein Fenster in der Mitte
   der Verteilung erzeugt zwangsläufig gleichverteilte Perzentile — genau das
   hatte ich gemessen und falsch gedeutet. Gegen ein Fenster geprüft trennt die
   Bodentemperatur **gut**: 12–18 °C trifft **75 %** der Fundtage, aber nur
   **36 %** der Saisontage. Siehe „Das Fachmodell" unten.
3. **„10–14 Tage nach Regen" hält nicht.** Tage seit letztem Starkregen
   (≥10 mm) bei den Funden: 0, 1, 1, 4, 6, 6, 8, 9, 10, 11, 21.
4. **Der Ort zählt, nicht „das Wetter".** Am selben Stichtag: Bodenfeuchte an
   Andrejs Stelle 0,323, an einem willkürlichen Punkt 0,147.

⚠️ **Der Vergleich ist verzerrt.** „Alle Saisontage" enthält Tage, an denen
Andrej nicht draußen war — gemessen wird also teilweise, *wann er rausgeht*.
Nur echte Nullfund-Tage würden das auflösen. **Andrej hat entschieden
(04.09.), vorerst ohne sie zu arbeiten.** Diese Entscheidung ist gefallen —
nicht erneut aufrollen, nur die Konsequenz beim Formulieren der Anzeige
mittragen: **keine kalibrierte Wahrscheinlichkeit, sondern eine
Ähnlichkeitsaussage.**

## ⚠️ Artzuordnung nachgetragen (04.09., spät) — Datengrundlage geändert

Andrej hat die fünf zuvor unbestimmten Röhrlinge zugeordnet, indem er die Fotos
umbenannt hat. **Vier sind Steinpilze, einer ist eine Marone.**

| Tag | jetzt | Bemerkung |
|---|---|---|
| 11.07.2020 | Steinpilz | mehrere Pilze, mindestens einer |
| 18.10.2022 | Steinpilz | drei Stück |
| 24.10.2022 | Steinpilz | **überständig** |
| 26.09.2024 | Steinpilz | **alter Fruchtkörper** |
| 19.10.2024 | **Marone** | ❌ fällt aus der Steinpilz-Kalibrierung |

**Folgen für die Modelle** (jetzt 9 verschiedene Steinpilz-Tage / 10 Tag-Ort-Einträge):

1. **Die Temperaturfenster halten das aus** — Boden 80 % / 36 %, Luft Tag 80 % / 39 %,
   Luft Nacht 80 % / 46 %. Hebel 2,2 / 2,1 / 1,7. Kaum bewegt.
2. **Der SPI verliert.** Der 19.10.2024 war **der einzige Fundtag, den der reparierte
   SPI hoch bewertete** (70,3) — und er war eine Marone. Von den Steinpilz-Tagen
   erreicht nur noch **einer von zehn** die Marke 70 (11.07.2020), drei von zehn die
   Marke 40. Das schwächt Wert A weiter.
3. ❌ **Alters-Hypothese geprüft und verworfen.** Vermutung war: Bei überständigen
   Pilzen liegt das auslösende Ereignis weiter zurück, was die zerrissene Latenz
   erklären würde. **Das Gegenteil steht in den Daten** — die zwei alten Funde haben
   die *kürzesten* Abstände (0 und 4 Tage), der 21-Tage-Ausreißer ist ein Fund
   *frischer* Steinpilze (18.10.2022). ⚠️ Bei den beiden alten Funden ist der Fototag
   ohnehin **nicht** der Erscheinungstag — ihre Latenzwerte sagen nichts.
   Auch ohne sie streuen die übrigen sieben über 1, 1, 6, 8, 10, 11, 21 Tage:
   **die Latenz bleibt widerlegt.**

⚠️ **Zwei Fotos tragen kein GPS** und fehlen in jeder Auswertung: Steinpilz
03.09.2021 und Fliegenpilz 14.11.2021. Wenn Andrej die Stellen noch weiß, ließen
sich zwei Fundtage nachtragen — das wären +20 % Stichprobe.

## Das Fachmodell (04.09. abends, von Andrej recherchiert und geprüft)

Andrej hat Optimal- und Grenzwerte aus der Fachliteratur zusammengetragen
(Niederschlag, Regendauer, Latenz, Boden-/Lufttemperatur, Temperaturimpuls,
Luftfeuchte, Wind). **Entscheidend ist die Form:** beidseitige **Fenster** mit
Hemmung nach oben und unten, mehrere Bedingungen **gleichzeitig**, plus ein
auslösendes Ereignis. Das ist etwas anderes als ein Perzentil-Rang — und es
trennt besser.

Geprüft: **10 Steinpilz-Einträge** (9 verschiedene Tage) an ihren eigenen
Koordinaten gegen 854 Saisontage (Aug–Nov 2019–2025) am Revierpunkt Ostwestfalen.
Stand nach der Artzuordnung vom 04.09.

| Kriterium (Fachwert) | Fundtage | Saisontage | |
|---|---|---|---|
| Lufttemperatur Tag 15–22 °C | 80 % | 39 % | **trennt** |
| Lufttemperatur Nacht 8–14 °C | 80 % | 46 % | **trennt** |
| Bodentemperatur 12–18 °C | 80 % | 36 % | **trennt** |
| Regenereignis 25–50 mm, Latenz 8–14 d | 50 % | 27 % | trennt, s. u. |
| nicht zu trocken (≥15 mm/15 d) | 92 % | 79 % | schwach |
| nicht zu nass (≤80 mm/15 d) | 92 % | 95 % | — |
| kein Frost | 100 % | 97 % | — |
| Luftfeuchte > 75 % (Tagesmittel) | 50 % | 68 % | trennt **nicht** |
| Wind < 25 km/h | 60 % | 84 % | trennt **nicht** |
| Temperaturimpuls −4…−8 °C / 24–48 h | 60 % | 89 % | trennt **nicht** |

**Was daraus folgt:**

1. **Die Temperaturfenster tragen.** Sie sind der stärkste Teil des Modells —
   und sie stammen aus der Literatur, nicht aus den Daten. Das ist eine
   *Vorhersage, die sich bestätigt hat*, kein gefischter Zusammenhang.
2. **Die Latenz 8–14 Tage hält weiterhin nicht.** Bei **6 von 12** Fundtagen
   gibt es im Latenzband gar kein Regenereignis (25–50 mm über 3–5 Tage).
   Am 18.10.2022 fiel in 15 Tagen 10,7 mm — und es stand trotzdem etwas.
3. **Drei Kriterien trennen negativ** (Impuls, Wind, Luftfeuchte). ⚠️ Das ist
   **nicht dasselbe wie widerlegt** — meine Operationalisierung ist grob: der
   Impuls als „irgendein Abfall 4–8 °C in 14 Tagen" trifft fast jeden Tag, und
   die Literatur sagt „morgens > 85 %", gemessen wurde das Tagesmittel.
   Nachschärfbar, wenn es lohnt.

**Ausbeute der Kombinationen** (Anteil Fundtage / Anteil Saisontage = Hebel):

| Modell | Fundtage | Saisontage | Hebel | Tage/Saison |
|---|---|---|---|---|
| Luft Tag + Nacht | 75 % | 28,7 % | 2,6 | ~35 |
| alle drei Temperaturfenster | 58 % | 22,5 % | 2,6 | ~27 |
| Temperatur + Regenereignis | 33 % | 4,9 % | 6,8 | **~6** |
| ≥ 7 von 10 Kriterien | 92 % | 49,5 % | 1,9 | ~60 |

⚠️ **Überanpassung im Blick behalten.** Für die Kombinationstabelle wurden
mehrere hundert Varianten durchprobiert — bei **12** Fundtagen findet man immer
etwas. Der Hebel 6,8 ruht auf **4** Fundtagen. Belastbar ist der Teil, der
*vorher* aus der Literatur kam (die Temperaturfenster), nicht der bestsortierte
Ausschnitt.

**Verworfen: Perzentil-Rang als Anzeigeform.** Er kann Optimalfenster
grundsätzlich nicht abbilden (siehe Befund 2). Die Anzeige zeigt **Fenster mit
Lage darin**, nicht „nasser als X % der Tage".

## Die SPI-Spezifikation (PDF, 04.09. abends) — GEPRÜFT, NICHT ÜBERNOMMEN

`steinpilz_radar_berechnungsformel.pdf` (5 Seiten, „Version 1.0") beschreibt
einen Steinpilz-Wachstumsindex **SPI 0–100** aus vier multiplikativ verknüpften
Teilscores, mit Trapez-Übergangsfunktionen und Gauß-gewichtetem Vorregen.
Kopie + Prüfskripte: `C:\Projects\pilz-radar-fotos\` (`spi.py`, `spi2.py`).

**Gemessen, nicht gemeint** — Spezifikation wörtlich implementiert, gegen
12 Fundtage und 854 Saisontage gerechnet:

> **Kein einziger Tag erreicht je über SPI 40.** Weder einer der 854 Saisontage
> noch einer der 12 Fundtage. Die Klassen „Mäßig" (40–69), „Gut" (70–84) und
> „Hauptschub" (85–100) sind **mathematisch unerreichbar**. Das Modell zeigt
> immer „Gering". Median: Fundtage 20,9 · Saisontage 15,4.

**Fehler 1 — Einheitenfehler beim Vorregen (der tödliche).** Formel 3 normiert
die Gauß-Gewichte auf Summe 1. Damit ist `R_eff` ein **Tagesmittel**, kein
Fenstersumme. Die Schwellen (15 / 25–50 / 80 mm) sind aber Summenwerte über ein
mehrtägiges Fenster. Gemessen liegt `R_eff` bei 0,2–8,1 mm, die Untergrenze bei
15 → `S_rain_amount` ist praktisch immer 0 → `S_regen ≤ 0,30` → **SPI ≤ 30 mit
hartem Deckel**. Faktor ~8 zwischen Formel und Parametertabelle.

**Fehler 2 — ∆Tdrop misst das Falsche.** Definiert als
`max(Tmax(t−d) − Tmin(t−d))` — das ist die **Tagesspanne** desselben Tages, kein
Temperatursturz zwischen Tagen. Eine Kaltfront wäre der Abfall *über* Tage.
Schlimmer: Die Tagesspanne ist bei **klarem, trockenem Hochdruck am größten** —
das Kriterium schlägt also genau bei dem Wetter an, das für Pilze schlecht ist.
Deshalb steht `S_impuls` fast durchgehend auf 1,0.

*(Klein: Die Referenzimplementierung paart `latency_rain[i]` mit `norm_w[i]` —
die Gewichte laufen rückwärts durchs Fenster, das Maximum landet bei Tag 11
statt 10. Neben den zwei großen Fehlern kosmetisch.)*

**Repariert** (R_eff als gewichtete **Summe**, Impuls als echter Sturz über
24–48 h) läuft das Modell und **trennt sogar** — aber es verfehlt seinen Zweck:

| Schwelle | Fundtage | Saisontage | Hebel | Tage/Saison |
|---|---|---|---|---|
| SPI ≥ 40 | 4/12 = 33 % | 10,1 % | 3,3 | 12 |
| SPI ≥ 55 | 3/12 = 25 % | 5,9 % | 4,3 | 7 |
| SPI ≥ 70 | 2/12 = 17 % | 2,7 % | 6,2 | 3 |

⚠️ **Acht von zwölf echten Fundtagen bewertet es als „Gering"** — 24.10.2022 mit
SPI 4,1, 26.09.2024 mit SPI 4,2. Ursache ist immer dieselbe: die Latenz 7–14 Tage
geht multiplikativ und dominant ein, und Andrejs Funde haben oft keinen Vorregen
in diesem Band (bereits als Befund 2 unter „Das Fachmodell" belegt).

**Konzeptioneller Einwand, unabhängig von den Fehlern:** Der SPI ist eine Zahl
0–100 mit Klassen wie „85–100: Perfektes Zusammentreffen". Das ist die
Prozentzahl-Anmutung, die **Regel 4** ausschließt und die Andrej am 04.09.
verworfen hat. Die Gewichte (0,70/0,30 · 0,40/0,30/0,30) und σ = 2,0 stehen
ohne Herleitung da. Die drei Referenzen (Martínez-Peña 2012, Büntgen 2012,
Boddy 2014) existieren und sind einschlägig — aber keine Formel wird auf sie
zurückgeführt.

### ✅ Was aus dem PDF übernommen wird

**Die Trapezfunktion `ftrap(x, a, b, c, d)`** — und zwar als Verbesserung
gegenüber den harten Ja/Nein-Fenstern. Ein Tag mit 11,8 °C Bodentemperatur ist
nicht „draußen", er ist „fast drin". Toleranzintervall `[a, d]`, Optimalplateau
`[b, c]`; die Werte der Parametertabelle sind mit Andrejs Fachrecherche
identisch. **Nicht übernommen:** die Aggregation zu einer Gesamtzahl, die
Klassenbezeichnungen, die multiplikative Dominanz der Latenz.

### Zeiger-Hypothese Fliegenpilz

**12.10.2019:** 14:22 Fliegenpilz, 16:12 Steinpilz, 1,44 km auseinander.
Ein einziger Beleg — prüfbar gemacht, nicht bewiesen. Für den Fliegenpilz
liegen nur 3 Tage vor (2 mit Koordinate).

---

## Repo-Inhalt

```
CLAUDE.md              diese Datei
README.md              Kurzbeschreibung fürs öffentliche Repo
daten/arten.json       Steinpilz + Fliegenpilz; "regel"-Felder bewusst LEER
werkzeug/exif_gps.py       Ort + Datum aus Bilddateien (Pillow, kein exiftool)
werkzeug/ausfluege.py      Fotos zu Ausflügen bündeln (Tag + 400 m),
                           Wohnort-Referenz gegen Küchentisch-Fotos
werkzeug/vorgeschichte.py  Wetter-Vorgeschichte je Foto-Tag aus dem Archiv
werkzeug/README.md         Bedienung der drei Werkzeuge
```

Außerhalb des Repos, **nicht** versioniert:

```
C:\Projects\pilz-radar-fotos\funde\steinpilz\     6 Fotos
C:\Projects\pilz-radar-fotos\funde\fliegenpilz\   3 Fotos
C:\Projects\pilz-radar-fotos\funde\andere\        5 Röhrlinge, Art unklar
C:\Projects\pilz-radar-fotos\ohne-fund\           leer (bewusst)
werkzeug\ausfluege.json        986 Ausflüge aus C:\ordner-fotos
werkzeug\vorgeschichte.json    Kennzahlen je Fundtag
werkzeug\sichtung-lokal.md     47 Herbst-Ausflüge zum Abhaken
```

⚠️ **Telegram/WhatsApp entfernen EXIF vollständig.** Es braucht immer
Originaldateien vom Gerät oder von der NAS.
⚠️ `C:\ordner-fotos` (8466 Bilder) ist **unvollständig** — das Meiste liegt auf
der NAS unter `/volume1/homes/andrej/Photos`.

---

## Offen — in dieser Reihenfolge

1. ~~Andrej: die 5 Röhrlinge zuordnen.~~ ✅ **erledigt 04.09.** — per Umbenennung:
   4 Steinpilze, 1 Marone. Folgen oben unter „Artzuordnung nachgetragen".
   ⚠️ **Neu offen:** die zwei Fotos ohne GPS (03.09.2021, 14.11.2021) — weiß
   Andrej die Stellen noch?
2. ~~Fachliteratur holen und gegen die eigenen Funde halten.~~ ✅ **erledigt
   04.09. abends** — Andrej hat recherchiert, geprüft ist es auch. Ergebnis
   oben unter „Das Fachmodell". Die `regel`-Felder in `arten.json` können jetzt
   gefüllt werden: **nur die Fenster, die getrennt haben**, mit Quelle und Stand.
3. ~~Stufe 1 bauen.~~ ✅ **erledigt 05.09.** Beide Werte gleichrangig, Fenster
   mit Trapezlage, Trennkraft je Kriterium, Vorbehalt sichtbar auf der Seite.
   ⚠️ **Aggregation von Wert B auf MINIMUM geändert** (statt gewichtetem
   Mittelwert): Der Mittelwert stand an **40,3 %** aller 854 Saisontage über 90
   und hätte sich kaum bewegt. Das Minimum hat Median 62,5 statt 80,8, steht nur
   an 30,6 % der Tage über 90 und trennt besser (Hebel **2,48** statt 1,89 bei
   Schwelle 85) — ohne Fundtage zu verlieren (88 % in beiden Varianten).
   Sachlich ist es zudem die begründete Form: ein verletztes Fenster wird nicht
   dadurch gut, dass die anderen passen. Regen als vierte Größe im Minimum
   geprüft und **verworfen** (Trefferquote fällt von 88 % auf 62 %).
4. **Andrej: Pages einschalten.**
5. Später: mehrere Stellen + Gangprotokoll → Karte → Eichung.

Für Stufe 1 gibt es **noch keinen Bauenden** — die vorhandenen Rat-Mitglieder
decken Bot und Brunnen-Workspace ab, nicht eine eigenständige Pages-App.

---

## Was hier nicht passieren darf

- Koordinaten committen (siehe Regel 2).
- Die globale Git-Identität ändern.
- Auf der NAS deployen — Container-Ops brauchen `sudo` und macht **Andrej**.
- Eine Prozentzahl anzeigen, die nicht aus Daten stammt.
