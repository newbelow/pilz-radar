'use strict';

/* pilz-radar — Stufe 1.
 *
 * Reine Anzeigeschicht: holt Wetterdaten von Open-Meteo, rechnet zwei Indizes
 * und zeigt sie nebeneinander. Kein Server, keine Bibliothek, kein Build.
 *
 * Grundsätze aus CLAUDE.md, die hier im Code sichtbar sein müssen:
 *   - Keine erfundenen Zahlen. Fehlt ein Wert, bleibt "unbekannt" stehen und
 *     der betroffene Index wird gar nicht erst gerechnet.
 *   - Stellen (und damit Koordinaten) leben ausschliesslich im localStorage
 *     dieses Browsers. Im Repo steht keine einzige Koordinate.
 *   - Beide Werte sind gleichrangig. Kein Wort aus der Wahrscheinlichkeitswelt.
 */

/* ------------------------------------------------------------------ *
 * Konstanten
 * ------------------------------------------------------------------ */

var SP_STELLEN = 'pilzradar.stellen';
var SP_AKTIV   = 'pilzradar.stelle_aktiv';
var SP_WETTER  = 'pilzradar.wetter.';   // + Stellen-Id
var SP_GAENGE  = 'pilzradar.gaenge';    // Gangprotokoll (Fund UND Nullfund)
var CACHE_MS   = 3 * 60 * 60 * 1000;    // Verfallszeit des Wetter-Zwischenspeichers

/* Parameter des SPI. Quelle: steinpilz_radar_berechnungsformel.pdf,
 * Parametertabelle. Bewusst NICHT aus arten.json gelesen: arten.json trägt die
 * gegen die eigenen Funde geprüften Werte des Befundmodells, der SPI ist ein
 * fremdes Modell und soll sich nicht stillschweigend mitändern. */
var SPI = {
  regen_trapez:   [15, 25, 50, 80],   // auf die gewichtete SUMME angewandt (Korrektur 1)
  boden_trapez:   [6, 12, 18, 22],
  luft_trapez:    [5, 15, 22, 26],
  feuchte_ab:     60,                 // darunter 0
  feuchte_spanne: 25,                 // bis 85 % linear auf 1
  gew_rain: 0.70, gew_imp: 0.30,
  gew_boden: 0.40, gew_luft: 0.30, gew_feuchte: 0.30,
  wind_gut: 15, wind_schlecht: 30, wind_rest: 0.30,
  frost_grenze: -1.0                  // Tmin in den letzten 72 h (Fassung 2 der Spezifikation)
};

/* Die drei Kriterien des Befundmodells. Trapeze, Gewichte und die gemessenen
 * Anteile kommen aus daten/arten.json — hier steht nur, welches Tagesfeld
 * zu welchem Parameter gehört. */
var BEFUND_KRITERIEN = [
  { schluessel: 'lufttemperatur_tag_c',   name: 'Lufttemperatur Tag (Höchstwert)',   feld: 'tmax',  einheit: '°C' },
  { schluessel: 'bodentemperatur_c',      name: 'Bodentemperatur (12 Uhr)',           feld: 'tsoil', einheit: '°C' },
  { schluessel: 'lufttemperatur_nacht_c', name: 'Lufttemperatur Nacht (Tiefstwert)',  feld: 'tmin',  einheit: '°C' }
];

var zustand = {
  regel: null,        // regel-Objekt des Steinpilzes aus arten.json
  fallzahlen: null,   // _geprueft.fallzahlen aus arten.json - nie im Code wiederholen
  stellen: [],
  geloescht: {},      // in dieser Sitzung geloeschte Ids - duerfen nicht zurueckkehren
  gaenge: [],         // Gangprotokoll
  gaengeWeg: {},      // in dieser Sitzung geloeschte Gang-Ids
  aktiv: null,        // Id der aktiven Stelle
  tage: [],           // aufbereitete Tagesreihe (Rückblick + Vorhersage)
  reihe: [],          // angezeigte Tage samt Ergebnissen
  gewaehlt: null      // Datum des Detailtages
};

/* ------------------------------------------------------------------ *
 * Kleine Helfer
 * ------------------------------------------------------------------ */

function $(id) { return document.getElementById(id); }

function text(s) {
  return String(s).replace(/[&<>"']/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
  });
}

function istZahl(x) { return typeof x === 'number' && isFinite(x); }

/* Zahl mit deutschem Komma. Nichts erfinden: was fehlt, heisst "unbekannt". */
function zahl(x, stellen) {
  if (!istZahl(x)) { return 'unbekannt'; }
  var n = (stellen === undefined) ? 1 : stellen;
  return x.toLocaleString('de-DE', { minimumFractionDigits: n, maximumFractionDigits: n });
}

function fest(n) { return (Math.round(n * 10) / 10).toFixed(1); }

function leseSpeicher(schluessel) {
  try {
    var roh = window.localStorage.getItem(schluessel);
    return roh ? JSON.parse(roh) : null;
  } catch (f) { return null; }
}

function schreibeSpeicher(schluessel, wert) {
  try { window.localStorage.setItem(schluessel, JSON.stringify(wert)); return true; }
  catch (f) { return false; }
}

function loescheSpeicher(schluessel) {
  try { window.localStorage.removeItem(schluessel); } catch (f) { /* egal */ }
}

function zeigeHinweis(nachricht) {
  var k = $('hinweis');
  if (!nachricht) { k.hidden = true; k.textContent = ''; return; }
  k.hidden = false;
  k.innerHTML = nachricht;
}

/* Trapezfunktion aus der PDF-Vorlage (Formel 2):
 * 0 ausserhalb [a,d], 1 auf [b,c], linear dazwischen. */
function ftrap(x, a, b, c, d) {
  if (!istZahl(x)) { return null; }
  if (x <= a || x >= d) { return 0; }
  if (x >= b && x <= c) { return 1; }
  if (x < b) { return (b - a) > 0 ? (x - a) / (b - a) : 1; }
  return (d - c) > 0 ? (d - x) / (d - c) : 1;
}

function heuteDatum() {
  var d = new Date();
  var p = function (n) { return String(n).padStart(2, '0'); };
  return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
}

function datumLang(datum) {
  var d = new Date(datum + 'T12:00:00');
  if (isNaN(d.getTime())) { return datum; }
  return d.toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

function datumKurz(datum) {
  var d = new Date(datum + 'T12:00:00');
  if (isNaN(d.getTime())) { return datum; }
  return d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });
}

function wochentagKurz(datum) {
  var d = new Date(datum + 'T12:00:00');
  if (isNaN(d.getTime())) { return ''; }
  return d.toLocaleDateString('de-DE', { weekday: 'short' });
}

function zeitpunkt(ms) {
  if (!istZahl(ms)) { return 'unbekannt'; }
  return new Date(ms).toLocaleString('de-DE', { dateStyle: 'short', timeStyle: 'short' });
}

/* ------------------------------------------------------------------ *
 * Stellen — nur localStorage, Start immer leer
 * ------------------------------------------------------------------ */

function ladeStellen() {
  var liste = leseSpeicher(SP_STELLEN);
  zustand.stellen = Array.isArray(liste) ? liste.filter(function (s) {
    return s && typeof s.id === 'string' && istZahl(s.breite) && istZahl(s.laenge);
  }) : [];
  var aktiv = leseSpeicher(SP_AKTIV);
  zustand.aktiv = (typeof aktiv === 'string' && findeStelle(aktiv)) ? aktiv
                : (zustand.stellen.length ? zustand.stellen[0].id : null);
}

function findeStelle(id) {
  for (var i = 0; i < zustand.stellen.length; i++) {
    if (zustand.stellen[i].id === id) { return zustand.stellen[i]; }
  }
  return null;
}

/* Zusammenfuehrendes Speichern.
 *
 * Warum: Der Zustand liegt im Arbeitsspeicher des Tabs, der Speicher ist aber
 * fuer alle Tabs derselbe. Wer zuletzt schreibt, ueberschrieb bisher alles, was
 * ein anderer Tab inzwischen angelegt hatte - eine Stelle verschwand einfach.
 * Am 05.09. genau so nachgestellt. Darum wird vor jedem Schreiben der aktuelle
 * Stand gelesen und alles uebernommen, was dieser Tab noch nicht kennt. */
function sichereStellen() {
  var fremd = leseSpeicher(SP_STELLEN);
  if (Array.isArray(fremd)) {
    var bekannt = {};
    zustand.stellen.forEach(function (s) { bekannt[s.id] = true; });
    fremd.forEach(function (s) {
      if (!s || typeof s.id !== 'string') { return; }
      if (bekannt[s.id] || zustand.geloescht[s.id]) { return; }
      if (!istZahl(s.breite) || !istZahl(s.laenge)) { return; }
      zustand.stellen.push(s);
    });
  }
  if (!schreibeSpeicher(SP_STELLEN, zustand.stellen)) {
    zeigeHinweis('Die Stelle konnte nicht gespeichert werden — der Browser lässt '
      + 'keinen lokalen Speicher zu (privates Fenster?). Sie gilt nur bis zum Neuladen.');
  }
  schreibeSpeicher(SP_AKTIV, zustand.aktiv);
}

function grad(roh) {
  if (typeof roh !== 'string') { return null; }
  var s = roh.trim().replace(',', '.');
  if (!/^-?\d+(\.\d+)?$/.test(s)) { return null; }
  var w = parseFloat(s);
  return isFinite(w) ? w : null;
}

function stelleHinzufuegen(ereignis) {
  ereignis.preventDefault();
  var fehler = $('form-fehler');
  var name   = $('f-name').value.trim();
  var breite = grad($('f-breite').value);
  var laenge = grad($('f-laenge').value);

  var meldung = null;
  if (!name) { meldung = 'Bitte einen Namen angeben.'; }
  else if (breite === null || breite < -90 || breite > 90) { meldung = 'Breite: Dezimalgrad zwischen −90 und 90.'; }
  else if (laenge === null || laenge < -180 || laenge > 180) { meldung = 'Länge: Dezimalgrad zwischen −180 und 180.'; }

  if (meldung) { fehler.hidden = false; fehler.textContent = meldung; return; }
  fehler.hidden = true;

  var id = 's' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  zustand.stellen.push({ id: id, name: name, breite: breite, laenge: laenge });
  zustand.aktiv = id;
  sichereStellen();

  $('f-name').value = '';
  $('f-breite').value = '';
  $('f-laenge').value = '';

  renderStellen();
  zeigeAktiveStelle(false);
}

function stelleLoeschen(id) {
  var s = findeStelle(id);
  if (!s) { return; }
  if (!window.confirm('Stelle „' + s.name + '“ löschen? Sie ist danach weg — '
      + 'sie liegt nur in diesem Browser.')) { return; }
  zustand.stellen = zustand.stellen.filter(function (x) { return x.id !== id; });
  zustand.geloescht[id] = true;   // sonst holt sie das Zusammenfuehren zurueck
  loescheSpeicher(SP_WETTER + id);
  if (zustand.aktiv === id) {
    zustand.aktiv = zustand.stellen.length ? zustand.stellen[0].id : null;
  }
  sichereStellen();
  renderStellen();
  zeigeAktiveStelle(false);
}

function renderStellen() {
  fuelleStellenAuswahl();
  var liste = $('stellen-liste');
  liste.innerHTML = '';
  $('stellen-leer').hidden = zustand.stellen.length > 0;

  zustand.stellen.forEach(function (s) {
    var li = document.createElement('li');

    var knopf = document.createElement('button');
    knopf.type = 'button';
    knopf.className = 'stelle-knopf';
    knopf.setAttribute('aria-pressed', s.id === zustand.aktiv ? 'true' : 'false');
    knopf.innerHTML = '<span class="stelle-name">' + text(s.name) + '</span>'
      + '<span class="stelle-ort">' + zahl(s.breite, 4) + ' / ' + zahl(s.laenge, 4) + '</span>';
    knopf.addEventListener('click', function () {
      if (zustand.aktiv === s.id) { return; }
      zustand.aktiv = s.id;
      sichereStellen();
      renderStellen();
      zeigeAktiveStelle(false);
    });

    var weg = document.createElement('button');
    weg.type = 'button';
    weg.className = 'stelle-loeschen';
    weg.title = 'Stelle löschen';
    weg.setAttribute('aria-label', 'Stelle ' + s.name + ' löschen');
    weg.textContent = '×';
    weg.addEventListener('click', function () { stelleLoeschen(s.id); });

    li.appendChild(knopf);
    li.appendChild(weg);
    liste.appendChild(li);
  });
}

/* ------------------------------------------------------------------ *
 * Modellparameter aus daten/arten.json
 * ------------------------------------------------------------------ */

function ladeRegel() {
  return fetch('daten/arten.json', { cache: 'no-store' })
    .then(function (a) {
      if (!a.ok) { throw new Error('HTTP ' + a.status); }
      return a.json();
    })
    .then(function (j) {
      var arten = (j && Array.isArray(j.arten)) ? j.arten : [];
      var stein = null;
      for (var i = 0; i < arten.length; i++) {
        if (arten[i] && arten[i].id === 'steinpilz') { stein = arten[i]; }
      }
      if (!stein || !stein.regel || !stein.regel.parameter || !stein.regel.befundmodell) {
        throw new Error('Steinpilz-Regel fehlt in arten.json');
      }
      zustand.regel = stein.regel;
      /* Fallzahlen kommen aus der Datei, damit kein Text sie doppelt behauptet.
       * Sie aendern sich, sobald Andrej weitere Funde zuordnet. */
      zustand.fallzahlen = (j._geprueft && j._geprueft.fallzahlen) ? j._geprueft.fallzahlen : null;
      return true;
    })
    .catch(function (f) {
      zeigeHinweis('<strong>Modellparameter nicht geladen.</strong> '
        + text(String(f.message || f))
        + ' — <code>daten/arten.json</code> ist nicht erreichbar. Die Seite muss über '
        + 'einen lokalen Server laufen (<code>python -m http.server</code> im '
        + 'Repo-Wurzelverzeichnis); über <code>file://</code> blockiert der Browser '
        + 'den Abruf. Ohne die Parameter wird nichts gerechnet.');
      return false;
    });
}

/* ------------------------------------------------------------------ *
 * Wetterabruf und Zwischenspeicher
 * ------------------------------------------------------------------ */

function apiAdresse(stelle) {
  var p = new URLSearchParams({
    latitude: String(stelle.breite),
    longitude: String(stelle.laenge),
    daily: 'precipitation_sum,temperature_2m_max,temperature_2m_min',
    hourly: 'soil_temperature_6cm,relative_humidity_2m,wind_speed_10m',
    past_days: '31',
    forecast_days: '10',
    timezone: 'Europe/Berlin'
  });
  return 'https://api.open-meteo.com/v1/forecast?' + p.toString();
}

function holeWetter(stelle, erzwingen) {
  var schluessel = SP_WETTER + stelle.id;
  var zwischen = leseSpeicher(schluessel);
  var jetzt = Date.now();

  if (!erzwingen && zwischen && istZahl(zwischen.abgerufen) && zwischen.daten
      && (jetzt - zwischen.abgerufen) < CACHE_MS) {
    return Promise.resolve({ daten: zwischen.daten, abgerufen: zwischen.abgerufen, quelle: 'speicher' });
  }

  return fetch(apiAdresse(stelle), { cache: 'no-store' })
    .then(function (a) {
      if (!a.ok) { throw new Error('HTTP ' + a.status); }
      return a.json();
    })
    .then(function (daten) {
      if (!daten || !daten.daily || !Array.isArray(daten.daily.time) || daten.daily.time.length === 0) {
        throw new Error('Antwort ohne Tagesdaten');
      }
      schreibeSpeicher(schluessel, { abgerufen: jetzt, daten: daten });
      return { daten: daten, abgerufen: jetzt, quelle: 'abruf' };
    })
    .catch(function (f) {
      var meldung = String(f.message || f);
      if (zwischen && zwischen.daten) {
        return { daten: zwischen.daten, abgerufen: zwischen.abgerufen, quelle: 'veraltet', fehler: meldung };
      }
      return { daten: null, fehler: meldung };
    });
}

/* ------------------------------------------------------------------ *
 * Aus der API-Antwort eine Tagesreihe machen
 *
 * Festlegungen (stehen so auch in der Begruendung auf der Seite):
 *   Bodentemperatur = 12-Uhr-Wert, Luftfeuchte = Tagesmittel,
 *   Wind = Tagesmaximum. Fehlt etwas, steht null — nicht geschätzt.
 * ------------------------------------------------------------------ */

function wertOderNull(feld, i) {
  if (!Array.isArray(feld)) { return null; }
  var w = feld[i];
  return istZahl(w) ? w : null;
}

function bereiteTageAuf(antwort) {
  var stunden = {};
  var ht = (antwort.hourly && Array.isArray(antwort.hourly.time)) ? antwort.hourly.time : [];
  var i;

  for (i = 0; i < ht.length; i++) {
    var marke = String(ht[i]);
    var tag = marke.slice(0, 10);
    var uhr = marke.slice(11, 16);
    if (!stunden[tag]) { stunden[tag] = { tsoil12: null, rh: [], wind: [] }; }

    var boden = wertOderNull(antwort.hourly.soil_temperature_6cm, i);
    if (uhr === '12:00' && boden !== null) { stunden[tag].tsoil12 = boden; }

    var feuchte = wertOderNull(antwort.hourly.relative_humidity_2m, i);
    if (feuchte !== null) { stunden[tag].rh.push(feuchte); }

    var wind = wertOderNull(antwort.hourly.wind_speed_10m, i);
    if (wind !== null) { stunden[tag].wind.push(wind); }
  }

  var d = antwort.daily;
  var tage = [];
  for (i = 0; i < d.time.length; i++) {
    var datum = String(d.time[i]).slice(0, 10);
    var s = stunden[datum] || { tsoil12: null, rh: [], wind: [] };

    // Tagesmittel nur, wenn der Tag halbwegs vollstaendig ist.
    var rh = null;
    if (s.rh.length >= 18) {
      var summe = 0;
      for (var r = 0; r < s.rh.length; r++) { summe += s.rh[r]; }
      rh = summe / s.rh.length;
    }

    var wind = null;
    if (s.wind.length >= 18) { wind = Math.max.apply(null, s.wind); }

    tage.push({
      datum: datum,
      regen: wertOderNull(d.precipitation_sum, i),
      tmax:  wertOderNull(d.temperature_2m_max, i),
      tmin:  wertOderNull(d.temperature_2m_min, i),
      tsoil: s.tsoil12,
      rh:    rh,
      wind:  wind
    });
  }
  return tage;
}

/* ------------------------------------------------------------------ *
 * Wert A — SPI (repariert)
 * ------------------------------------------------------------------ */

function spiFuerTag(tage, i) {
  var e = {
    wert: null, reff: null, s_rain: null, drop: null, s_imp: null, s_regen: null,
    tsoil: null, f_boden: null, tmax: null, f_luft: null, rh: null, f_feuchte: null,
    s_klima: null, wind: null, m_wind: null, tmin72: null, m_frost: null
  };
  var tag = tage[i];
  if (!tag) { return e; }

  var d, z;

  /* Vorregen: gewichtete SUMME über Tag -7 bis -14.
   * Korrektur 1 gegenüber der Vorlage: die Gauß-Gewichte werden NICHT
   * normiert (Maximum 1,0 bei d = 10). Normiert waere R_eff ein Tagesmittel,
   * die Schwellen 15/25/50/80 sind aber Fenstersummen. */
  var reff = 0, vollstaendig = true;
  for (d = 7; d <= 14; d++) {
    var vor = tage[i - d];
    if (!vor || vor.regen === null) { vollstaendig = false; break; }
    reff += vor.regen * Math.exp(-Math.pow(d - 10, 2) / 8);
  }
  if (vollstaendig) {
    e.reff = reff;
    e.s_rain = ftrap(reff, SPI.regen_trapez[0], SPI.regen_trapez[1], SPI.regen_trapez[2], SPI.regen_trapez[3]);
  }

  /* Temperaturimpuls: groesster Abfall des Tageshoechstwerts ZWISCHEN Tagen
   * (24 h oder 48 h), gesucht im selben Latenzband.
   * Korrektur 2: die Vorlage nimmt Tmax − Tmin desselben Tages, also die
   * Tagesspanne — die ist bei trockenem Hochdruck am größten. */
  var drop = null, dropVoll = true;
  for (d = 7; d <= 14 && dropVoll; d++) {
    for (z = 1; z <= 2; z++) {
      var frueher = tage[i - d - z], spaeter = tage[i - d];
      if (!frueher || !spaeter || frueher.tmax === null || spaeter.tmax === null) {
        dropVoll = false; break;
      }
      var abfall = frueher.tmax - spaeter.tmax;
      if (drop === null || abfall > drop) { drop = abfall; }
    }
  }
  if (dropVoll && drop !== null) {
    e.drop = drop;
    e.s_imp = Math.min(1, Math.max(0, drop - 2) / 4);
  }

  if (e.s_rain !== null && e.s_imp !== null) {
    e.s_regen = SPI.gew_rain * e.s_rain + SPI.gew_imp * e.s_imp;
  }

  // Klimateil
  e.tsoil = tag.tsoil;
  e.f_boden = ftrap(tag.tsoil, SPI.boden_trapez[0], SPI.boden_trapez[1], SPI.boden_trapez[2], SPI.boden_trapez[3]);
  e.tmax = tag.tmax;
  e.f_luft = ftrap(tag.tmax, SPI.luft_trapez[0], SPI.luft_trapez[1], SPI.luft_trapez[2], SPI.luft_trapez[3]);
  e.rh = tag.rh;
  if (istZahl(tag.rh)) {
    e.f_feuchte = tag.rh < SPI.feuchte_ab ? 0
      : Math.min(1, (tag.rh - SPI.feuchte_ab) / SPI.feuchte_spanne);
  }
  if (e.f_boden !== null && e.f_luft !== null && e.f_feuchte !== null) {
    e.s_klima = SPI.gew_boden * e.f_boden + SPI.gew_luft * e.f_luft + SPI.gew_feuchte * e.f_feuchte;
  }

  // Wind: 1 bei <= 15 km/h, 0,3 ab 30 km/h, linear dazwischen.
  e.wind = tag.wind;
  if (istZahl(tag.wind)) {
    if (tag.wind <= SPI.wind_gut) { e.m_wind = 1; }
    else if (tag.wind >= SPI.wind_schlecht) { e.m_wind = SPI.wind_rest; }
    else {
      e.m_wind = 1 - (1 - SPI.wind_rest) * (tag.wind - SPI.wind_gut)
                 / (SPI.wind_schlecht - SPI.wind_gut);
    }
  }

  // Frost: Tiefstwerte der letzten 72 Stunden, also der Tage t, t-1, t-2.
  var minima = [], frostVoll = true;
  for (d = 0; d <= 2; d++) {
    var f = tage[i - d];
    if (!f || f.tmin === null) { frostVoll = false; break; }
    minima.push(f.tmin);
  }
  if (frostVoll) {
    e.tmin72 = Math.min.apply(null, minima);
    e.m_frost = e.tmin72 <= SPI.frost_grenze ? 0 : 1;
  }

  if (e.s_regen !== null && e.s_klima !== null && e.m_wind !== null && e.m_frost !== null) {
    e.wert = 100 * e.s_regen * e.s_klima * e.m_wind * e.m_frost;
  }
  return e;
}

/* ------------------------------------------------------------------ *
 * Wert B — Befundmodell (Parameter aus arten.json)
 * ------------------------------------------------------------------ */

function befundFuerTag(tage, i, regel) {
  var e = { wert: null, teile: [], kontext: null, monat: null };
  var tag = tage[i];
  if (!tag || !regel) { return e; }
  if (typeof tag.datum === 'string') { e.monat = parseInt(tag.datum.slice(5, 7), 10); }

  var par = regel.parameter || {};

  /* Aggregation: MINIMUM. Der schwaechste der drei Werte bestimmt das Ergebnis.
   * Begruendung steht in arten.json unter regel.befundmodell.begruendung -
   * der zuvor gebaute gewichtete Mittelwert stand an 40 % der Saisontage ueber
   * 90 und bewegte sich zu wenig, um beim Planen zu helfen. */
  var kleinste = null, vollstaendig = true;

  BEFUND_KRITERIEN.forEach(function (k) {
    var p = par[k.schluessel] || null;
    var trapez = (p && Array.isArray(p.trapez) && p.trapez.length === 4) ? p.trapez : null;
    var ist = tag[k.feld];
    var lage = trapez ? ftrap(ist, trapez[0], trapez[1], trapez[2], trapez[3]) : null;

    if (trapez === null || lage === null) { vollstaendig = false; }
    else if (kleinste === null || lage < kleinste) { kleinste = lage; }

    e.teile.push({
      name: k.name, einheit: k.einheit, ist: ist, trapez: trapez, lage: lage, gewicht: null,
      anteil_fundtage: (p && istZahl(p.anteil_fundtage)) ? p.anteil_fundtage : null,
      anteil_saisontage: (p && istZahl(p.anteil_saisontage)) ? p.anteil_saisontage : null,
      hebel: (p && istZahl(p.hebel)) ? p.hebel : null
    });
  });

  /* Welches Fenster stellt das Minimum? Das ist die eigentliche Aussage. */
  if (vollstaendig && kleinste !== null) {
    e.wert = 100 * kleinste;
    e.teile.forEach(function (teil) {
      teil.bestimmend = (teil.lage !== null && Math.abs(teil.lage - kleinste) < 1e-9);
    });
  }

  /* Kontext: Regensumme der letzten 15 Tage. Wird angezeigt, geht aber
   * ausdrücklich NICHT in den Wert ein (Hebel aus arten.json — zu schwach). */
  var kp = par.regen_15_tage_mm || null;
  if (kp) {
    var regen = 0, voll = true;
    for (var d = 0; d <= 14; d++) {
      var t = tage[i - d];
      if (!t || t.regen === null) { voll = false; break; }
      regen += t.regen;
    }
    var trapez15 = (Array.isArray(kp.trapez) && kp.trapez.length === 4) ? kp.trapez : null;
    e.kontext = {
      name: 'Regen 15 Tage (Kontext)', einheit: 'mm',
      ist: voll ? regen : null,
      trapez: trapez15,
      lage: (voll && trapez15) ? ftrap(regen, trapez15[0], trapez15[1], trapez15[2], trapez15[3]) : null,
      anteil_fundtage: istZahl(kp.anteil_fundtage) ? kp.anteil_fundtage : null,
      anteil_saisontage: istZahl(kp.anteil_saisontage) ? kp.anteil_saisontage : null,
      hebel: istZahl(kp.hebel) ? kp.hebel : null
    };
  }
  return e;
}

/* ------------------------------------------------------------------ *
 * Anzeige: Tagesreihe
 * ------------------------------------------------------------------ */

function wertHtml(marke, wert) {
  if (!istZahl(wert)) {
    return '<span class="wert"><span class="wert-marke">' + text(marke) + '</span>'
      + '<span class="wert-zahl unbekannt">unbekannt</span></span>';
  }
  var breite = Math.max(0, Math.min(100, wert));
  return '<span class="wert"><span class="wert-marke">' + text(marke) + '</span>'
    + '<span class="wert-zahl">' + zahl(wert, 0) + '</span>'
    + '<span class="balken"><i style="width:' + fest(breite) + '%"></i></span></span>';
}

function renderReihe() {
  var behaelter = $('reihe');
  behaelter.innerHTML = '';

  if (!zustand.reihe.length) {
    behaelter.innerHTML = '<p class="klein">Keine Tage in der Antwort.</p>';
    return;
  }

  var heute = heuteDatum();
  zustand.reihe.forEach(function (r) {
    var knopf = document.createElement('button');
    knopf.type = 'button';
    knopf.className = 'tag' + (r.datum === heute ? ' heute' : '');
    knopf.setAttribute('aria-pressed', r.datum === zustand.gewaehlt ? 'true' : 'false');
    knopf.innerHTML =
      '<span class="tag-wochentag">' + text(wochentagKurz(r.datum)) + '</span>'
      + '<span class="tag-datum">' + text(datumKurz(r.datum)) + '</span>'
      + '<span class="paar">' + wertHtml('SPI', r.spi.wert) + wertHtml('Befund', r.befund.wert) + '</span>';
    knopf.addEventListener('click', function () {
      zustand.gewaehlt = r.datum;
      renderReihe();
      renderDetail();
      $('tafel-detail').scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
    behaelter.appendChild(knopf);
  });
}

/* ------------------------------------------------------------------ *
 * Anzeige: Detail
 * ------------------------------------------------------------------ */

function trapezGrafik(wert, p) {
  var a = p[0], b = p[1], c = p[2], d = p[3];
  var spanne = (d - a) || 1;
  var lo = a - 0.18 * spanne, hi = d + 0.18 * spanne;
  var x = function (v) { return ((v - lo) / (hi - lo)) * 100; };

  var punkte = ['0,26', fest(x(a)) + ',26', fest(x(b)) + ',4',
                fest(x(c)) + ',4', fest(x(d)) + ',26', '100,26'].join(' ');

  var marke = '';
  if (istZahl(wert)) {
    var pos = Math.max(0, Math.min(100, x(wert)));
    var aussen = (wert <= a || wert >= d) ? ' aussen' : '';
    marke = '<line class="marke' + aussen + '" x1="' + fest(pos) + '" y1="1" x2="'
          + fest(pos) + '" y2="29"></line>';
  }

  return '<svg class="trapez" viewBox="0 0 100 30" preserveAspectRatio="none" aria-hidden="true">'
    + '<polygon class="flaeche" points="' + punkte + '"></polygon>' + marke + '</svg>'
    + '<div class="skala"><span>' + zahl(a, 0) + '</span>'
    + '<span>Optimum ' + zahl(b, 0) + '–' + zahl(c, 0) + '</span>'
    + '<span>' + zahl(d, 0) + '</span></div>';
}

function prozent(anteil) {
  return istZahl(anteil) ? zahl(anteil * 100, 0) + ' %' : 'unbekannt';
}

/* Formulierungen, die eine Fallzahl nennen, holen sie hier - nirgends sonst. */
function fallzahl(name, ersatz) {
  var f = zustand.fallzahlen;
  return (f && typeof f[name] === 'number') ? String(f[name]) : ersatz;
}

function kriteriumHtml(t, zusatzklasse) {
  var istText = istZahl(t.ist)
    ? zahl(t.ist, 1) + ' ' + t.einheit
    : 'unbekannt';
  var h = '<div class="kriterium' + (zusatzklasse ? ' ' + zusatzklasse : '') + '">'
    + '<div class="kriterium-kopf"><span class="kriterium-name">' + text(t.name) + '</span>'
    + '<span class="kriterium-ist' + (istZahl(t.ist) ? '' : ' unbekannt') + '">' + text(istText) + '</span></div>';

  if (t.trapez) { h += trapezGrafik(t.ist, t.trapez); }

  h += '<div class="kriterium-lage">Lage im Fenster: <strong>'
    + (istZahl(t.lage) ? zahl(t.lage, 2) : 'unbekannt') + '</strong>';
  if (istZahl(t.gewicht)) { h += ' · Gewicht ' + zahl(t.gewicht, 2); }
  if (t.bestimmend) { h += ' · <strong>bestimmt den Wert</strong> (schwächstes Fenster)'; }
  h += '</div>';

  if (istZahl(t.anteil_fundtage) || istZahl(t.anteil_saisontage)) {
    h += '<div class="kriterium-trenn">Fenster erfüllt an ' + prozent(t.anteil_fundtage)
      + ' der ' + fallzahl('steinpilz_eintraege', '10') + ' Steinpilz-Fundtage, an '
      + prozent(t.anteil_saisontage) + ' der ' + fallzahl('saisontage', '854') + ' Saisontage'
      + (istZahl(t.hebel) ? ' · Hebel ' + zahl(t.hebel, 2) : '') + '</div>';
  }
  h += '</div>';
  return h;
}

function zeileHtml(name, wertText, unbekannt, klasse) {
  return '<div class="zeile' + (klasse ? ' ' + klasse : '') + '"><span>' + name + '</span>'
    + '<span class="zeile-wert' + (unbekannt ? ' unbekannt' : '') + '">' + wertText + '</span></div>';
}

/* Wie haeufig ist ein Wert dieser Hoehe? Ohne diese Einordnung wirkt eine 100
 * wie ein Ausnahmetag - im September und Oktober ist sie an rund 39 % der Tage
 * erreicht. Grundlage: Stufentabelle in arten.json, gemessen ueber 854 Tage. */
function einordnung(wert, monat) {
  var r = zustand.regel;
  var h = (r && r.befundmodell && r.befundmodell.haeufigkeit) ? r.befundmodell.haeufigkeit : null;
  if (!h || !istZahl(wert) || !Array.isArray(h.stufen)) { return null; }
  var treffer = null;
  h.stufen.forEach(function (s) {
    if (istZahl(s.wert) && s.wert <= wert + 1e-9
        && (treffer === null || s.wert > treffer.wert)) { treffer = s; }
  });
  if (!treffer || !istZahl(treffer.anteil_mindestens)) { return null; }
  var e = { saison: Math.round(100 * treffer.anteil_mindestens), monat: null, monatName: null };
  var m = h.je_monat ? h.je_monat[String(monat)] : null;
  if (m && wert >= 99.95 && istZahl(m.anteil_100)) {
    e.monat = Math.round(100 * m.anteil_100);
    e.monatName = m.name || null;
  }
  return e;
}

function blockBefund(b) {
  var h = '<div class="block"><div class="block-kopf"><h3>Wert B — Befundmodell</h3>'
    + '<span class="block-zahl' + (istZahl(b.wert) ? '' : ' unbekannt') + '">'
    + (istZahl(b.wert) ? zahl(b.wert, 1) : 'unbekannt') + '</span></div>'
    + '<p class="block-quelle">Index 0–100. Es zählt das <strong>schwächste</strong> der drei Fenster, die '
    + 'gegen die eigenen Funde getrennt haben. Parameter aus <code>daten/arten.json</code>.</p>';

  var e = einordnung(b.wert, b.monat);
  if (e) {
    h += '<p class="block-note einordnung">So hoch oder höher an <strong>' + e.saison
       + ' %</strong> aller Saisontage'
       + (e.monat !== null
          ? ' — im ' + text(e.monatName) + ' sogar an <strong>' + e.monat + ' %</strong> der Tage'
          : '')
       + '. Der Wert trennt vor allem Saisonphasen: im September und Oktober stimmt '
       + 'die Temperatur meistens, im August ist es zu warm, im November zu kalt.</p>';
  }

  b.teile.forEach(function (t) { h += kriteriumHtml(t, null); });

  var formel = b.teile.map(function (t) {
    return istZahl(t.lage) ? zahl(t.lage, 2) : '?';
  }).join('; ');
  h += '<div class="block-summe">B = 100 · min(' + formel + ') = '
    + (istZahl(b.wert) ? '<strong>' + zahl(b.wert, 1) + '</strong>' : 'unbekannt') + '</div>';

  if (b.kontext) {
    h += '<div class="gruppe"><h4>Kontext — geht nicht in den Wert ein</h4>'
      + kriteriumHtml(b.kontext, 'kontext')
      + '<p class="block-note">Regen 15 Tage trennt zu schwach, um mitzurechnen'
      + (istZahl(b.kontext.hebel) ? ' (Hebel ' + zahl(b.kontext.hebel, 2) + ')' : '')
      + '. Er steht hier, weil er beim Einordnen hilft — gerechnet wird '
      + 'er nicht. Auch als vierte Größe im Minimum geprüft und verworfen: '
      + 'die Trefferquote auf den eigenen Fundtagen fällt dann von 88 % auf 62 %.'
      + '</p></div>';
  }

  h += '<p class="block-note">Nicht enthalten: Luftfeuchte, Wind und Temperaturimpuls. '
    + 'Sie trennten in der Prüfung negativ.</p>';
  return h + '</div>';
}

function blockSpi(s) {
  var h = '<div class="block"><div class="block-kopf"><h3>Wert A — SPI (repariert)</h3>'
    + '<span class="block-zahl' + (istZahl(s.wert) ? '' : ' unbekannt') + '">'
    + (istZahl(s.wert) ? zahl(s.wert, 1) : 'unbekannt') + '</span></div>'
    + '<p class="block-quelle">Index 0–100 aus der PDF-Vorlage, mit zwei korrigierten '
    + 'Fehlern (Vorregen als Summe, Temperaturabfall zwischen Tagen). Vier Teile, '
    + 'multiplikativ verknüpft.</p>';

  // Regenteil
  h += '<div class="gruppe"><h4>Regenteil S_regen</h4>';
  h += kriteriumHtml({
    name: 'Vorregen R_eff (Tag −7 bis −14, gewichtet)', einheit: 'mm',
    ist: s.reff, trapez: SPI.regen_trapez, lage: s.s_rain, gewicht: SPI.gew_rain,
    anteil_fundtage: null, anteil_saisontage: null, hebel: null
  }, null);
  h += zeileHtml('Temperaturabfall ΔTdrop (24–48 h im Band −7…−14 d)',
    istZahl(s.drop) ? zahl(s.drop, 1) + ' K' : 'unbekannt', !istZahl(s.drop));
  h += zeileHtml('→ S_imp = min(1, max(0, ΔTdrop − 2) / 4)',
    istZahl(s.s_imp) ? zahl(s.s_imp, 2) : 'unbekannt', !istZahl(s.s_imp));
  h += zeileHtml('S_regen = 0,70·S_rain + 0,30·S_imp',
    istZahl(s.s_regen) ? zahl(s.s_regen, 2) : 'unbekannt', !istZahl(s.s_regen), 'summe');
  h += '</div>';

  // Klimateil
  h += '<div class="gruppe"><h4>Klimateil S_klima</h4>';
  h += kriteriumHtml({
    name: 'Bodentemperatur (12 Uhr)', einheit: '°C', ist: s.tsoil,
    trapez: SPI.boden_trapez, lage: s.f_boden, gewicht: SPI.gew_boden,
    anteil_fundtage: null, anteil_saisontage: null, hebel: null
  }, null);
  h += kriteriumHtml({
    name: 'Lufttemperatur Tag (Höchstwert)', einheit: '°C', ist: s.tmax,
    trapez: SPI.luft_trapez, lage: s.f_luft, gewicht: SPI.gew_luft,
    anteil_fundtage: null, anteil_saisontage: null, hebel: null
  }, null);
  h += zeileHtml('Luftfeuchte (Tagesmittel)',
    istZahl(s.rh) ? zahl(s.rh, 0) + ' %' : 'unbekannt', !istZahl(s.rh));
  h += zeileHtml('→ 0 unter 60 %, ab dort linear bis 85 % · Gewicht 0,30',
    istZahl(s.f_feuchte) ? zahl(s.f_feuchte, 2) : 'unbekannt', !istZahl(s.f_feuchte));
  h += zeileHtml('S_klima = 0,40·Boden + 0,30·Luft + 0,30·Feuchte',
    istZahl(s.s_klima) ? zahl(s.s_klima, 2) : 'unbekannt', !istZahl(s.s_klima), 'summe');
  h += '</div>';

  // Daempfer
  h += '<div class="gruppe"><h4>Dämpfer</h4>';
  h += zeileHtml('Wind (Tagesmaximum)',
    istZahl(s.wind) ? zahl(s.wind, 0) + ' km/h' : 'unbekannt', !istZahl(s.wind));
  h += zeileHtml('→ M_wind (1 bis 15 km/h, 0,3 ab 30 km/h)',
    istZahl(s.m_wind) ? zahl(s.m_wind, 2) : 'unbekannt', !istZahl(s.m_wind));
  h += zeileHtml('Tiefstwert der letzten 72 h',
    istZahl(s.tmin72) ? zahl(s.tmin72, 1) + ' °C' : 'unbekannt', !istZahl(s.tmin72));
  h += zeileHtml('→ M_frost (0 bei Tmin ≤ −1,0 °C)',
    istZahl(s.m_frost) ? zahl(s.m_frost, 2) : 'unbekannt', !istZahl(s.m_frost));
  h += '</div>';

  h += '<div class="block-summe">SPI = 100 · S_regen · S_klima · M_wind · M_frost = '
    + (istZahl(s.wert) ? '<strong>' + zahl(s.wert, 1) + '</strong>' : 'unbekannt') + '</div>';

  h += '<p class="block-note">Die Teile sind multiplikativ verknüpft: ein Teil nahe 0 '
    + 'zieht das Ergebnis nach unten, auch wenn die anderen hoch stehen. Der Vorregen '
    + 'im Band 7–14 Tage wirkt dabei am stärksten — an der Hälfte der eigenen '
    + 'Steinpilz-Fundtage lag dort gar kein passender Regen.</p>';
  return h + '</div>';
}

function renderDetail() {
  var tafel = $('tafel-detail');
  var ziel = $('detail');

  var eintrag = null;
  for (var i = 0; i < zustand.reihe.length; i++) {
    if (zustand.reihe[i].datum === zustand.gewaehlt) { eintrag = zustand.reihe[i]; }
  }
  if (!eintrag) { tafel.hidden = true; ziel.innerHTML = ''; return; }

  var heute = heuteDatum();
  var art = eintrag.datum === heute ? 'heute'
          : (eintrag.datum > heute ? 'Vorhersage' : 'Rückblick');
  $('detail-titel').innerHTML = text(datumLang(eintrag.datum))
    + ' <span class="klein">(' + text(art) + ')</span>';

  // Reihenfolge A dann B; beide Bloecke sind gleich gebaut und gleich gross.
  ziel.innerHTML = blockSpi(eintrag.spi) + blockBefund(eintrag.befund);
  tafel.hidden = false;
}

/* ------------------------------------------------------------------ *
 * Ablauf
 * ------------------------------------------------------------------ */

function zeigeAktiveStelle(erzwingen) {
  var tafelReihe = $('tafel-reihe');
  var status = $('reihe-status');
  var stelle = zustand.aktiv ? findeStelle(zustand.aktiv) : null;

  if (!stelle) {
    tafelReihe.hidden = true;
    $('tafel-detail').hidden = true;
    zustand.reihe = [];
    zustand.gewaehlt = null;
    return Promise.resolve();
  }
  if (!zustand.regel) {
    // Ohne Modellparameter wird nichts gerechnet (siehe Hinweis oben).
    tafelReihe.hidden = true;
    $('tafel-detail').hidden = true;
    return Promise.resolve();
  }

  tafelReihe.hidden = false;
  $('reihe-stelle').textContent = stelle.name;
  $('abrufstand').textContent = 'lade …';
  status.hidden = true;
  $('reihe').innerHTML = '<p class="klein">Wetterdaten werden geholt …</p>';

  return holeWetter(stelle, erzwingen === true).then(function (ergebnis) {
    if (!ergebnis.daten) {
      $('abrufstand').textContent = '';
      $('reihe').innerHTML = '';
      status.hidden = false;
      status.textContent = 'Wetterdaten nicht erreichbar (' + ergebnis.fehler
        + '). Es liegt auch nichts im Zwischenspeicher — es wird nichts gerechnet. '
        + 'Später noch einmal „Neu laden“ drücken.';
      $('tafel-detail').hidden = true;
      return;
    }

    var tage;
    try { tage = bereiteTageAuf(ergebnis.daten); }
    catch (f) {
      $('abrufstand').textContent = '';
      $('reihe').innerHTML = '';
      status.hidden = false;
      status.textContent = 'Die Antwort ließ sich nicht auswerten (' + String(f.message || f) + ').';
      return;
    }
    zustand.tage = tage;

    // Startpunkt: heute. Findet sich das Datum nicht, der erste Tag danach.
    var heute = heuteDatum();
    var start = -1, i;
    for (i = 0; i < tage.length; i++) {
      if (tage[i].datum === heute) { start = i; break; }
    }
    if (start === -1) {
      for (i = 0; i < tage.length; i++) {
        if (tage[i].datum >= heute) { start = i; break; }
      }
    }
    if (start === -1) { start = Math.max(0, tage.length - 1); }

    zustand.reihe = [];
    for (i = start; i < tage.length && zustand.reihe.length < 10; i++) {
      zustand.reihe.push({
        datum: tage[i].datum,
        spi: spiFuerTag(tage, i),
        befund: befundFuerTag(tage, i, zustand.regel)
      });
    }

    var gefunden = false;
    for (i = 0; i < zustand.reihe.length; i++) {
      if (zustand.reihe[i].datum === zustand.gewaehlt) { gefunden = true; }
    }
    if (!gefunden) { zustand.gewaehlt = zustand.reihe.length ? zustand.reihe[0].datum : null; }

    var stand = 'Stand ' + zeitpunkt(ergebnis.abgerufen);
    if (ergebnis.quelle === 'speicher') { stand += ' · aus dem Zwischenspeicher'; }
    if (ergebnis.quelle === 'veraltet') { stand += ' · Abruf gescheitert, alte Daten'; }
    $('abrufstand').textContent = stand;

    if (ergebnis.quelle === 'veraltet') {
      status.hidden = false;
      status.textContent = 'Neuer Abruf gescheitert (' + ergebnis.fehler
        + '). Angezeigt werden die zuletzt geholten Daten von ' + zeitpunkt(ergebnis.abgerufen) + '.';
    }

    renderReihe();
    renderDetail();
  });
}

/* Ein anderer Tab hat den Speicher geaendert: Liste neu einlesen und anzeigen,
 * damit beide Tabs dasselbe sehen statt sich gegenseitig zu ueberschreiben. */
function fremdeAenderung(ereignis) {
  if (ereignis.key === SP_GAENGE) { ladeGaenge(); renderGaenge(); return; }
  if (ereignis.key !== null && ereignis.key !== SP_STELLEN) { return; }
  var vorher = zustand.aktiv;
  ladeStellen();
  if (vorher && findeStelle(vorher)) { zustand.aktiv = vorher; }
  renderStellen();
  if (zustand.aktiv !== vorher) { zeigeAktiveStelle(false); }
}


/* ------------------------------------------------------------------ *
 * Gangprotokoll - Fund UND Nullfund
 *
 * Warum das hier steht: Ohne Tage ohne Fund misst jeder Vergleich mit,
 * wann jemand ueberhaupt rausgegangen ist. Beide Modelle scheitern
 * bisher an genau dieser Luecke (siehe CLAUDE.md).
 * ------------------------------------------------------------------ */

var ART_NAMEN = { steinpilz: 'Steinpilz', fliegenpilz: 'Fliegenpilz',
                  marone: 'Marone', andere: 'andere / unklar' };

function ladeGaenge() {
  var liste = leseSpeicher(SP_GAENGE);
  zustand.gaenge = Array.isArray(liste) ? liste.filter(function (g) {
    return g && typeof g.id === 'string' && typeof g.datum === 'string'
        && istZahl(g.breite) && istZahl(g.laenge);
  }) : [];
  zustand.gaenge.sort(function (a, b) { return a.datum < b.datum ? 1 : -1; });
}

/* Zusammenfuehrend speichern - gleiche Begruendung wie bei den Stellen. */
function sichereGaenge() {
  var fremd = leseSpeicher(SP_GAENGE);
  if (Array.isArray(fremd)) {
    var bekannt = {};
    zustand.gaenge.forEach(function (g) { bekannt[g.id] = true; });
    fremd.forEach(function (g) {
      if (!g || typeof g.id !== 'string') { return; }
      if (bekannt[g.id] || zustand.gaengeWeg[g.id]) { return; }
      if (typeof g.datum !== 'string' || !istZahl(g.breite) || !istZahl(g.laenge)) { return; }
      zustand.gaenge.push(g);
    });
    zustand.gaenge.sort(function (a, b) { return a.datum < b.datum ? 1 : -1; });
  }
  if (!schreibeSpeicher(SP_GAENGE, zustand.gaenge)) {
    zeigeHinweis('Der Gang konnte nicht gespeichert werden \u2014 der Browser l\u00e4sst keinen '
      + 'lokalen Speicher zu. Sichere die Eintr\u00e4ge \u00fcber <em>Sichern (Datei)</em>.');
  }
}

/* Was zeigte die Seite an diesem Tag fuer DIESE Stelle?
 *
 * Nimmt die geladene Reihe, wenn es die aktive Stelle ist, sonst deren
 * Zwischenspeicher. Ist fuer die Stelle nichts da oder liegt der Tag ausserhalb,
 * bleiben die Felder leer - keine erfundenen Zahlen (Regel 4). Verloren ist
 * dadurch nichts: Datum und Koordinate stehen im Eintrag, die Werte lassen sich
 * jederzeit aus dem Archiv nachrechnen. */
function werteZumTag(datum, stelle) {
  var tage = null;
  if (stelle && stelle.id === zustand.aktiv && zustand.tage.length) {
    tage = zustand.tage;
  } else if (stelle) {
    var zwischen = leseSpeicher(SP_WETTER + stelle.id);
    if (zwischen && zwischen.daten) {
      try { tage = bereiteTageAuf(zwischen.daten); } catch (f) { tage = null; }
    }
  }
  if (!tage || !tage.length) { return { spi: null, befund: null }; }

  var i = -1;
  for (var k = 0; k < tage.length; k++) {
    if (tage[k] && tage[k].datum === datum) { i = k; break; }
  }
  if (i < 0) { return { spi: null, befund: null }; }
  var s = spiFuerTag(tage, i);
  var b = befundFuerTag(tage, i, zustand.regel);
  return { spi: (s && istZahl(s.wert)) ? Math.round(s.wert * 10) / 10 : null,
           befund: (b && istZahl(b.wert)) ? Math.round(b.wert * 10) / 10 : null };
}

function gangEintragen(ereignis) {
  ereignis.preventDefault();
  var fehler = $('gang-fehler');
  var datum  = $('g-datum').value;
  var stelle = findeStelle($('g-stelle').value);
  var fund   = document.querySelector('input[name="g-ergebnis"]:checked');
  fund = fund && fund.value === 'fund';

  var meldung = null;
  if (!datum) { meldung = 'Bitte ein Datum w\u00e4hlen.'; }
  else if (datum > heuteDatum()) { meldung = 'Das Datum liegt in der Zukunft.'; }
  else if (!stelle) { meldung = 'Bitte eine Stelle w\u00e4hlen \u2014 erst oben eine anlegen.'; }
  if (meldung) { fehler.hidden = false; fehler.textContent = meldung; return; }
  fehler.hidden = true;

  var anzahlRoh = $('g-anzahl').value.trim();
  var anzahl = anzahlRoh === '' ? null : parseInt(anzahlRoh, 10);
  var w = werteZumTag(datum, stelle);

  zustand.gaenge.unshift({
    id: 'g' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
    datum: datum,
    stelle_id: stelle.id,
    stelle_name: stelle.name,
    breite: stelle.breite,
    laenge: stelle.laenge,
    fund: fund,
    art: fund ? $('g-art').value : null,
    anzahl: (fund && istZahl(anzahl) && anzahl > 0) ? anzahl : null,
    notiz: $('g-notiz').value.trim() || null,
    spi: w.spi,
    befund: w.befund,
    erfasst: Date.now()
  });
  sichereGaenge();

  $('g-anzahl').value = '';
  $('g-notiz').value = '';
  renderGaenge();
}

function gangLoeschen(id) {
  var g = null;
  zustand.gaenge.forEach(function (x) { if (x.id === id) { g = x; } });
  if (!g) { return; }
  if (!window.confirm('Eintrag vom ' + datumLang(g.datum) + ' l\u00f6schen?')) { return; }
  zustand.gaenge = zustand.gaenge.filter(function (x) { return x.id !== id; });
  zustand.gaengeWeg[id] = true;
  sichereGaenge();
  renderGaenge();
}

function fuelleStellenAuswahl() {
  var sel = $('g-stelle');
  if (!sel) { return; }
  var vorher = sel.value;
  sel.innerHTML = '';
  zustand.stellen.forEach(function (s) {
    var o = document.createElement('option');
    o.value = s.id;
    o.textContent = s.name;
    sel.appendChild(o);
  });
  if (vorher && findeStelle(vorher)) { sel.value = vorher; }
  else if (zustand.aktiv) { sel.value = zustand.aktiv; }
}

function renderGaenge() {
  var koerper = $('gang-liste');
  if (!koerper) { return; }
  koerper.innerHTML = '';
  var leer = zustand.gaenge.length === 0;
  $('gang-leer').hidden = !leer;
  $('gang-tabelle').hidden = leer;

  zustand.gaenge.forEach(function (g) {
    var tr = document.createElement('tr');
    tr.className = g.fund ? 'gang-fund' : 'gang-leerfund';

    function zelle(inhalt, klasse) {
      var td = document.createElement('td');
      if (klasse) { td.className = klasse; }
      td.textContent = inhalt;
      return td;
    }
    /* datumKurz endet bereits auf einen Punkt — kein zweiter davor. */
    tr.appendChild(zelle(datumKurz(g.datum) + g.datum.slice(2, 4)));
    tr.appendChild(zelle(g.stelle_name || '\u2014'));

    var was = g.fund
      ? (ART_NAMEN[g.art] || 'Fund') + (istZahl(g.anzahl) ? ' \u00d7 ' + g.anzahl : '')
      : 'kein Fund';
    tr.appendChild(zelle(was, 'gang-ergebnis'));
    tr.appendChild(zelle(istZahl(g.spi) ? zahl(g.spi, 1) : '\u2013', 'rechts'));
    tr.appendChild(zelle(istZahl(g.befund) ? zahl(g.befund, 1) : '\u2013', 'rechts'));

    var td = document.createElement('td');
    var weg = document.createElement('button');
    weg.type = 'button';
    weg.className = 'weg';
    weg.title = 'Eintrag l\u00f6schen';
    weg.textContent = '\u00d7';
    weg.addEventListener('click', function () { gangLoeschen(g.id); });
    td.appendChild(weg);
    tr.appendChild(td);

    if (g.notiz) { tr.title = g.notiz; }
    koerper.appendChild(tr);
  });

  var mit = zustand.gaenge.filter(function (g) { return g.fund; }).length;
  var ohne = zustand.gaenge.length - mit;
  var n = zustand.gaenge.length;
  $('gang-datenstand').textContent = n
    ? n + (n === 1 ? ' Gang \u2014 ' : ' G\u00e4nge \u2014 ')
      + mit + ' mit Fund, ' + ohne + ' ohne'
    : '';
}

function gangSichern() {
  var inhalt = JSON.stringify({
    was: 'pilz-radar Gangprotokoll',
    hinweis: 'Enthaelt Koordinaten - nicht ins oeffentliche Repo.',
    gesichert: new Date().toISOString(),
    gaenge: zustand.gaenge
  }, null, 1);
  var blob = new Blob([inhalt], { type: 'application/json' });
  var a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'pilz-radar-gaenge-' + heuteDatum() + '.json';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(function () { URL.revokeObjectURL(a.href); }, 5000);
}

function gangHolen(ereignis) {
  var datei = ereignis.target.files && ereignis.target.files[0];
  if (!datei) { return; }
  var leser = new FileReader();
  leser.onload = function () {
    var neu = null;
    try {
      var j = JSON.parse(String(leser.result));
      neu = Array.isArray(j) ? j : (j && Array.isArray(j.gaenge) ? j.gaenge : null);
    } catch (f) { neu = null; }
    if (!neu) {
      zeigeHinweis('Die Datei liess sich nicht lesen \u2014 erwartet wird eine '
        + 'JSON-Sicherung aus diesem Protokoll.');
      return;
    }
    var bekannt = {};
    zustand.gaenge.forEach(function (g) { bekannt[g.id] = true; });
    var dazu = 0;
    neu.forEach(function (g) {
      if (!g || typeof g.id !== 'string' || typeof g.datum !== 'string') { return; }
      if (!istZahl(g.breite) || !istZahl(g.laenge)) { return; }
      if (bekannt[g.id]) { return; }
      zustand.gaenge.push(g);
      delete zustand.gaengeWeg[g.id];
      dazu++;
    });
    zustand.gaenge.sort(function (a, b) { return a.datum < b.datum ? 1 : -1; });
    sichereGaenge();
    renderGaenge();
    zeigeHinweis(dazu > 0
      ? '<strong>' + dazu + ' Eintr\u00e4ge \u00fcbernommen.</strong> Vorhandene blieben unber\u00fchrt.'
      : 'Nichts \u00fcbernommen \u2014 die Eintr\u00e4ge waren bereits vorhanden.');
  };
  leser.readAsText(datei);
  ereignis.target.value = '';
}

function start() {
  ladeStellen();
  ladeGaenge();
  renderStellen();
  $('stelle-form').addEventListener('submit', stelleHinzufuegen);
  window.addEventListener('storage', fremdeAenderung);

  $('g-datum').value = heuteDatum();
  $('g-datum').max = heuteDatum();
  fuelleStellenAuswahl();
  renderGaenge();
  $('gang-form').addEventListener('submit', gangEintragen);
  $('gang-sichern').addEventListener('click', gangSichern);
  $('gang-holen').addEventListener('click', function () { $('gang-datei').click(); });
  $('gang-datei').addEventListener('change', gangHolen);
  Array.prototype.forEach.call(
    document.querySelectorAll('input[name="g-ergebnis"]'),
    function (r) {
      r.addEventListener('change', function () {
        $('g-fundfelder').hidden = (document.querySelector('input[name="g-ergebnis"]:checked') || {}).value !== 'fund';
      });
    });
  $('neu-laden').addEventListener('click', function () { zeigeAktiveStelle(true); });

  ladeRegel().then(function () { return zeigeAktiveStelle(false); });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', start);
} else {
  start();
}
