# US TWO webapp 0.4.0

Gratis PWA voor iPhone, naast de bestaande native Android-app. Beide gebruiken Supabase project `vuigivzwkxelsisbjjlk`.

## Publiceren

Upload de bestanden van deze map naar de root van de **openbare** GitHub-repository `youri078nl/US-TWO` (niet de private native-bronrepository `US-TWO.`). Open dan Settings → Pages → Deploy from a branch → main → /(root) → Save. Het adres wordt `https://youri078nl.github.io/US-TWO/` als Pages wordt ingeschakeld en de publicatie slaagt.

## Installeren bij Kim

Open de site in Safari, tik Deel → Zet op beginscherm → Open als webapp. Maak een eigen account aan, bevestig eventueel de e-mail, log in, vul een schermnaam in en gebruik een nieuwe koppelcode van Youri. De code verloopt na 24 uur.

## Aanpassingen & updates

Bij elke wijziging verhoog je de versie in `app.js` en de CACHE-string in `service-worker.js`, daarna commit naar main. De site wordt door Pages automatisch opnieuw gepubliceerd. De webapp meldt dat een update klaarstaat wanneer de nieuwe service worker is geïnstalleerd.

## Beveiliging en beperkingen

De Supabase publishable key is publiek en geschikt voor browsers. Deel **nooit** een Supabase secret of service_role key via GitHub. Alle RPC's gebruiken het accounttoken en server-side gebruikerschecks. Dit is een online MVP: aanmelden, koppelen, agenda, geheim opdrachtbord en updates. Zonder internet werkt de shell eventueel wel, maar geen synchronisatie. Geen pushmeldingen of AI-dateplanner in deze versie. Handmatige synchronisatie elke 20 seconden tijdens gebruik en bij terugkeren in de app.
