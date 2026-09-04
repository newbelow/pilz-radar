# -*- coding: utf-8 -*-
"""Bündelt Fotos zu Ausflügen: gleicher Tag + räumlich beieinander."""
import os, sys, math, json
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from exif_gps import lies

def km(a, b):
    R=6371.0
    p1,p2=math.radians(a[0]),math.radians(b[0])
    dp=p2-p1; dl=math.radians(b[1]-a[1])
    h=math.sin(dp/2)**2+math.cos(p1)*math.cos(p2)*math.sin(dl/2)**2
    return 2*R*math.asin(math.sqrt(h))

def sammle(root):
    out=[]
    for dp,dn,fn in os.walk(root):
        for f in fn:
            if not f.lower().endswith(('.jpg','.jpeg','.heic')): continue
            r=lies(os.path.join(dp,f))
            if 'lat' in r and r.get('datum'):
                out.append({'pfad':os.path.join(dp,f),'datei':f,
                            'tag':str(r['datum'])[:10].replace(':','-'),
                            'zeit':str(r['datum'])[11:16],
                            'lat':r['lat'],'lon':r['lon']})
    return out

def zuhause(fotos, raster=0.005):
    """Häufigster Aufenthaltsort ueber alle Fotos = Wohnort."""
    z={}
    for f in fotos:
        k=(round(f['lat']/raster), round(f['lon']/raster))
        z.setdefault(k,[]).append(f)
    top=max(z.values(), key=len)
    return (sum(f['lat'] for f in top)/len(top), sum(f['lon'] for f in top)/len(top)), len(top)

def ausfluege(fotos, heim, radius_km=0.4):
    """Pro Tag raeumlich gruppieren."""
    tage={}
    for f in fotos: tage.setdefault(f['tag'],[]).append(f)
    res=[]
    for tag, fs in tage.items():
        fs.sort(key=lambda x:x['zeit'])
        gruppen=[]
        for f in fs:
            for g in gruppen:
                if km((f['lat'],f['lon']), g['mitte'])<=radius_km:
                    g['fotos'].append(f)
                    n=len(g['fotos'])
                    g['mitte']=((g['mitte'][0]*(n-1)+f['lat'])/n,(g['mitte'][1]*(n-1)+f['lon'])/n)
                    break
            else:
                gruppen.append({'mitte':(f['lat'],f['lon']),'fotos':[f]})
        for g in gruppen:
            res.append({'tag':tag,'n':len(g['fotos']),'mitte':g['mitte'],
                        'km_von_zuhause':round(km(g['mitte'],heim),1),
                        'von':g['fotos'][0]['zeit'],'bis':g['fotos'][-1]['zeit'],
                        'fotos':[x['pfad'] for x in g['fotos']]})
    return res

if __name__=='__main__':
    root=sys.argv[1] if len(sys.argv)>1 else r"C:\ordner-fotos"
    fotos=sammle(root)
    heim,nheim=zuhause(fotos)
    alle=ausfluege(fotos,heim)
    herbst=[a for a in alle if a['tag'][5:7] in ('08','09','10','11')]
    auswaerts=[a for a in herbst if a['km_von_zuhause']>1.5 and a['n']>=2]
    auswaerts.sort(key=lambda a:(-a['n']))
    print(f"Fotos mit Ort+Datum: {len(fotos)}")
    print(f"Wohnort-Cluster: {nheim} Fotos (Referenzpunkt, Koordinate nicht ausgegeben)")
    print(f"Ausfluege gesamt: {len(alle)} | im Herbst (Aug-Nov): {len(herbst)}")
    print(f"Davon auswaerts (>1,5 km, min. 2 Fotos): {len(auswaerts)}")
    ziel=os.path.join(os.path.dirname(os.path.abspath(__file__)),'ausfluege.json')
    json.dump(auswaerts, open(ziel,'w',encoding='utf-8'), ensure_ascii=False, indent=1)
    print(f"-> {ziel}")
    print()
    print("Die groessten Herbst-Ausfluege auswaerts:")
    print(f"{'Tag':12}{'Fotos':>6}{'km':>7}  Zeitfenster")
    for a in auswaerts[:25]:
        print(f"{a['tag']:12}{a['n']:6}{a['km_von_zuhause']:7.1f}  {a['von']}-{a['bis']}")
