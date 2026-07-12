// GamePix language/localisation helper
// Detects GamePix.lang() and returns translated UI strings.
// Non-Latin scripts (ar, zh, ja, ko, ru) fall back to English
// because the game uses a bitmap font that only covers ASCII/Latin characters.

window.gpLang = (function () {

    var translations = {
        en: {
            score:      "Score: ",
            multiplier: "Multiplier: ",
            speed:      "Speed: ",
            lap:        "/3 : Lap",
            lapTime:    " :Lap Time",
            raceTime:   " :Race Time",
            rank:       " rank: ",
            resultsAlpha: "Results: Track Alpha",
            resultsBeta:  "Results: Track Beta",
            resultsGamma: "Results: Track Gamma",
            welcome:    "Welcome ",
            welcomeEnd: "!"
        },
        fr: {
            score:      "Score: ",
            multiplier: "Multiplicateur: ",
            speed:      "Vitesse: ",
            lap:        "/3 : Tour",
            lapTime:    " :Temps tour",
            raceTime:   " :Temps total",
            rank:       " rang: ",
            resultsAlpha: "Resultats: Piste Alpha",
            resultsBeta:  "Resultats: Piste Beta",
            resultsGamma: "Resultats: Piste Gamma",
            welcome:    "Bienvenue ",
            welcomeEnd: "!"
        },
        de: {
            score:      "Punkte: ",
            multiplier: "Multiplikator: ",
            speed:      "Tempo: ",
            lap:        "/3 : Runde",
            lapTime:    " :Rundenzeit",
            raceTime:   " :Gesamtzeit",
            rank:       " Rang: ",
            resultsAlpha: "Ergebnis: Strecke Alpha",
            resultsBeta:  "Ergebnis: Strecke Beta",
            resultsGamma: "Ergebnis: Strecke Gamma",
            welcome:    "Willkommen ",
            welcomeEnd: "!"
        },
        it: {
            score:      "Punteggio: ",
            multiplier: "Moltiplicatore: ",
            speed:      "Velocita: ",
            lap:        "/3 : Giro",
            lapTime:    " :Tempo giro",
            raceTime:   " :Tempo totale",
            rank:       " grado: ",
            resultsAlpha: "Risultati: Pista Alpha",
            resultsBeta:  "Risultati: Pista Beta",
            resultsGamma: "Risultati: Pista Gamma",
            welcome:    "Benvenuto ",
            welcomeEnd: "!"
        },
        es: {
            score:      "Puntos: ",
            multiplier: "Multiplicador: ",
            speed:      "Velocidad: ",
            lap:        "/3 : Vuelta",
            lapTime:    " :Tiempo vuelta",
            raceTime:   " :Tiempo total",
            rank:       " rango: ",
            resultsAlpha: "Resultados: Pista Alpha",
            resultsBeta:  "Resultados: Pista Beta",
            resultsGamma: "Resultados: Pista Gamma",
            welcome:    "Bienvenido ",
            welcomeEnd: "!"
        },
        pt: {
            score:      "Pontos: ",
            multiplier: "Multiplicador: ",
            speed:      "Velocidade: ",
            lap:        "/3 : Volta",
            lapTime:    " :Tempo volta",
            raceTime:   " :Tempo total",
            rank:       " rank: ",
            resultsAlpha: "Resultados: Pista Alpha",
            resultsBeta:  "Resultados: Pista Beta",
            resultsGamma: "Resultados: Pista Gamma",
            welcome:    "Bem-vindo ",
            welcomeEnd: "!"
        },
        nl: {
            score:      "Score: ",
            multiplier: "Vermenigv.: ",
            speed:      "Snelheid: ",
            lap:        "/3 : Ronde",
            lapTime:    " :Ronde tijd",
            raceTime:   " :Race tijd",
            rank:       " rang: ",
            resultsAlpha: "Resultaten: Baan Alpha",
            resultsBeta:  "Resultaten: Baan Beta",
            resultsGamma: "Resultaten: Baan Gamma",
            welcome:    "Welkom ",
            welcomeEnd: "!"
        },
        pl: {
            score:      "Wynik: ",
            multiplier: "Mnoznik: ",
            speed:      "Predkosc: ",
            lap:        "/3 : Okrazenie",
            lapTime:    " :Czas okrazenia",
            raceTime:   " :Czas calkowity",
            rank:       " pozycja: ",
            resultsAlpha: "Wyniki: Tor Alpha",
            resultsBeta:  "Wyniki: Tor Beta",
            resultsGamma: "Wyniki: Tor Gamma",
            welcome:    "Witaj ",
            welcomeEnd: "!"
        },
        tr: {
            score:      "Skor: ",
            multiplier: "Carpan: ",
            speed:      "Hiz: ",
            lap:        "/3 : Tur",
            lapTime:    " :Tur suresi",
            raceTime:   " :Toplam sure",
            rank:       " siralama: ",
            resultsAlpha: "Sonuclar: Pist Alpha",
            resultsBeta:  "Sonuclar: Pist Beta",
            resultsGamma: "Sonuclar: Pist Gamma",
            welcome:    "Hosgeldin ",
            welcomeEnd: "!"
        }
    };

    // Detect language from GamePix, fall back to English
    var lang = "en";
    if (typeof GamePix !== "undefined" && GamePix.lang) {
        var detected = GamePix.lang();
        // Only use translation if we have one (Latin-script languages)
        if (translations[detected]) {
            lang = detected;
        }
    }

    return translations[lang];
}());
