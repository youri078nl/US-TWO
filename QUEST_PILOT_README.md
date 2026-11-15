# US TWO – nieuwe spelreis en offline synchronisatie (proef)

**Status: ontwikkelproef, niet vrijgegeven als eindversie.** Gebaseerd op openbare webapp 0.8.0; de door de gebruiker goedgekeurde 0.9.11 HTML-basis blijft afzonderlijk beschikbaar. Deze proef verandert die basis niet.

## Nieuwe onderdelen
- `us-two-offline.js`: browserbundel van de vijf modules uit de private branch `feature/masterplan-release-hardening-20261115`. Bevat geen geheimen.
- `quest-pilot.js`: opt-in paneel in Spel voor het nieuwe canonieke `us_quest_state`-serverprotocol.
- Bestaande login/RPC-functies bieden een beperkte brug voor de nieuwe serverprotocol-test. Er worden geen sessietokens in de offline-wachtrij gezet.
- Testknop `Nieuwe spelreis starten` verschijnt alleen voor gekoppelde accounts wanneer de nieuwe serverreis nog niet bestaat. Vraagt extra bevestiging.
- Schrijven gaat via IndexedDB-wachtrij, Web Locks en bestaande idempotente RPC; herstart-/netwerkherstel vereist nog echte apparaten.
- `tests/quest-pilot.test.cjs`: 6 gerichte checks, inclusief offline-herzending met dezelfde UUID, lokaal wachtrijbewijs en niet-gekoppelde accountblokkade.
- GitHub Actions `quest-pilot.yml` voert syntax- en scenario-tests uit.

## Belangrijke grenzen
1. **Niet naar `main` samenvoegen zonder review en apparaatacceptatie.** De proef staat in een afzonderlijke featurebranch.
2. De nieuwe serverreis is niet hetzelfde als het oudere bord: er vindt **geen stilzwijgende migratie** van spelposities plaats.
3. De knop `Nieuwe spelreis starten` heeft, na expliciete bevestiging, invloed op de gedeelde **nieuwe** serverreis. Hij verandert het bestaande bord niet.
4. In de proef worden nog geen cataloguskeuze, superdate-afronding, privévoorbereidingen of complete dateflow via het nieuwe protocol aangeboden.
5. Offline gegevens in IndexedDB zijn niet versleuteld. Bewaar geen wachtwoorden, tokens of geheime voorbereidingen.
6. Browserregressies zijn gesimuleerd met fake-indexeddb en RPC-stubs. **Geen echte browser-, Supabase-authenticatie- of tweetelefoon-E2E-test** uitgevoerd.
7. Bij revisieconflict blokkeert de wachtrij. De gebruiker mag niet blind lokaal wissen: eerst canonieke serverstatus ophalen en herstelplan toetsen.
8. Het uiteindelijke native Android-/iPhone-integratiewerk en volledige UI-herontwerp ontbreken nog.

## Testinstructies na review
- Open de testbranch in een geïsoleerde previewomgeving, met uitsluitend openbare/publishable Supabase-clientgegevens.
- Log in als gekoppelde speler; ga naar Spel en tik `Serverstatus ophalen`.
- Controleer de serverpositie en revisie zonder wijzigingen.
- Test met een gescheiden testkoppel de startknop, daarna met offline/online en twee vensters.
- Controleer dat de bestaande dates/agenda/2D-animaties onaangetast blijven.
- Pas na onafhankelijke testresultaten beslissen of nieuwe protocolacties in het hoofdspel mogen worden geïntegreerd.

## Verificatie
`node tests/quest-pilot.test.cjs` met `fake-indexeddb@6.2.5` en de GitHub Actions-workflow.

Voortgangspercentage in het private acceptatieregister blijft **14,54%**. De proef telt niet als voltooide cross-platform integratie.
