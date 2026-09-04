# pilz-radar

Eine kleine Webapp, die einschätzen soll, wie günstig die Bedingungen für
Pilzwachstum an bestimmten Waldstellen gerade sind — vorerst für **Steinpilz**,
mit dem **Fliegenpilz** als Zeiger.

Sie zeigt bewusst **keine Prozentzahl**. Für die Fruktifikation von
Mykorrhizapilzen gibt es kein validiertes Vorhersagemodell; eine Zahl würde eine
Genauigkeit behaupten, die es nicht gibt. Stattdessen legt sie die wenigen
Größen offen, auf die es ankommt, und sagt, wie ähnlich ein Tag früheren
Fundtagen ist.

## Stand

Werkzeuge und Datenauswertung stehen, die Oberfläche noch nicht. Siehe
[CLAUDE.md](CLAUDE.md) für den vollständigen Projektstand.

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
