# werkzeug/

Hilfsskripte, die **lokal** laufen — nicht Teil der Webapp.

## exif_gps.py

Liest Aufnahmedatum und GPS-Koordinaten aus Bilddateien (Pillow, kein exiftool
nötig). Zweck: aus alten Pilzfotos rückwirkend Fundort **und** Funddatum
gewinnen.

```bash
python werkzeug/exif_gps.py "C:/Pfad/zu/fotos/*.jpg"
```

⚠️ **Die Ausgabe gehört nicht in dieses Repo.** Es ist öffentlich; Fundorte
bleiben lokal.

⚠️ **Fotos aus Telegram haben kein EXIF.** Der Messenger entfernt es
vollständig — es braucht die Originaldateien vom Gerät.

## ausfluege.py

Bündelt Fotos zu "Ausflügen": gleicher Tag + räumlich innerhalb 400 m. Bestimmt
den häufigsten Aufenthaltsort als Wohnort-Referenz, damit Fotos vom Küchentisch
nicht als Fundort durchgehen, und gibt die Entfernung von dort an.

```bash
python werkzeug/ausfluege.py "C:/ordner-fotos"
```

Schreibt `ausfluege.json` **neben das Skript** — nicht ins Repo committen.

⚠️ Cluster-Größe allein ist kein Pilzindiz: Der größte Herbst-Cluster im
Nahbereich (2019-09-20, 18 Fotos) war eine Fortbildung, abfotografierte
Vortragsfolien. Es braucht den Blick aufs Bild.
