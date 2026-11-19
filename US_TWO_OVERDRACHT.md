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


## Besluit gebruiker 19 november 2026: terug naar vorige halve speelbord
- De gebruiker heeft het brede speelbord en de nieuwe 60-stappen-overlay afgewezen omdat de getekende route niet klopte. NIET opnieuw activeren zonder uitdrukkelijk verzoek.
- `acceptatie/index.html`, `acceptatie/quest-board.js` en `acceptatie/quest-board.css` zijn inhoudelijk teruggezet naar de eerdere `0.17.61`-situatie van commit `c3990981` (originele staande halve speelbordafbeelding en oorspronkelijke pionroute).
- PWA-versie/cache verhoogd naar `0.17.63-half-board-restored-rc` om oude breedbeeld-assets uit cache te halen. De brede upload blijft als ongebruikt bestand staan; spelgegevens en Supabase-schema niet aangepast.
- Meerdaagse voorbereidingsopdrachten en geheime date-missies blijven goedgekeurde, nog niet geïmplementeerde functies.
- Geen live Android/iPhone-test uitgevoerd; na deploy visueel controleren dat de oude halve speelbordweergave weer actief is.


## Update 19 november 2026: 0.17.64-fit-entire-board-rc
- Gebruiker zag nog het afgewezen genummerde brede routepad en wilde het volledige oorspronkelijke speelpad tegelijk kunnen zien.
- `acceptatie/quest-board-interactions.js` gebruikt nu `fitZoom()` op basis van viewport- en bordafmetingen; `reset()` opent het originele portretbord geheel in beeld (zoom kan kleiner dan 1), waarna de gebruiker handmatig kan inzoomen en pannen. Bij beeldladen opnieuw resetten. Bestaande gamepositionering niet veranderd. Commit `b1d41d1`.
- Afgewezen `#quest-route-guide` wordt bij initialisatie verwijderd en via CSS `display:none!important` verborgen als stale cache-JS hem toch injecteert. Commit `0c04bad`.
- App + service worker versie `0.17.64-fit-entire-board-rc` voor cacheverversing. `index.html` blijft de oorspronkelijke `us-two-user-board.png` gebruiken; `quest-board.js` bevat geen `drawRoute()` meer.
- Code-inhoud en GitHub commits gecontroleerd; echte telefoon-/browser-rendering niet getest. Bij klachten over oude weergave eerst harde herlaadactie of PWA-cache verifiëren.


## 19 november 2026: 0.17.68-preparation-ux-rc
- Het oorspronkelijke speelbord blijft vastgezet op de teruggezette bron van commit `1ed86aaf` voor de bordbestanden. Geen nieuwe bordwijzigingen.
- Inspectie van `quest-pilot.js` bevestigt dat superdates al een servergestuurde voorbereiding met `prep_until`, eigen geheime `my_prep`, gereedmeldingen, tweezijdige toestemming en afronding hebben. Dit is NIET hetzelfde als willekeurige meerdaagse opdrachten of geheime missies bij iedere geplande date.
- Verbeterd: de voorbereiding toont nu een leesbare Nederlandse datum en resterende dagen/uren/minuten in plaats van ruwe tijdstempel en debug-revisie. Commit `f56dd156`.
- App/SW naar 0.17.68. Nog niet geverifieerd met twee echte accounts of op Android/iPhone. De gevraagde aparte ontvangergeheime date-missies en generieke meerdaagse opdrachten zijn nog open.
- Volgende concrete werkstap: bestaand Supabase schema en RLS inspecteren; private missieopslag per ontvanger ontwerpen en autorisatietests uitvoeren; geen frontend-only geheimhouding.


## 19 november 2026: veilige basis geheime date-missies (Supabase)
- Project `vuigivzwkxelsisbjjlk`, public tabel `us_date_secret_missions` aangemaakt met `id`, `date_id`, `couple_id`, `recipient_id`, `mission_text`, status, completion/reveal timestamps; unieke `date_id` voorkomt meerdere missies bij dezelfde date.
- RLS ingeschakeld. SELECT voor `authenticated` is alleen toegestaan wanneer `recipient_id=auth.uid()` EN datum/couple kloppen EN gebruiker lid van het koppel is. `anon` heeft geen SELECT. INSERT/UPDATE/DELETE voor gewone clients expliciet ingetrokken; daardoor kan een partner geen geheime opdracht zelf toewijzen of herschrijven.
- Databasechecks uitgevoerd: RLS true, ontvanger-policy aanwezig, anon SELECT false, authenticated SELECT true, INSERT false, UPDATE false. Geen echte gebruiker-impersonatie-/2-telefoon-test.
- Nog niet klaar: server-side veilige toewijzing bij bevestigde date, afrondings-RPC met eigenaarscontrole, clientweergave voor ontvanger, realtime refresh en end-to-end tests. De tabel alleen is geen afgeronde feature. Bord en bestaande data ongewijzigd.


## 19 november 2026: 0.17.69-secret-missions-rc
- Servertrigger `us_two_assign_date_secret_mission` op `public.us_dates` aangemaakt en afzonderlijk gecontroleerd: enabled (`tgenabled='O'`). Bij nieuwe bevestigde date krijgt de andere partner dan de voorstelmaker exact één missie; `unique(date_id)` en `on conflict do nothing` voorkomen dubbele uitgifte. Zes standaardmissies.
- RLS op `public.us_date_secret_missions`: alleen ontvanger met gekoppeld lidmaatschap mag SELECT; clients kunnen niet INSERT/UPDATE/DELETE. Geen backfill van bestaande geaccepteerde dates uitgevoerd; alleen nieuwe bevestigingen.
- `acceptatie/index.html` en `app.js` tonen ontvanger-missies in agenda; sessie- en generatiecontrole voorkomt oude async-weergave na accountwissel. HTML ontsmet met `safe()`.
- Versie/SW naar 0.17.69. Geen mobiele twee-account-test, geen daadwerkelijke trigger-uitgifte met testdate uitgevoerd. Nog open: missie afronden en serverzijdig vastleggen, correcte annulering/verschuiving, realtime tests en generieke meerdaagse opdrachten.
- Speelbord niet gewijzigd; eerdere Android-bord-/navigatiecontrole door gebruiker voor 0.17.68 gemeld.


## 19 november 2026: 0.17.70-secret-completion-rc
- `public.us_complete_date_secret_mission(uuid)` toegevoegd. Controleert `auth.uid()`, exact ontvangerschap, koppellidmaatschap en bevestigde date; row lock en herhaalde complete-oproep leveren dezelfde status op (idempotent). Geen automatische bordbeloning.
- Alleen `authenticated` mag RPC uitvoeren; `anon` niet. Privilegecheck uitgevoerd; `mission_count=0` dus geen echte missievoltooiing getest.
- Agenda toont `Missie afgerond`-knop voor toegewezen missies en status bij voltooide missies; API-call via bestaande `rpc()` met sessie. App/SW 0.17.70.
- Open: end-to-end twee gebruikers, annuleringen en datewijzigingen, generieke meerdaagse opdrachten, volledige PWA-tests. Bord ongemoeid.


## 19 november 2026: annulering geheime date-missies + transactionele test
- `us_two_private.sync_date_secret_mission()` + `us_two_sync_date_secret_mission` trigger op statuswijziging `public.us_dates` toegevoegd. Bij `cancelled` of `declined` worden alleen nog `assigned` geheime missies `cancelled`; voltooide historie blijft behouden. De bestaande frontend toont alleen missies voor dates met status `accepted`.
- Beide triggers via `pg_trigger` bevestigd enabled (`O`).
- Transactionele SQL-test met bestaande gekoppelde gebruikers als referentie: tijdelijke proposed date ingevoegd, geaccepteerd, precies één ontvanger-missie gecontroleerd, herhaalde accept-update gecontroleerd op geen duplicaat, daarna date geannuleerd en missie-status `cancelled` geverifieerd. Alles binnen `BEGIN ... ROLLBACK`; vervolgquery bevestigt nul achtergebleven testdates en nul missies. Geen echte mobiele twee-accounttest.
- Frontend versie blijft 0.17.70, omdat uitsluitend backendlogica is aangepast. Nog open: echte Android/iPhone synchronisatietest, meerdaagse quests, PWA-releasechecks.


## 19 november 2026: 0.17.71-private-screen-rc
- Privacyfix in `acceptatie/app.js`: bij uitloggen en wisselen naar ander account wordt de DOM met geheime date-missies onmiddellijk leeggemaakt; eerdere `authGeneration`-controle blijft behouden tegen late netwerkantwoorden.
- `acceptatie/service-worker.js` versie/cache naar 0.17.71. Bord en spelregels niet gewijzigd.
- Code naar GitHub main geschreven. Geen browser/device test uitgevoerd. Meerdaagse quests en twee-device acceptatie blijven open.


## 19 november 2026: 0.17.72-private-race-rc
- Concurrencyfix in `acceptatie/app.js`: `secretMissionRequestSeq` voorkomt dat vertraagde oudere GET-antwoorden of fouten een nieuwer geheim missieoverzicht overschrijven. Bij logout/accountwissel wordt requestgeneratie direct ongeldig gemaakt. Eerdere auth-generationcontrole blijft actief.
- `acceptatie/service-worker.js` cacheversie verhoogd naar 0.17.72. Speelbord en gameplay niet gewijzigd.
- Code op main vastgelegd; geen browser- of tweetelefoontest. Database-inspectie toont 240 catalogusopdrachten, max `minutes=210`, geen opdrachten met `minutes>=1440`. Algemene meerdaagse opdrachten zijn dus nog NIET geïmplementeerd; dit vergt aparte servergebaseerde voortgang in plaats van alleen een frontendlabel.


## 19 november 2026: 0.17.73-forest-shortcut-rc
- Gebruiker meldt dat Bos op speelbord niet zichtbaar/aanklikbaar is. Inspectie: bestaande `#quest-location-forest` zit op 7% bovenaan het hoge, sleepbare bord en kan buiten de zichtbare viewport vallen.
- Fix: vier permanent zichtbare knoppen direct onder het bord (Vliegveld, Strand, Woonkamer, Bos) in `acceptatie/index.html`, aangesloten op bestaande `USTwoDateBrowser.openLocation` in `quest-board-interactions.js`. Mobiele 2x2-layout in `quest-board.css`.
- Goedgekeurde bordafbeelding, formaat, pionpositie en bestaande hotspots zijn NIET veranderd. App/SW naar 0.17.73. GitHub commits: ad930d9, 82ebafe, e0827bd, d360622, e8b6dae.
- Nog geen fysieke Android-test; gebruiker moet controleren of Bos nu zichtbaar en aanklikbaar is.


## 19 november 2026: 0.17.74-location-navigation-rc
- Gebruiker meldt dat alle vier de snelknoppen onder het bord geen zichtbaar resultaat geven. Oorzaak in code: `openLocation()` wijzigde wel het locatieveld maar hergebruikte `proposalKeys` van een vorige locatie; `activate()` genereerde alleen nieuwe voorstellen als die lijst leeg was. Bovendien geen duidelijke feedback of scroll naar de gefilterde resultaten.
- `quest-date-browser.js`: `openLocation` is nu async, wist oude voorstelcache, opent Dates, laadt catalogus, maakt nieuwe locatiegebonden voorstellen, toont aantal passende dates en scrollt naar de resultaten. `living`-label gewijzigd in Thuis. `acceptatie/index.html`: snelknop Woonkamer → Thuis. Vliegveld ongewijzigd op expliciet verzoek.
- App en SW versie naar 0.17.74. Geen wijzigingen aan goedgekeurd bord, afmetingen, pion of database. GitHub commits 219a6f6, af60f2b, c26aae2, 3e9ad3c. Nog geen echte Android-browsertest: gebruiker moet bevestigen dat de knop de Dates-pagina opent en relevante voorstellen toont.


## 19 november 2026: 0.17.75-board-fullscreen-rc
- Gebruiker vraagt bij kiezen van Spelbord een fullscreen speelbord, zonder andere opties, uitsluitend bestaande onderste navigatiebalk; hotspots Bos/Vliegveld/Thuis/Strand op hun oorspronkelijke bordlocaties laten.
- `acceptatie/app.js`: body-class `us-two-board-fullscreen` alleen voor game/board, niet voor opdrachten of andere tabs. Bij openen resize-event voor panningmeting.
- `acceptatie/quest-board.css`: fullscreen fixed bord boven onderste navigatie; kopbalk, voortgang, extra snelknoppen onder het bord en overige spelbediening in bordmodus uit beeld. Bestaande hotspots, board art, pion en spelregels behouden. `acceptatie/service-worker.js` versie 0.17.75.
- GitHub commits 5b8fae2, db6c1b0, 912c23d. Geen echte mobiele browsertest; controleer op Android dat bord scherm vult, slepen werkt, hotspots op originele plaats staan en onderste navigatie functioneert. CSS gebruikt geen Fullscreen API en laat de telefoonstatusbalk bestaan.


## 19 november 2026: NOODHERSTEL 0.17.76-board-restore-rc
- Gebruiker meldt: 'Speelbord is verdwenen' direct na 0.17.75 fullscreen CSS.
- Direct 0.17.75 fullscreen CSS geheel teruggedraaid in `acceptatie/quest-board.css` (commit 52cd8e6); body-class en resize hook teruggedraaid in `acceptatie/app.js` (commit 146eac5). Serviceworker versie verhoogd naar 0.17.76 (commit e966c88).
- Vorige zichtbare bordlayout teruggezet; niet opnieuw fullscreen activeren zonder echte mobiele layouttest. Bord/pion/database ongewijzigd. Gebruiker moet bevestigen dat bord weer zichtbaar is. Fullscreenwens staat OPEN.


## 19 november 2026: zes wereldontwerpen, nog NIET geïntegreerd
- Gebruiker keurt zes visuele ontwerpen goed en vraagt integratie. Een lokale ZIP `US_TWO_ZES_WERELDEN_PREVIEW.zip` is in de chat gemaakt, met zes afzonderlijk uitgesneden JPG's uit de laatst gegenereerde collage en een bladerbare `index.html`. Dit is GEEN production release; ZIP is niet in GitHub opgeslagen.
- Kritiek: backend `us_two_private.quest_world(p_pair uuid,p_position integer)` gebruikt expliciet `%60` en `/60` en superdate-gates op 60; `acceptatie/quest-board.js` gebruikt `CELLS_PER_WORLD=60` en 6 oude wereldnamen. Alleen frontend op 40 zetten zou voortgang en superdate-gates desynchroniseren. Migratie pas doen met inventarisatie van alle 60-constanten, bestaande data en rollbackstrategie.
- Productie blijft 0.17.76. Goedgekeurd ontwerp: zes thema's Bergbos, Moulin Rouge (licht erotisch), Middeleeuwen, Vakantie, Fantasie, Snoepland, identieke 2D-personages; nevelpoort onder brug en witte Kia Rio met zwaaiende Kim. Echte integratie van beeldbestanden en 40-vakjes regels nog OPEN.


## 19 november 2026: 0.17.77-borderless-board-rc
- Op expliciet verzoek een randloos, volledig speelbord (alleen onderste navigatie) gebouwd. In tegenstelling tot mislukte 0.17.75 wordt `#quest-world-viewport` zelf fixed gepositioneerd met expliciete `100dvh - navigatie` hoogte; geen flex-parent die viewport tot nul kan reduceren. Header, voortgang, snelle locaties onder bord en rand verborgen; originele hotspots op de afbeelding behouden. Board-only bodyclass in `setTab` uitsluitend bij game/board. Versie/cache 0.17.77. Commits d181924, 249cabe, dfccbaa.
- Nog niet op echte Android/iPhone getest; bij onzichtbaar bord direct terugrollen naar 0.17.76. Zes nieuwe thema-afbeeldingen en 40-stappen-migratie nog NIET in productie.


## 19 november 2026: 0.17.78-immersive-cachefix-rc
- Screenshot gebruiker toont nog oude US TWO header, titel, voortgang, oude afbeelding, niet fullscreen na 0.17.77. Dit bewijst dat gewenste weergave niet bereikt is, maar bewijst niet definitief waarom (cache, stylesheet of state).
- `acceptatie/index.html` commit 1cd208f: inline fullscreen CSS in HTML als extra zekerheid, app.js en quest-board.css URL met `?v=01778` voor cache-busting, onafhankelijke event handler die board-only class synchroniseert op onderste navigatie en tab-change. `app.js` en serviceworker versie 0.17.78 commits f449da9 en 0a64520.
- Nieuwe bergbos-illustratie nog NIET in GitHub/PWA; huidige bordkunst blijft `assets/us-two-user-board.png`. Geen Android runtime-test beschikbaar; gebruiker opnieuw laten controleren. Als fullscreen nog faalt, inspecteer echte browser DOM/runtime i.p.v. CSS blijven stapelen.


## 19 november 2026: 0.17.79-csp-boardfix-rc
- Gebruiker meldt dat 0.17.78 nog steeds de oude, niet-fullscreen weergave toont.
- Aantoonbaar codeprobleem: `acceptatie/index.html` CSP `script-src 'self'; style-src 'self'` blokkeert de in 0.17.78 toegevoegde inline `<script>` en `<style>`; deze waren dus onbruikbaar. Beide verwijderd (commit d5537c6).
- `quest-board.css` bevat nu CSS-only `body:has(#bottom-nav ... .active)` fullscreen-selector, onafhankelijk van body-class en inline script (commit 4c21e1a). `index.html` gebruikt `quest-board.css?v=01779` en `app.js?v=01779`; app en SW naar 0.17.79 (commits a3af656, 2b32b9f).
- Niet claimen dat Android-layout getest of hersteld is: wacht op concrete bevestiging. Indien nog oud: check geladen URL en DevTools/netwerk/CSP en laat gebruiker Chrome rechtstreeks openen. Nieuwe wereldkunst nog niet geïntegreerd.
