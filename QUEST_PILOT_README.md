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

## Nieuwe opdracht- en superdatebediening (15 november 2026)

- Het proefpaneel biedt afzonderlijke, vanuit de **actuele** serverstatus gevalideerde knoppen: voorstel accepteren, afwijzen, eigen voorstel intrekken, persoonlijke voltooiing bevestigen en samen overslaan.
- Een gebruikersactie wordt in IndexedDB bewaard met een unieke verzoek-ID en de revision van de daadwerkelijke serverstatus. De server blijft beslissen of een actie toegestaan is.
- Een openstaande/belaste wachtrij blokkeert nieuwe spelmutaties. De interface vervangt de verouderde spelstand nooit automatisch.
- Het paneel vraagt `us_quest_super_state` op. Het toont uitsluitend `my_prep` en nooit `prep_a` of `prep_b`; de finale wordt alleen getoond bij serverstatus `revealed` of `completed`.
- Ready, reveal, done en skip worden met de eigen **superdate-revisie** via `us_quest_super_action` verzonden. Eén onthullingsakkoord opent de finale niet.
- Bij het wisselen van account of bij een fout met serverstatus worden eerder getoonde geheime details uit de proefweergave gewist.
- Er is geen nieuwe datecatalogus-selector of nieuw voorstel via de nieuwe serverreis geïmplementeerd: daarvoor is nog een veilig cataloguscontract nodig.
- De mock-integratietests dekken nu 14 scenario's. De tests bewijzen geen echte HTTP/JWT-authenticatie, niet dat een Android/iPhone tegelijk gekoppeld zijn en geen live servermutaties.

**Vrijgavebeleid:** concept-PR blijft open. Geen wijziging aan `main` en geen nieuwe claim van mobiele eindacceptatie. De bewezen projectscore blijft 14,54%.

## Geverifieerde catalogus- en browseruitbreiding

- Live Supabase-catalogusstructuur gecontroleerd: 67 bestaande opdrachten in werelden 0 t/m 5. De huidige catalogus is dus **nog geen** vereiste bibliotheek van 240 unieke activiteiten.
- Catalogus wordt voor een aangemeld, gekoppeld account via de bestaande authenticatielaag en de RLS-beveiligde catalogustabel opgehaald. Filters: huidige wereld, afstand/samen, uitgesloten `Flirt`-categorie (de server weigert die categorie bij `propose`).
- De spelende partner ziet maximaal drie unieke voorstellen. `quest-catalog.js` sorteert en roteert deterministisch op de serverpositie en geeft voorrang aan nog niet recent gebruikte opdrachten; deze selectie is **advies**, de server blijft de beslissende autoriteit.
- Voorstel verzenden is alleen toegestaan bij fase `choose`, juiste `turn_user`, passende wereld en een lege, niet-geblokkeerde wachtrij. De API krijgt de serverrevisie, bestaande opdracht-ID en expliciete speelvorm.
- Uitloggen maakt getoonde persoonlijke voorbereidingen en finales direct onzichtbaar. De accountgebonden wachtrij blijft duurzaam bewaard om acties niet kwijt te raken.
- GitHub CI voert nu twintig gerichte script-/domeinchecks en een **echte headless Chromium-bedieningstest** uit. Die browserproef gebruikt gesimuleerde Supabase-antwoorden, niet de persoonlijke accounts of echte servermutaties.
- Het proefproject blijft een draft-PR, niet de standaard GitHub Pages-versie en niet de native Android/iOS-app.

### Releaseblokkades
- Geen tweetelefoon-acceptatie of daadwerkelijke iOS/Android-synchronisatie met elk een eigen account.
- Geen volledige catalogus van 240 oorspronkelijke, voldoende onderscheiden activiteiten of 60 gecontroleerde animatieclips.
- Geen bewezen offline herstel in echte Safari/Chrome na langdurige offline periode.
- Geen productieacceptatie, beveiligingsaudit, herstelproef of volledige native release.

**De officiële gewogen voortgang blijft 14,54%.** Technische testuitbreidingen worden niet automatisch als voltooide masterplaneisen meegeteld.
