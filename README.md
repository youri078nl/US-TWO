# US TWO webapp 0.6.0

Gratis PWA voor iPhone, naast de bestaande native Android-app. Beide gebruiken Supabase project `vuigivzwkxelsisbjjlk`.

## Publiceren

Upload de bestanden van deze map naar de root van de **openbare** GitHub-repository `youri078nl/US-TWO` (niet de private native-bronrepository `US-TWO.`). Open dan Settings → Pages → Deploy from a branch → main → /(root) → Save. Het adres wordt `https://youri078nl.github.io/US-TWO/` als Pages wordt ingeschakeld en de publicatie slaagt.

## Installeren bij Kim

Open de site in Safari, tik Deel → Zet op beginscherm → Open als webapp. Maak een eigen account aan, bevestig eventueel de e-mail, log in, vul een schermnaam in en gebruik een nieuwe koppelcode van Youri. De code verloopt na 24 uur.

## Aanpassingen & updates

Bij elke wijziging verhoog je de versie in `app.js` en de CACHE-string in `service-worker.js`, daarna commit naar main. De site wordt door Pages automatisch opnieuw gepubliceerd. De webapp meldt dat een update klaarstaat wanneer de nieuwe service worker is geïnstalleerd.

## Beveiliging en beperkingen

De Supabase publishable key is publiek en geschikt voor browsers. Deel **nooit** een Supabase secret of service_role key via GitHub. Alle RPC's gebruiken het accounttoken en server-side gebruikerschecks. Dit is een online MVP: aanmelden, koppelen, agenda, geheim opdrachtbord en updates. Zonder internet werkt de shell eventueel wel, maar geen synchronisatie. Geen pushmeldingen of AI-dateplanner in deze versie. Handmatige synchronisatie elke 20 seconden tijdens gebruik en bij terugkeren in de app.

## Wijzigingen 0.5.0 (10 november 2026)

- Visueel slingerpad met telkens 12 zichtbare vakjes, twee benoemde pionnen op de gezamenlijke serverpositie en een gemarkeerde huidige missie.
- Extra herkenning voor elk 20e vakje (superopdracht); het bestaande serverhoofdstuk van 20 en de doorlopende voortgang blijven ongewijzigd.
- Weergave hoeveel spelers de geheime voorbereiding hebben afgerond (0/2, 1/2, 2/2), met duidelijk startmoment en uitleg waarom de knop voor starten nog niet beschikbaar kan zijn.
- Geen databasewijzigingen. Alle tijdsloten en toestemming om te starten blijven servergestuurd. Android is niet aangepast door deze PWA-update.
- Tests: JS-parse en vijf gerichte, met gemockte serverdata uitgevoerde weergavetests; geen echte toestellen of volledige browserregressie in deze release.

## Wijzigingen 0.5.1 (10 november 2026)

- Twaalf redactioneel gekozen date-ideeën zonder AI-dienst of abonnement.
- Filter op maximaal budget en thuis/buiten; steeds maximaal drie opties tegelijk.
- Een idee invullen is **geen** uitnodiging versturen: datum en tijd zijn verplicht en de gebruiker bevestigt expliciet met de bestaande verzendknop.
- Suggesties zijn lokaal in de webapp, geen claims over actuele plaatsinformatie, beschikbaarheid of echte prijzen.
- Agenda- en borddata blijven in dezelfde Supabase-database; geen schema- of accountwijziging.
- Getest: JavaScript-syntaxis, vier filterscenario's, aanwezigheid van HTML/CSS-elementen en geen RPC bij alleen het kiezen van een idee. Geen echte iPhone-apparaattest uitgevoerd voor deze release.

## Wijzigingen 0.6.0 (10 november 2026)

- Een bestaande **geaccepteerde toekomstige afspraak** kan een nieuw voorstel voor titel, datum, tijd of duur krijgen.
- Voorstel maakt een aparte database-registratie; de bestaande afspraak verandert pas na expliciete acceptatie door de andere partner.
- Alleen de andere gekoppelde partner kan accepteren of afwijzen. Bij afwijzing blijft de bestaande afspraak ongewijzigd.
- Revisies, idempotentie en statusbewaking worden server-side gecontroleerd. Een dubbele klik of oude client kan geen dubbel of stilzwijgend resultaat afdwingen.
- Extra RLS-tabel `us_date_changes` en RPC's `us_suggest_date_change` en `us_respond_date_change`. Replaybare SQL-patch staat in private repository `US-TWO.`, `supabase/patches/2026-11-10_date_change_requests.sql`.
- `us_dashboard` blijft compatibel met oudere Android-clients: de nieuwe property `pending_change` is aanvullend, bestaande velden zijn behouden.
- Getest: backend transactietests met twee partnerrollen en een onbevoegde derde in een teruggedraaide testtransactie; tien front-end controles op renderlogica, beveiligd tekstgebruik en synchronisatie.
- Nog niet bevestigd: echte handmatige kliktest van de wijzigingsflow op Kims iPhone én een native Android-client die zelf voorstellen doet. Oudere Android-clients zien geaccepteerde wijzigingen gewoon na synchronisatie.
