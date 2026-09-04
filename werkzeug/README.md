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
