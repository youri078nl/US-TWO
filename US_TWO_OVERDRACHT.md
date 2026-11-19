# US TWO overdracht | main | 2026-11-19

## Actuele kandidaat
- Acceptatie-PWA: `acceptatie/`, versie `0.17.56-navigation-rc`.
- Publieke Pages URL volgens README (niet extern bevestigd): https://youri078nl.github.io/US-TWO/acceptatie/
- GitHub Pages moet aanstaan en deployment slagen; live bereikbaarheid kon vanuit deze sessie niet worden geverifieerd.
- Main commits: acceptatie/index.html 5cefee8, acceptatie/app.js 3d3dece en 960715d, acceptatie/quest-board.css 1ed86aa, acceptatie/service-worker.js 48549de.
- Visuele verbeteringen: bord/opdrachtkoppen, compacte opdrachten-snelkoppelingen, kaartencollectie standaard dicht, mobiele datekaart-tekst, keyboardfocus en reduced-motion. Originele goedgekeurde 2D-assets ongewijzigd.
- Uitgebreide acceptatie-app bevat goedgekeurd speelbord, 2D-pion, kaartencatalogus, dates en agenda. Supabase is gekoppeld.
- De branch `feature/separate-dates-20261119` met PR #3 bevat eerdere root-0.8.x experimenten. Niet blind mergen naar main: acceptatieversie is uitgebreider.
- Eerdere CI voor bord-pointer-tests was `completed/success`. De uitgebreidere CI en mobiele end-to-end tests zijn niet bevestigd.
- Twee specifieke date-JPEG's uit `US_TWO_DATE_KAARTEN_GITHUB.zip` zijn nog niet gepubliceerd.
- Geen geverifieerde twee-telefoonsynchronisatie, visuele toestelacceptatie of definitieve 1.0.0-release.

## Eerstvolgende stappen
1. Bevestig GitHub Pages bereikbaarheid en juiste deploy.
2. Test Android Chrome en iPhone Safari, inclusief aanmelden/koppelen, bord, opdrachten, dates, agenda, sync en PWA-installatie.
3. Publiceer ontbrekende goedgekeurde datebeelden, controleer artwork en herstel concrete bugs.
4. Voer releasechecks uit en tag 1.0.0 pas na bewijs.


## Update 19 november 2026: 0.17.60-full-board-pan-rc
- Canonieke PWA: `https://youri078nl.github.io/US-TWO/acceptatie/`; GitHub `main`.
- De gebruiker heeft `acceptatie/assets/us-two-user-board.png` zelf vervangen op 19 november (commit `d43fc4d7`), en bevestigde dat de ingebakken dubbele pion verdwenen is.
- CSS-bug hersteld: `#quest-board-stage` was `height:100%` en kneep de 941×1672 portretafbeelding samen in een korte viewport. Stage heeft nu `aspect-ratio:941/1672`, `height:auto`; de bestaande pan-code kan daardoor de gehele afbeelding bereiken. CSS commit `0a0d117c`.
- App- en service-worker-versie verhoogd naar `0.17.60-full-board-pan-rc` om caching te verversen. Nog niet op Android/iPhone bevestigd.
- Er is een nieuw langer conceptbord gegenereerd (769×2045), maar dit is **niet** geüpload naar GitHub of geïntegreerd; bevat afwijkende getekende figuren en is niet zonder meer goedgekeurde definitieve 2D-stijl. Niet stilzwijgend vervangen.
- Eerstvolgende stap: laat de gebruiker op de telefoon controleren of het gehele bestaande bord nu te verslepen is. Voor een nieuw langer bord zijn afbeelding, coördinaten, hitzones en routekaart samen te migreren; bestaande spelstand behouden en geen extra serverstappen introduceren.
- Geen release 1.0.0 claimen zonder telefoon- en synchronisatietests.


## Nieuwe functionele eisen 19 november 2026: voorbereidingsopdrachten en geheime date-missies
- Tijdens het afleggen van een route van exact 60 stappen per wereld kunnen spelers meerdaagse voorbereidingsopdrachten krijgen (bijv. 3 dagen voorbereiding). De taak blijft actief, met deadline, totdat uitvoering is bevestigd; stappen worden slechts eenmaal toegekend bij voltooien, nooit bij alleen starten of plannen.
- Bij het plannen van een date ontvangt exact één van de twee partners een geheime missie die tijdens de date moet worden uitgevoerd of meegenomen. De andere partner ziet alleen de normale date, niet de geheime missie.
- Privacy vereist backend-autorisatie/RLS per ontvanger: niet enkel in de UI verbergen. Deadline, taakstatus, onthullen en afronden moeten synchroniseren. Idempotente beloning; geen dubbele spelstappen. De geheime missie is een bonus bij de date, geen automatische verplaatsing op het bord.
- Dit zijn goedgekeurde nieuwe vereisten, **nog niet geïmplementeerd**. Bestaande werkende agenda, opdrachten en server-voortgang behouden. Voorrang aan bordintegratie en daarna veilige backend-missieopslag.


## Update 19 november 2026: 0.17.61-two-axis-board-rc
- `acceptatie/quest-board-interactions.js` commit `7d59cfb`: board stage afmetingen nu dynamisch op basis van de natuurlijke afbeeldingsverhouding. Staand beeld blijft viewport-breed; liggend beeld krijgt minimaal 1.65× viewportbreedte en ten minste viewporthoogte, zodat horizontaal en verticaal pannen mogelijk wordt. Afmetingen worden ook bij laden/resize herberekend.
- `app.js` en `service-worker.js` naar `0.17.61-two-axis-board-rc`, cacheversie vernieuwd.
- Rekencontrole uitgevoerd bij een hypothetische 350×500 viewport: portret 941×1672 => stage 350×622, panbereik horizontaal 49 px, verticaal 209 px (bij 1.14× zoom); landschap 1648×928 => stage 888×500, panbereik horizontaal 662 px, verticaal 70 px. **Geen echte mobiele browsertest uitgevoerd.**
- Belangrijk: het gekozen brede ontwerp (afbeelding 2) is nog niet in GitHub opgeslagen, en de 60 vaste waypoint-posities zijn nog niet naar die afbeelding gemigreerd. NIET live vervangen zonder routecontrole. De bestaande serverstand blijft leidend.
- Meerdaagse voorbereidingsopdrachten en ontvanger-privé date-missies blijven openstaande functies. Voor echte geheimhouding is backend-RLS noodzakelijk; niet alleen verbergen in frontend.


## Update 19 november 2026: 0.17.62-wide-board-route-rc
- Gebruiker uploadde breed bord onder naam `acceptatie/assets/a_vibrant_highly_detailed_whimsical_fantasy_isla(1).png` (GitHub commit `1af6d46e`). Bestand bestaat en is in `acceptatie/index.html` als primaire bordafbeelding geactiveerd (`6f3d3489`).
- `acceptatie/quest-board.js`: oude portretcoördinaten vervangen door 61 deterministische, naar booglengte gespreide posities op een vaste, niet-vertakkende brede route, voor 0 t/m 60 stappen per wereld (`c8a43872`). Serverpositionering, rewards en voortgang niet gewijzigd.
- `quest-board.js` tekent een genummerde 0/10/20/30/40/50/60 SVG routeguide boven het brede bord (`5936aa8b`), zodat het werkelijke piontraject zichtbaar is. Dit is een expliciete **spelroute-overlay**, niet de claim dat alle decoratieve roze wegen in de gegenereerde illustratie exact dezelfde route vormen. Voor volledige pixelnauwkeurigheid is handmatige board-art-herziening nodig.
- Locatiehitzones aangepast aan het brede bord (`b82c14c2`). Versie en SW-cache verhoogd naar `0.17.62-wide-board-route-rc`.
- Nog geen live telefoon-/end-to-end test. Eerste volgende stap: testen op beide telefoons, met nadruk op pannen, 60 stappen, zichtbare route en aanklikbare locaties. Daarna route-overlay esthetisch integreren in definitieve art.
