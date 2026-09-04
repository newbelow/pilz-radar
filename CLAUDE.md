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
   Auswertungsdateien mit Ortsbezug. Vor jedem Commit prüfen:
   `git ls-files` und `git grep -E "5[0-9]\.[0-9]{4}"`.
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
Zwei Beispiele aus diesem Projekt: Die Bodentemperatur trennt nichts, und
„10–14 Tage nach Regen" hält Andrejs eigenen Funden nicht stand.

---

## Stand (04.09.2026)

**Kette steht, App existiert noch nicht.** Es gibt bisher nur Werkzeuge und
ausgewertete Daten — keine einzige Zeile Oberfläche. Das ist Absicht: Erst
sollte sich zeigen, ob überhaupt etwas Anzeigbares herauskommt.

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
| Bodentemperatur 0–7 cm | 14,5 °C | 15,4 °C | 19, 29, 43, 44, 55, 55, 57, 58, 69 |

1. **Feuchte schiebt, schwach.** Kein Schwellenwert trennt sauber — ein Fund lag
   im 15. Perzentil.
2. **Bodentemperatur trägt nichts bei.** Perzentile gleichverteilt. Nicht
   anzeigen, nur weil es nach Wissenschaft aussieht.
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

1. **Andrej: die 5 Röhrlinge in `funde\andere\` zuordnen.** Steinpilz oder
   Marone? Auf Fotos nicht sicher zu trennen.
2. **Fachliteratur zu Wachstumsbedingungen holen** und gegen die eigenen Funde
   halten (Andrejs Plan). Erst danach die `regel`-Felder in `arten.json` füllen.
3. **Stufe 1 bauen:** eine Stelle, Kennzahlen sichtbar, Einschätzung mit
   offener Begründung. Kein Prozentwert, keine Karte, keine Datenbank.
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
