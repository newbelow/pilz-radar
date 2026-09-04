# -*- coding: utf-8 -*-
"""Holt zu jedem Foto-Tag die Wetter-Vorgeschichte aus dem Open-Meteo-Archiv."""
import os, sys, json, math, time, urllib.request, urllib.parse
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from exif_gps import lies
from datetime import date, timedelta

ARCHIV = 'https://archive-api.open-meteo.com/v1/archive?'

def hol(lat, lon, tag, tage_zurueck=35):
    d = date.fromisoformat(tag)
    q = urllib.parse.urlencode({
        'latitude': round(lat, 3), 'longitude': round(lon, 3),
        'start_date': (d - timedelta(days=tage_zurueck)).isoformat(),
        'end_date': tag,
        'daily': 'precipitation_sum,temperature_2m_max,temperature_2m_min',
        'hourly': 'soil_temperature_0_to_7cm,soil_moisture_0_to_7cm',
        'timezone': 'Europe/Berlin'})
    for versuch in range(3):
        try:
            return json.load(urllib.request.urlopen(ARCHIV + q, timeout=60))
        except Exception as e:
            if versuch == 2: raise
            time.sleep(3)

def kennzahlen(d):
    dd = d['daily']; h = d['hourly']
    regen = [x or 0.0 for x in dd['precipitation_sum']]
    def summe(n): return round(sum(regen[-n:]), 1)
    # letzter Tag mit >=10 mm, gezaehlt vom Fundtag rueckwaerts
    seit = None
    for i in range(len(regen) - 1, -1, -1):
        if regen[i] >= 10.0:
            seit = len(regen) - 1 - i; break
    mittags = [(t, h['soil_temperature_0_to_7cm'][i], h['soil_moisture_0_to_7cm'][i])
               for i, t in enumerate(h['time']) if t[11:13] == '12']
    bt = bf = None
    if mittags:
        bt, bf = mittags[-1][1], mittags[-1][2]
    feuchten = [m[2] for m in mittags if m[2] is not None]
    return {
        'regen7': summe(7), 'regen14': summe(14), 'regen21': summe(21), 'regen31': summe(31),
        'tage_seit_starkregen': seit,
        'boden_temp': bt, 'boden_feuchte': bf,
        'feuchte_min': round(min(feuchten), 3) if feuchten else None,
        'feuchte_max': round(max(feuchten), 3) if feuchten else None,
        'tmax': dd['temperature_2m_max'][-1], 'tmin': dd['temperature_2m_min'][-1],
    }

def aus_ordner(root, art):
    out = []
    for dp, dn, fn in os.walk(root):
        for f in sorted(fn):
            if not f.lower().endswith(('.jpg', '.jpeg', '.heic')): continue
            r = lies(os.path.join(dp, f))
            if 'lat' not in r or not r.get('datum'): continue
            out.append({'datei': f, 'art': art,
                        'tag': str(r['datum'])[:10].replace(':', '-'),
                        'lat': r['lat'], 'lon': r['lon']})
    return out

if __name__ == '__main__':
    basis = sys.argv[1] if len(sys.argv) > 1 else r"C:\Projects\pilz-radar-fotos"
    eintraege = []
    for ordner, art in (('funde', 'Fund'), ('ohne-fund', 'kein Fund')):
        p = os.path.join(basis, ordner)
        if os.path.isdir(p): eintraege += aus_ordner(p, art)
    # ein Abruf je Tag+Ort
    gesehen = {}
    for e in eintraege:
        k = (e['tag'], round(e['lat'], 2), round(e['lon'], 2))
        if k in gesehen: continue
        gesehen[k] = e
    print(f"{len(eintraege)} Fotos -> {len(gesehen)} verschiedene Tag/Ort-Kombinationen\n")
    erg = []
    for (tag, la, lo), e in sorted(gesehen.items()):
        k = kennzahlen(hol(e['lat'], e['lon'], tag))
        k.update({'tag': tag, 'art': e['art'], 'lat': e['lat'], 'lon': e['lon'], 'datei': e['datei']})
        erg.append(k)
        print('.', end='', flush=True)
    print('\n')
    ziel = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'vorgeschichte.json')
    json.dump(erg, open(ziel, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    print(f"-> {ziel}\n")
    print(f"{'Tag':12}{'Art':11}{'R7':>6}{'R14':>7}{'R21':>7}{'R31':>7}{'seit':>6}{'BodT':>7}{'Feu':>7}")
    for r in erg:
        seit = '-' if r['tage_seit_starkregen'] is None else f"{r['tage_seit_starkregen']}d"
        bt = '-' if r['boden_temp'] is None else f"{r['boden_temp']:.1f}"
        bf = '-' if r['boden_feuchte'] is None else f"{r['boden_feuchte']:.3f}"
        print(f"{r['tag']:12}{r['art']:11}{r['regen7']:6.1f}{r['regen14']:7.1f}{r['regen21']:7.1f}{r['regen31']:7.1f}{seit:>6}{bt:>7}{bf:>7}")
