# pilz-radar

Eine kleine Webapp, die einschätzen soll, wie günstig die Bedingungen für
Pilzwachstum an bestimmten Waldstellen gerade sind — vorerst für **Steinpilz**,
mit dem **Fliegenpilz** als Zeiger.

Sie zeigt bewusst **keine Wahrscheinlichkeit**. Für die Fruktifikation von
Mykorrhizapilzen gibt es kein validiertes Vorhersagemodell; eine solche Zahl
würde eine Genauigkeit behaupten, die es nicht gibt. Stattdessen zeigt sie
**zwei Indizes von 0 bis 100 nebeneinander** und legt jede Größe offen, aus der
sie entstehen — samt der gemessenen Trennkraft und dem, was gegen sie spricht.

- **Wert A — SPI (repariert):** ein Index aus einer zugelieferten
  Formelspezifikation, mit zwei korrigierten Rechenfehlern.
- **Wert B — Befundmodell:** das schwächste von drei Temperaturfenstern aus der
  Fachliteratur, geprüft gegen eigene Fundtage.

Dass beide auseinanderlaufen können, ist beabsichtigt: Es ist die eigentliche
Information, solange keines von beiden geeicht ist.

## Stand

**Stufe 1 läuft** — Stellenverwaltung, Tagesreihe mit Vorhersage und
Detailansicht je Tag. Siehe [CLAUDE.md](CLAUDE.md) für den vollständigen
Projektstand samt aller Messungen.

## Starten

Die Seite ist statisch, braucht aber einen **lokalen Server** — über `file://`
blockiert der Browser den Abruf von `daten/arten.json`:

```
python -m http.server 8000
```

Dann `http://127.0.0.1:8000/` öffnen. Auf GitHub Pages läuft sie ohne dieses
Zutun.

⚠️ **Nach jeder Änderung an `app.js` oder `stil.css`** die Versionsmarke `?v=N`
in `index.html` erhöhen — sonst liefert der Browser die alte Fassung aus dem
Zwischenspeicher.

## Gangprotokoll

Jeder Waldgang laesst sich eintragen — **mit oder ohne Fund**. Die Tage *ohne*
Fund sind der eigentliche Zweck: Ohne sie misst jeder Vergleich mit, wann jemand
ueberhaupt rausgegangen ist, statt nur, wann etwas wuchs. Beim Eintragen werden
die beiden Indizes des Tages mitgespeichert, sodass sich spaeter pruefen laesst,
ob sie etwas taugten.

Ueber *Sichern* wird das Protokoll als JSON-Datei ausgegeben.
⚠️ Diese Datei enthaelt Koordinaten und gehoert **nicht** ins Repo.

## Stellen

Eigene Stellen werden **im Browser** gespeichert (`localStorage`) und verlassen
ihn nie — außer als Koordinate im Wetterabruf an Open-Meteo. Es sind **keine
Stellen vorbelegt**; die erste wird von Hand eingetragen.

## Wetterdaten

[Open-Meteo](https://open-meteo.com) — kostenlos, ohne API-Schlüssel, direkt aus
dem Browser abrufbar. Verwendet werden Niederschlagssummen sowie Bodentemperatur
und Bodenfeuchte in 0–7 cm Tiefe; das Archiv reicht Jahrzehnte zurück, sodass
sich zu vergangenen Funden die Wettervorgeschichte rekonstruieren lässt.

## Werkzeuge (`werkzeug/`)

Lokale Hilfsskripte, nicht Teil der Webapp: EXIF-Auswertung von Fotos
(Aufnahmeort und -datum), Bündelung zu Ausflügen und Abruf der
Wetter-Vorgeschichte je Fundtag. Details in [werkzeug/README.md](werkzeug/README.md).

## Zu den Daten

Dieses Repository enthält **keine Fundorte**. Koordinaten, Fotos und
Auswertungen bleiben lokal — Pilzstellen gehören nicht ins offene Netz.

## Kein Bestimmungswerkzeug

Diese Anwendung hilft nicht dabei, Pilze zu bestimmen, und trifft keine Aussage
über Essbarkeit. Der Fliegenpilz ist giftig und wird hier ausschließlich als
Indikator geführt.
