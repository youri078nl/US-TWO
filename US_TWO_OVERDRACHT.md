# US TWO overdracht 2026-11-19

Repository: https://github.com/youri078nl/US-TWO
Branch: feature/separate-dates-20261119
Pull request: https://github.com/youri078nl/US-TWO/pull/3 (draft)
Ontwikkelversie: 0.8.3. Main was bij eerste inspectie 0.8.0. Geen merge of publicatie uitgevoerd.

## Uitgevoerd
- 0.8.1: zelfstandig Dates-tabblad, date kiezen vult agendaformulier en opent Agenda.
- 0.8.2: speelbord horizontaal scrollbaar op kleine schermen; serverpositie blijft leidend.
- 0.8.3: vier werkende keuzeknoppen Woonkamer, Strand, Vliegveld, Bos. Elke knop verandert de CSS-achtergrond van de bestaande bordweergave. Geselecteerde wereld wordt lokaal in sessionStorage bewaard, niet tussen apparaten gesynchroniseerd.
- HTML/JS/CSS/service-worker op branch bijgewerkt en via GitHub opnieuw uitgelezen; statische aanwezigheid van knoppen, handler, vier thema's en versie/cache gecontroleerd.

## Nog NIET af
- Geen browser-, Android- of iPhone-test uitgevoerd. Geen bewijs van werkende synchronisatie op echte toestellen.
- De werelden zijn voorlopig CSS-thema's, geen goedgekeurde uitgewerkte omgevingen.
- Het speelbord is nog de bestaande 12-vakken-weergave; goedgekeurde volledige bordillustratie en 2D-personages ontbreken nog in deze code.
- Exacte pionstappen, serverlogica, vragen/opdrachten, volledige kaartcollectie en database-integratie moeten gecontroleerd worden.
- PR niet mergen zonder regressietests.

## Volgende actie
Controleer de bestaande backend-spelregels en beschikbare goedgekeurde assets, implementeer correcte pionbeweging met behoud van server-authority en idempotentie. Daarna gerichte browsertests en toesteltests, dan merge en publicatie.

## Update 0.8.5
- Supabase project vuigivzwkxelsisbjjlk: migratie `us_board_skip_without_unearned_progress` toegepast. De functie `public.us_board_skip(uuid)` werkt bij twee skipbevestigingen uitsluitend de ronde bij naar `skipped`; `us_board_progress` wordt niet meer verhoogd.
- Read-back van SQL-functie bevestigd: ledencontrole, row lock en geen UPDATE van `us_board_progress`.
- GitHub-ontwikkelbranch: app.js/index.html/service-worker.js bijgewerkt naar 0.8.5; uitleg in UI volgt nieuwe serverregel.
- Geen live interactietest met twee accounts uitgevoerd. Opdrachtbeloning blijft één stap; variabele stappen zijn nog niet geïmplementeerd.

## Update 0.8.6
- Supabase migratie `board_deterministic_step_rewards` toegepast: `us_board_complete(uuid)` geeft deterministisch 1-3 stappen op basis van cell_no, superopdrachten 3, begrensd tot volgende 20e vakje. Twee bevestigingen vereist, ronde-lock en position-conflictcontrole, herhaalde completed calls zijn idempotent.
- Backend SQL readback gecontroleerd op formule, supergrens, conflictcontrole en idempotentie. Geen live voltooiing met twee accounts getest.
- GitHub app.js, index.html en service-worker.js bijgewerkt naar 0.8.6. App toont verwachte beloning bij actieve opdracht.
- Belangrijk: stappen worden server-side toegepast, maar visuele stapsgewijze pionanimatie en goedgekeurde bordillustratie ontbreken nog. Niet gemerged of gepubliceerd.

## Update 0.8.7
- Frontend app.js: `boardMotion` houdt laatst getoonde positie en serverdoel bij; na synchronisatie loopt de zichtbare pion bij maximaal 12 stappen één vakje per 340 ms vooruit. Bij grotere sprongen, achteruitcorrectie of verminderde animatievoorkeur direct naar serverpositie.
- De spelpositie wordt nooit vanuit de animatie naar Supabase geschreven. Animatie toont nog steeds tijdelijke letterpionnen, niet goedgekeurde 2D-assets.
- GitHub app.js, index.html, service-worker.js, styles.css gecommit; JS-syntaxis gecontroleerd met JavaScript-parser via `new Function`, readback bevestigde 0.8.7.
- Geen browser-/apparaat-/twee-account-end-to-endtest uitgevoerd. Niet gemerged of gepubliceerd.
