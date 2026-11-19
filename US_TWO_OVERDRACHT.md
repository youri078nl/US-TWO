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
