# US TWO – visuele posebronnen en lokale 2D-import

Status: 16 november 2026. Dit document verwijst naar **door de gebruiker in deze chat aangeleverde beelden**; de pixels zelf zijn bewust niet in de publieke GitHub-repository geplaatst.

## Visuele canon

- `124360.png`: 5 × 4 = 20 geïllustreerde dates en activiteiten
- `124359.png`: 6 × 4 = 24 geïllustreerde dates en activiteiten, waaronder Pepsi
- `124357.png`: 5 × 3 = 15 intieme en romantische poses
- `123618.jpg`, `123617.png`, `123538.png`: aanvullende duo-poses en stijlreferenties
- `123539.png`: referentie van de US TWO-opdrachtkaart en het spelbord met mahonie-, goud-, amber- en hart-accenten

De gebruiker wil **dezelfde personages en herkenbare vormgeving** houden. Geen nieuwe generieke avatar, geen rode pionnen of afgekeurde 3D-modellen. De oorspronkelijke gezamenlijke pion, het speelbord en de door de server gecontroleerde voortgang blijven ongewijzigd.

## Gemaakt uit de zichtbare bronnen

- 59 afzonderlijke WebP-uitsneden, zonder de personages opnieuw te tekenen.
- Negen benoemde scènes voor de huidige `USTwoCinematics`-interface: `pepsi`, `kiss`, `hug`, `dance`, `walk`, `stars`, `five`, `play`, `calm`.
- Twaalf WebP-frames per scène, in totaal 108 frames. De beweging betreft **alleen kleine verschuivingen en zoom van het hele oorspronkelijke beeld**; dit zijn nog geen onafhankelijk geanimeerde arm-, gezicht-, been- of mondbewegingen.
- Een gebruiker kan de negen scènes in één keer **lokaal** importeren via `quest-pose-archive.js` en de uploadknop in het scherm `Goedgekeurde 2D-bewegingen beheren`.
- Archief: `US_TWO_POSEPACK_9_SCENES.zip`, een ongecomprimeerde ZIP met bestandsstructuur `pepsi/pepsi_01.webp` enzovoort, plus `README.txt`. De ZIP wordt vanuit de chat beschikbaar gesteld, niet automatisch door het spel gedownload.
- Pion: `US_TWO_GOEDGEKEURDE_PION_PEPSI.webp` uit de ingediende referenties. Upload deze afzonderlijk bij `Oorspronkelijke pion privé op dit toestel instellen`.
- Volledige bron- en previewbundel: `US_TWO_VISUELE_REFERENTIES_2D.zip`, inclusief 7 intacte ingediende bronnen, 59 uitsneden, 108 frames en een offline HTML-poseweergave.

## Veiligheid en test

`quest-pose-archive.js` is een kleine dependencyvrije browserparser voor **ZIP STORED**. De code controleert vertrouwde scenenamen, volledige genummerde reeksen, bestandsformaten, limieten, CRC en consistentie tussen lokale ZIP-headers en de centrale bestandslijst. `quest-poses.js` schrijft alle scènes binnen **één IndexedDB-transactie** onder het gekoppelde account: één fout voorkomt dat een gedeeltelijk pakket wordt opgeslagen. Geen upload naar Supabase of GitHub.

Testen:
- `tests/quest-pose-archive.test.cjs`: geldige ZIP, dubbele frames, onvolledige frames, padinjectie, compressie en corrupte bytebestanden.
- `tests/quest-browser-pose-zip.cjs`: echte Chromium-import, afspelen, corruptiefout zonder dataverlies, herladen, accountwissel, uitloggen.
- `tests/quest-browser-pose-frames.cjs`: bestaande individuele-frame-import en animatieveiligheid.

**Niet als voltooid tellen:** volledige 2D-figuuranimaties, 60 originele clips, vanzelf passende poses bij alle 240 opdrachten, privacy-acceptatie op de echte Android/iPhone-toestellen en complete visuele masterplanacceptatie. Dit is een expliciete tussenstap.

## Handmatige invoer op beide telefoons

1. Log met twee verschillende gekoppelde accounts in op `/US-TWO/test-2-telefoons/`.
2. Ga naar Spel en upload `US_TWO_GOEDGEKEURDE_PION_PEPSI.webp` als originele pion.
3. Open de uitklapper `Goedgekeurde 2D-bewegingen beheren`.
4. Kies lokaal het ZIP-pakket via `Goedgekeurd US TWO-posepakket in één keer importeren`.
5. Bevestig de import. Herhaal op het andere toestel. Iedere browser bewaart zijn eigen privébeelden; er worden geen beelden naar de server gestuurd.
6. Selecteer een opdracht en gebruik de knop voor de bijpassende animatie. De serverstand en puntentelling veranderen hierdoor niet.
