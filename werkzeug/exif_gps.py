# -*- coding: utf-8 -*-
"""Liest Aufnahmedatum und GPS-Koordinaten aus Bilddateien."""
import sys, os, glob
from PIL import Image, ExifTags

GPSTAGS = {v: k for k, v in ExifTags.GPSTAGS.items()}

def _rat(x):
    try: return float(x)
    except Exception: return None

def dms(vals, ref):
    if not vals or len(vals) != 3: return None
    d, m, s = (_rat(v) for v in vals)
    if None in (d, m, s): return None
    val = d + m/60 + s/3600
    if ref in ('S', 'W'): val = -val
    return round(val, 6)

def lies(pfad):
    try:
        img = Image.open(pfad)
        ex = img.getexif()
    except Exception as e:
        return {'datei': os.path.basename(pfad), 'fehler': str(e)}
    if not ex:
        return {'datei': os.path.basename(pfad), 'exif': False}
    tags = {ExifTags.TAGS.get(k, k): v for k, v in ex.items()}
    # Aufnahmedatum steckt im Unter-IFD
    try:
        sub = ex.get_ifd(0x8769)
        for k, v in sub.items():
            tags.setdefault(ExifTags.TAGS.get(k, k), v)
    except Exception:
        pass
    out = {
        'datei': os.path.basename(pfad),
        'exif': True,
        'kamera': ' '.join(str(tags.get(t, '')).strip() for t in ('Make', 'Model')).strip() or None,
        'datum': tags.get('DateTimeOriginal') or tags.get('DateTime'),
    }
    try:
        g = ex.get_ifd(0x8825)
    except Exception:
        g = None
    if g:
        gt = {ExifTags.GPSTAGS.get(k, k): v for k, v in g.items()}
        lat = dms(gt.get('GPSLatitude'), gt.get('GPSLatitudeRef'))
        lon = dms(gt.get('GPSLongitude'), gt.get('GPSLongitudeRef'))
        if lat is not None and lon is not None:
            out['lat'], out['lon'] = lat, lon
            h = gt.get('GPSAltitude')
            if h is not None:
                out['hoehe_m'] = round(_rat(h) or 0, 1)
    return out

if __name__ == '__main__':
    ziele = []
    for a in sys.argv[1:]:
        ziele.extend(glob.glob(a)) if any(c in a for c in '*?') else ziele.append(a)
    for z in ziele:
        if os.path.isdir(z):
            for e in ('jpg','jpeg','JPG','JPEG','heic','HEIC','png'):
                ziele.extend(glob.glob(os.path.join(z, '*.'+e)))
            continue
        r = lies(z)
        koord = f"  {r['lat']}, {r['lon']}" if 'lat' in r else '  (kein GPS)'
        print(f"{r['datei'][:52]:54} {str(r.get('datum') or '-'):20}{koord}")
