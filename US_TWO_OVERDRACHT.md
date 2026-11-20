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


## 19 november 2026: 0.17.80-world-import-rc
- Gebruiker bevestigde 0.17.79 fullscreen op Android als correct. Fullscreen CSS NIET gewijzigd.
- Toegevoegd `acceptatie/quest-world-images.js`: zes lokale, door gebruiker goedgekeurde JPG/PNG/WebP `wereld-1` t/m `wereld-6` in IndexedDB opslaan en op basis van bestaande serverwereld automatisch op bord weergeven. In `index.html` onder spelbord een importdetails en file-input toegevoegd. Commits 44c70f6, 2f035e7. SW SHELL en app versie 0.17.80 commits 204ee39, 3d2ce9e.
- Belangrijke beperking: bestanden worden NIET automatisch door GitHub geserveerd; gebruiker moet eenmalig de zes afbeeldingen uit ZIP op elk toestel importeren. Alleen wereld 1 is meteen zichtbaar zolang server op wereld 1 staat. De bestaande pion-PATH is afgestemd op OUDE bordillustratie, dus pion volgt op nieuwe afbeelding nog NIET exact het hartjespad. 60 stappen per wereld en backend onveranderd. 40-stappenmigratie, servergehoste assets en wereldpaden zijn nog OPEN. Niet claimen dat de volledige app klaar is.
- Nog geen echte mobiele importtest. Bij vervolg eerst browserconsole/JS syntax check, daarna exact pad en backendmigratie; voorkom wijzigingen aan bewezen fullscreen.


## 19 november 2026: 0.17.81-world-settings-rc
- Gebruiker vraagt expliciet automatische integratie van de zes nieuwe wereldkaarten in PWA, zonder handmatige import. De zes JPG's zijn in chat ZIP `/mnt/data/US_TWO_ZES_WERELDEN_PREVIEW.zip` (wereld-1.jpg t/m wereld-6.jpg; elk 409x625/626), maar zijn NIET op GitHub geüpload. Huidige GitHub connector ondersteunt tekstbestanden en blob base64, maar de container heeft geen netwerktoegang; geen binaire bridge beschikbaar. Claim dus niet dat automatische afbeeldingen geïntegreerd zijn.
- Wel opgelost: import was onzichtbaar onder fullscreen bord en dubbel in HTML. In `acceptatie/index.html` zijn beide verborgen/duplicaat-invoervelden verwijderd en één importpaneel onder tab Meer toegevoegd (commit 7cb7542). App/SW versie 0.17.81 (commits 64ed6a2, da4b577). Fullscreen onaangeroerd.
- OPEN: upload zes echte JPG assets naar `acceptatie/assets/worlds/` via Work/cloud browser of geschikte binaire GitHub upload, update `quest-world-images.js` voor automatische statische assets en corrigeer artwork/pion-pad; backend 40 stappen nog niet aangepast. Geen mobiele test uitgevoerd.


## 19 november 2026: 0.17.82-world-refresh-rc
- Gebruiker meldt dat na herhaald importeren van zes JPG's de kaart niet verandert. Oorzaak nog niet op toestel bevestigd. In `quest-world-images.js` wordt geïmporteerde kaart opnieuw weergegeven bij terugkeer naar Bord; `index.html` scriptquery `01782`, appversie 0.17.82, service-worker cachebust. GitHub commits b1adee6, 9e71243, 6308b2c, bce44d4.
- Nog NIET bevestigd dat dit op Android werkt; gebruiker moet de statusmelding onder Meer doorgeven als de kaart niet verandert. Automatische hosting van zes JPG's blijft open; 40-stappen-migratie blijft open.


## 19 november 2026: 0.17.83-android-import-fix-rc
- Screenshot Android: 6 bestanden geselecteerd maar import toont 'Selecteer alle zes bestanden'. ZIP op container gecontroleerd: bevat wereld-1.jpg t/m wereld-6.jpg.
- `quest-world-images.js` accepteert nu Android file picker met leeg MIME-type en namen met downloadsuffix `(1)`; bij afwijzing worden de herkende wereldnummers en exacte ontvangen bestandsnamen getoond. Commit 5ce17e5. HTML/script cachebust 01783, app en SW versie verhoogd. Niet op toestel getest.
- Open: gebruikersvalidatie import, automatische hosting van afbeeldingen, correcte waypoint-uitlijning en 40-stappen-backend.


## 19 november 2026: 0.17.84-world-import-racefix-rc
- Na Android screenshot en geen zichtbaar effect: in `acceptatie/index.html` stonden TWEE identieke `<script src="./quest-world-images.js">` tags. Daardoor werden dubbele change-listeners geregistreerd en konden twee asynchrone display() uitvoeringen elkaar overschrijven. Eén script verwijderd; app.js cachebust 01784. Importstatus toont nu 'Importfunctie gereed', daarna aantal ontvangen bestanden. `displayGeneration` beschermt tegen stale image loads. GitHub commits 37c0d09, d95ee13, 3a9931d, b8ee72f.
- Niet op Android getest. Gebruiker moet op Meer de status 'Importfunctie gereed' zien; na import 'Alle zes wereldkaarten opgeslagen'. Als status ontbreekt, is scriptload/CSP/cache nog probleem. 6 afbeeldingen nog niet automatisch op server; 40-stappen-regels ongewijzigd.


## 20 november 2026: 0.17.85-gallery-names-rc
- Android screenshot bewijst de fout: zes geselecteerde bestanden heten 125215.jpg, 125216.jpg, 125217.jpg, 125218.jpg, 125219.jpg, 125220.jpg. Voorheen herkende regex alleen wereld-1.jpg ... wereld-6.jpg.
- `quest-world-images.js` heeft fallback voor exact zes numeriek benoemde afbeeldingsbestanden; sorteert op bestandsnummer en koppelt aan wereld 1 t/m 6. Commit c852d42. App, HTML en SW cache versie 0.17.85. Dit is niet live op Android gevalideerd. Let op: volgorde op basis van bestandsnummer veronderstelt dat beelden in juiste volgorde zijn geselecteerd.
- Open: bevestiging van juiste kaart/volgorde; automatisch serverhosten van zes beelden, waypoint-alignering en backend 40-stappen-regels.


## 20 november 2026: gerichte spelreset Youri + Kim
- Profielen in `us_members`/`us_profiles` geïdentificeerd: koppel `98344694-5ab1-4f03-8dcf-5b1f9504a5d6` bevat `Youri` en `Kim`; tweede koppel `ee36a0ed-50e2-44b4-adc5-6e213b13ac04` bevat `Henk` en `Kim` en is ongemoeid gelaten.
- In Supabase transactie voor alleen Youri+Kim: `us_quest_games` positie 0/phase choose en actieve opdracht/vraagvelden leeggemaakt; `us_board_progress` positie 1 (minimum volgens check constraint); `us_question_games` positie 1 en vraagstatus gereset; `us_quest_completed`, `us_quest_question_results`, `us_quest_milestones` voor dat koppel verwijderd. Accounts, koppel, dates en agenda niet verwijderd. Verificatie: Youri+Kim quest 0, board 1, completed 0, dates 14; ander koppel quest 2, board 2, completed 1, dates 7.
- Screenshot iPhone Kim toont OUDE board art; Android Youri toont nieuwe Bergbos art. Lokale IndexedDB import is niet gesynchroniseerd; zes JPG's nog niet op GitHub gehost. Prioriteit: automatische gedeelde wereld-assets, daarna pionpad/40-stappen migratie.


## 20 november 2026: 0.17.87-world-cloud-sync-rc
- In Supabase migration `us_two_private_world_art_storage` private bucket `us-two-world-art` aangemaakt, max 6 MB/object, alleen JPEG/PNG/WEBP; storage.objects SELECT/INSERT/UPDATE policies vereisen authenticated membership in couple van het pad. Migratie bevestigd `success:true`.
- `acceptatie/quest-world-images.js`: synchroniseert lokaal geïmporteerde JPG's vanuit IndexedDB automatisch naar Supabase Storage op pad `<couple_id>/wereld-1.jpg` ... `/wereld-6.jpg`; ander gekoppeld toestel downloadt ontbrekende kaarten automatisch via JWT en slaat ze in eigen IndexedDB op. Gebruikt huidige sessie uit `us-two-web-session-v2:<acceptatie path>`; 30s poll, eenmalige upload per sessie. Commits 5ba9cc4, 88d4e56. HTML/app/SW 0.17.87.
- **Niet live op twee apparaten gevalideerd**. Gebruiker moet eerst 0.17.87 op Android openen met bestaande lokaal geïmporteerde kaarten, daarna op Kims iPhone openen. Controleer foutmelding onder Meer bij falen. Backend reset van Youri/Kim is bevestigd (quest pos 0, board pos 1).
- Caveat: iPhone kan nog originele afbeelding tonen tot upload op Android is voltooid; foutmelding/status onder Meer. Cloud assets zijn nog niet GitHub-gehost maar nu wel per koppel gedeeld via Supabase. Wegpunten/pionpositie voor nieuw beeld en 40 stappen per wereld zijn nog open.


## 20 november 2026: 0.17.89-bergbos-startfix-rc
- Gebruiker meldt: pion staat na reset niet op 0, nieuwe kaart lage resolutie. Server reset eerder bevestigd: quest position=0, board position=1 (board constraint). `quest-board.js` gebruikte oorspronkelijke 941x1672 board path voor nieuwe Bergbos-afbeelding, waardoor pion rechts bij waterval stond. Nieuw `BERGBOS_PATH` op 409x626 afbeelding begint bij hartportaal onderaan (x245,y520) en loopt langs het pad naar boven. `point()` kiest nieuw pad wanneer `worldImageApplied=1` en `serverWorld=0`. `quest-world-images.js` zendt event `us-two-world-art-updated`; `quest-board.js` herplaatst pion onmiddellijk. Commits eb068a5, 97f8e52, c0244b4. Release 0.17.89. **Niet op toestel getest.**
- Preview wereld-1.jpg is daadwerkelijk 409x626 pixels, ~140KB, dus beeld is onscherp op moderne telefoon. Geen bron met aantoonbaar hogere resolutie voor exact deze kaart gepubliceerd. Lanczos upscaling is geen echte kwaliteitsverbetering. Vereist een nieuw goedgekeurd high-res bronbeeld en upload. De zes afbeeldingen worden nog via lokale import + Supabase Storage gedeeld, niet statisch in GitHub. Overige vijf wereldroutes nog niet opnieuw ingemeten.
- 40 stappen per wereld nu Supabase functie `us_two_private.quest_world` + quest-board.js (commit ff40a37), SQL grenscontrole 0/1/39/40/79/80/239 geslaagd. Geen complete E2E gameplaytest.


## 20 november 2026: 0.17.90-cloud-sync-diagnostics-rc
- Supabase query `storage.objects` voor bucket `us-two-world-art` retourneerde **0 objecten**. Daarmee is bewezen dat de zes kaarten op dit moment nog niet centraal geüpload zijn, ondanks eerdere implementatieclaims. Kims iPhone kan ze daarom nog niet ophalen. De afbeeldingen staan wel lokaal op Youri's Android.
- `quest-world-images.js` sync aangepast: haalt eerst per wereld de serverkopie op, downloadt als lokaal ontbreekt, uploadt uitsluitend als serverkopie ontbreekt (voorkomt wederzijds overschrijven). Status in Meer toont nu `Cloudkaarten: X/6 beschikbaar`, of concrete HTTP-fout. Sync start na sessie-updates, bij terugkeer naar tab en periodiek. Commits f215165, 23d6dd6. HTML/app/SW 0.17.90. Nog niet live op beide toestellen getest.
- Actie: open 0.17.90 op Android (met geïmporteerde beelden), controleer onder Meer dat `Cloudkaarten: 6/6` verschijnt. Daarna dezelfde versie op iPhone openen. Als fout, gebruik exacte melding voor serverfix. Geen nieuwe import nodig.
- Lage resolutie van 409x626 originele preview blijft open. Een hogere-res goedgekeurde bron is nog niet beschikbaar. E2E gameplay en 5 overige pionroutes nog niet geverifieerd. Geen 1.0.0 release.


## 20 november 2026: 0.17.91-world-route-fix-rc
- User vindt het huidige bord slecht en autoriseert een nieuwe kaart in dezelfde 2D-stijl. Er is een nieuwe Bergbos-conceptillustratie gegenereerd, maar deze is **niet** live geplaatst: de AI-render bevat onjuiste/ontbrekende/gedupliceerde vaknummers en is dus geen betrouwbaar 40-vakken-bord. Niet als functioneel spelbord inzetten zonder een aparte exact berekende interactieve laag.
- Wel live codecorrectie: `quest-board.js` gebruikte voor Bergbos `Number(dataset.worldImageApplied)===1` maar `quest-world-images.js` schreef `String(world)` waarbij Bergbos 0 is. Hierdoor werd de juiste route nooit geactiveerd. Nieuwe `dataset.worldImageApplied='themed'` bij geïmporteerde afbeelding en `'original'` bij fallback; `THEMED_PATH` voor alle zes vergelijkbare S-vormige kaarten (gebaseerd op genormaliseerde 409x626 art), start rechtsonder. Commits 35e5ac4,4657778. Release 0.17.91.
- Niet E2E getest. De zes JPG's zijn nog niet aantoonbaar cloudgeüpload. HD-bron van de zes kaarten in gesprek aanwezig; automatische publicatie van binaire afbeeldingen op GitHub niet uitgevoerd. Hoge-res nieuwe kaart is concept, niet geaccepteerd of geïntegreerd. Test volgende stap: zichtbare pionpositie bij serverstap 0 en werkelijke cloud status 6/6; daarna de zes high-res beelden centraal hosten.


## 20 november 2026: 0.17.92-exact-forty-tiles-rc
- Nieuwe functionele overlay `#quest-board-tiles` met exact 40 DOM-vakjes (1..40) per wereld. In `quest-board.js` bepaalt `tilePoint(n)` zowel de positie van het vakje als die van de pion op geïmporteerde wereldkaarten; `updateTiles(step)` markeert de afgelegde vakjes. Bij stap 0 staat de pion bij het onderste startportaal. Het spel schrijft nog steeds uitsluitend servervoortgang, niet via de overlay.
- CSS overlay verschijnt alleen wanneer de geïmporteerde wereldafbeelding actief is (`data-world-image-applied=themed`). De originele bordweergave blijft ongewijzigd. Dit corrigeert de onbetrouwbare nummers in AI-afbeeldingen zonder ze als spelregels te gebruiken.
- Gewijzigd: `acceptatie/quest-board.js`, `acceptatie/quest-board.css`, HTML placeholder 40 in plaats van 60; release 0.17.92, cache/version verhoogd.
- Nog NIET bewezen: pixelprecisie van 40 visuele hartjes ten opzichte van nieuwe achtergronden; daadwerkelijke HD-afbeeldingen op beide telefoons; E2E-test op iPhone/Android; servervoortgang 0 op beide apparaten. Geen 1.0.0 release. Achtergrond is nog steeds de bestaande geïmporteerde afbeelding, geen automatisch gepubliceerde nieuwe illustratie.


## 20 november 2026: 0.17.93-clean-road-rc
- Android screenshot 19:20 toont ernstige visuele fout in 0.17.92: genummerde vakjes 1..40 liggen grotendeels naast het zichtbare hartpad en bedekken de achtergrond. Pion stond rechtsonder.
- Correctie: `quest-board.js` THEMED_PATH hertekend met 409x626-genormaliseerde coördinaten langs het zichtbare S-pad, stap 0 bij hartportaal. `quest-board.css` maakt de 40 nummerbubbels onzichtbaar, behoudt 40 logische DOM-vakjes en voegt START-badge toe op de pion bij stap 0. `index.html` vernieuwt CSS cachebust van 01779 naar 01793; app/SW 0.17.93.
- Niet live getest op Android of iPhone; coördinaten zijn benaderd uit screenshot, geen pixelnauwkeurige route-validatie. Geen reset van spelvoortgang. HD assets en cloudsynchronisatie nog niet volledig geverifieerd.


## 2026-11-20 — Erotiek 18+ toestemming backend
- Gebruiker zag `Toestemming kon niet worden opgehaald` bij Meer → Erotiek (18+).
- Vastgesteld: `public.us_members` heeft RLS en `authenticated` heeft geen SELECT-recht; `public.us_adult_consent_state` en `public.us_adult_consent_set` waren SECURITY INVOKER en lezen `us_members`, dus ledenlookup faalde.
- Supabase-migratie `fix_adult_consent_rls_member_lookup` toegepast: beide bestaande functies SECURITY DEFINER met reeds ingestelde lege `search_path`, EXECUTE ingetrokken van PUBLIC/anon en expliciet toegekend aan authenticated. Beide functies controleren `auth.uid()` en beperken data tot eigen koppel; bestaande RLS op tabellen blijft actief.
- SQL-verificatie: beide functies `prosecdef=true`, `authenticated_allowed=true`, `anon_allowed=false`.
- Geen accounts, spelposities, dates of agenda gewijzigd. Nog niet end-to-end getest met twee ingelogde telefoons. Gebruikerslink: https://youri078nl.github.io/US-TWO/acceptatie/?v=01793
