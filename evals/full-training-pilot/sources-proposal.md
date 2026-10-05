# Full Training Pilot 1: bronvoorstel voor SN1 en SN2

## Definitieve bronkeuze (Bureau Certum, 2026-10-05)

| Bron | Kennisbehoefte | Inhoud |
| --- | --- | --- |
| A · BPSW Beroepscode 2021 | SN1 | Volledige voorgestelde passage (art. 10, 11, 13, conflict van plichten). Art. 11 staat op p. 17 van de pdf ("Artikel 11 - Uitwisselen van informatie"); controleer bij het valideren of de passage de bedoelde leeftijds-/toestemmingsregel ondersteunt. |
| B · NJi Met wie mag het wijkteam informatie delen? | SN1 | Volledige voorgestelde passage |
| ~~C · Jeugdwet~~ | – | **Niet gebruikt** in deze pilot (geen schijnzekerheid over toepasselijkheid) |
| D · NJi Online seksueel misbruik | SN2 | **Alleen de signalenpassage** (zie hieronder); zonder groomingdefinitie en zonder de zin over leeftijds-/machtsverschil |
| E · NJi Signalering van seksuele uitbuiting | SN2 | Volledige voorgestelde passage |
| SN3 | – | **Bewust uncovered** (`organisation_specific_source_need`) |

**relevantContent voor D (definitief, alleen signalen):**

```text
Hoe weet je of een kind online seksueel misbruikt wordt?
Het is belangrijk om gevoelig te zijn voor signalen van online seksueel misbruik. Gevoelens van schaamte en angst voor reacties van anderen bij het kind of de jongere zorgen vaak dat het moeilijk is om te signaleren. Maar een kind of jongere kan wel ander gedrag gaan vertonen door de angst, stress of schaamte die gepaard gaan met online seksueel misbruik. De volgende signalen kunnen wijzen op online seksueel misbruik.
- Het belangrijkste signaal is wanneer een kind vertelt wat er is gebeurd. Of in meer voorzichtige woorden aangeeft online contact te hebben met een vreemde.
- Slachtoffers hebben vaak last van angst, stress en schaamte. Vermijdt iemand het afspreken met vrienden bijvoorbeeld? Dan kan dat een signaal zijn.
- Bij slachtoffers is er ook vaak sprake van fysieke of mentale afwezigheid op school.
- Kinderen die offline risico lopen op seksueel misbruik, lopen hier online ook meer kans op.
```

---

**Status van het oorspronkelijke voorstel hieronder: VOORSTEL, NIET GEVALIDEERD.** Opgesteld door Claude Code (webresearch, geraadpleegd 2026-10-05). De
menselijke operator (Mohamed) controleert iedere passage tegen de bron, voert de bron in Certum Studio in en kiest
zelf "Bron gecontroleerd". Claude Code valideert niets.

- Alle passages zijn **letterlijk** overgenomen (alleen regelafbrekingen uit pdf/html samengevoegd). Weglatingen
  binnen een passage zijn gemarkeerd met `[…]`.
- 0 Claude API-calls voor dit onderzoek.
- **SN3 blijft bewust uncovered** (besluit optie B, productbevinding `organisation_specific_source_need`).

> Let op voor de pilot: volgens de huidige regels (Source Workspace V1) wordt het Bron-blok alleen gegenereerd als
> **alle** sourceNeeds van het Bron-blok gedekt zijn (SN1, SN2 én SN3). Met SN3 uncovered blijft Bron na validatie
> van SN1 en SN2 `needs_source`; de Studio biedt dan geen "Bron-blok genereren" aan en er volgt geen call. Dat is
> precies de productbevinding, geen fout.

## Bewaking van de pilotsituatie

De bronnen moeten helpen signalen te wegen en zorgvuldig uit te vragen, niet de situatie te diagnosticeren. Daarom:

- geen passages die "online contact met een oudere = grooming/uitbuiting" suggereren; wel passages die zeggen dat
  signalen ook op andere problematiek kunnen wijzen en dat uitzoeken nodig is;
- de definitie van grooming is opgenomen omdat SN2 er expliciet naar vraagt, maar alleen samen met de hedging uit
  dezelfde bron. Twijfel je daarover: laat bron D-2 (definitie) weg; zie de varianten onderaan.

---

## SN1: kaders voor vertrouwelijkheid en informatie delen (ook richting ouders)

### Bron A: Beroepscode voor professionals in sociaal werk (BPSW, 2021)

| Veld in Studio | Waarde |
| --- | --- |
| Titel | Beroepscode voor professionals in sociaal werk |
| Soort bron | Richtlijn (`guideline`); alternatief "Document" |
| Auteur | (leeg) |
| Organisatie / uitgever | Beroepsvereniging van Professionals in Sociaal Werk (BPSW) |
| Datum | 2021-10 |
| URL | https://www.bpsw.nl/app/data/uploads/2021/10/BPSW-Beroepscode-2021.pdf |
| Kennisbehoefte | SN1 |

**Actualiteit:** SKJ meldt dat vanaf 1 januari 2022 voor alle SKJ-geregistreerde jeugd- en gezinsprofessionals en
jeugdzorgwerkers deze beroepscode geldt; zij volgt de Beroepscode voor de Jeugd- en gezinsprofessional (2017) en de
Beroepscode voor de Jeugdzorgwerker op ([SKJ, 19-11-2021](https://skjeugd.nl/belangrijk-nieuws-voor-alle-jeugd-en-gezinsprofessionals-en-jeugdzorgwerkers/)).
Uitgave: oktober 2021 (colofon). De oudere jeugdcode (ook als 2025-upload op bpsw.nl) is daarom **niet** voorgesteld.

**Voorgestelde relevantContent:**

```text
Artikel 10 - Vertrouwelijkheid
De professional behandelt informatie over mensen en hun omstandigheden vertrouwelijk.
Toelichting: De professional dient een betrouwbare partner te zijn. Mensen moeten erop kunnen rekenen dat alle vertrouwelijke informatie geheim blijft. De plicht tot geheimhouding dient niet alleen het belang van de mensen op wie het handelen gericht is, maar ook het algemeen belang en dat van het beroep. Iedere persoon moet zich zonder angst voor schending van diens privacy tot een professional kunnen wenden.

Artikel 11 - Uitwisselen van informatie
De professional vraagt toestemming voordat hij aan derden informatie over cliënten vraagt of verschaft, of met hen overlegt om op te treden voor of namens de cliënt.
Toelichting […]: Geen toestemming is vereist wanneer gevaar dreigt of wettelijke verplichtingen gelden die hiervan afwijken. Zie hiervoor artikel 13. Maar ook bij deze uitzondering geldt dat de professional streeft naar toestemming, tenzij met het vragen van toestemming ernstig nadeel voor cliënten of derden ontstaat. […] Wettelijk vastgelegde leeftijdsgrenzen bepalen of de professional aan de jeugdige zelf, en/of aan diens wettelijke vertegenwoordiger(s), of aan jeugdige én wettelijke vertegenwoordigers toestemming vraagt voor het uitwisselen van informatie. Als de jeugdige ook toestemming moet geven, dan is het van belang om de wilsbekwaamheid vast te stellen. Het niet verkrijgen van toestemming om informatie uit te wisselen, betekent overigens niet automatisch dat de professionele relatie moet worden beëindigd. Het is wel aanleiding om met de betrokkene te bespreken op welke manier dat de hulpverlening of ondersteuning kan belemmeren.

Artikel 13 - Het verstrekken van informatie buiten toestemming
Het is de professional toegestaan om onder bepaalde omstandigheden zijn plicht tot geheimhouding te doorbreken, dit mag:
- als het delen van informatie het laatste redmiddel is om gevaar voor personen te voorkomen en toestemming vragen niet mogelijk of wenselijk is;
- als toestemming vanwege wettelijke bepalingen niet nodig is;
- als de cliënt (gedeeltelijk) wilsonbekwaam is en er in een noodsituatie geen wettelijke vertegenwoordiger geraadpleegd kan worden.
Toelichting […]: In geval van handelen bij (een vermoeden van) ernstig nadeel voor personen (conflict van plichten) overlegt de professional met beroepsgenoten en/of andere deskundigen. Om te bepalen op welke wijze, naar wie en hoe verstrekkend informatie gedeeld mag worden, worden criteria van schade, doeltreffendheid, subsidiariteit en proportionaliteit gehanteerd. Met (een vermoeden van) ernstig nadeel voor personen wordt niet alleen fysiek gevaar bedoeld, maar ook andere bedreigingen, zoals bedreiging van psychisch of seksueel geweld. […] Handelen buiten toestemming betekent niet automatisch dat het uitwisselen van informatie tevens buiten medeweten geschiedt. Alleen wanneer het op de hoogte brengen van het voornemen om buiten toestemming te handelen een ernstig nadeel oplevert voor betrokkenen, kan de professional na zorgvuldige afweging besluiten om ook buiten medeweten te handelen.

Begrippenlijst - Conflict van plichten
Bij een conflict van plichten staan de plicht tot geheimhouding en de plicht om te spreken om gevaar of ernstig nadeel af te wenden tegenover elkaar. Bij een conflict van plichten is het van belang om een aantal vragen te beantwoorden.
- Toestemmingsvereiste: Is alles in het werk gesteld om toestemming van de persoon tot doorbreking van het geheim te verkrijgen?
- Schadevereiste: Levert het niet doorbreken van je geheimhoudingsplicht naar alle waarschijnlijkheid ernstige schade op?
- Gewetensnood: Leidt het handhaven van de geheimhouding tot een ernstig conflict met het eigen geweten?
- Subsidiariteit: Is er geen andere weg dan het doorbreken van het beroepsgeheim om het probleem op te lossen?
- Doelmatigheid: Is het (vrijwel) zeker dat door de geheimdoorbreking de schade aan de ander (of de cliënt zelf) kan worden voorkomen?
- Proportionaliteit: Hoeveel informatie moet je delen (mate van schending) om de schade af te wenden?
```

**Waarom deze passages:** de professionele norm (vertrouwelijkheid als uitgangspunt), dat leeftijdsgrenzen bepalen
wiens toestemming nodig is, dat geen toestemming niet automatisch einde van de relatie betekent (raakt direct aan
"anders vertel ik je niks meer"), en het afwegingskader voor als de professional overweegt zonder toestemming te
delen (conflict van plichten, ook "niet buiten medeweten"). Dat sluit aan op de afweging in Actie, Reflectie en
Toets zonder één route voor te schrijven.

**Bewust weggelaten:** de verwijzing naar meldrecht/meldcode in de toelichting bij artikel 13 (wordt anders
gelezen als "dit is een meldcodesituatie" en zou SN3 via een achterdeur invullen), en de voetnootverwijzing.

### Bron B: Met wie mag het wijkteam informatie delen? (Nederlands Jeugdinstituut)

| Veld in Studio | Waarde |
| --- | --- |
| Titel | Met wie mag het wijkteam informatie delen? |
| Soort bron | Webpagina (`webpage`) |
| Auteur | (leeg) |
| Organisatie / uitgever | Nederlands Jeugdinstituut (NJi) |
| Datum | (leeg; geen publicatiedatum op de pagina; geraadpleegd 2026-10-05) |
| URL | https://www.nji.nl/wijkteams/met-wie-mag-het-wijkteam-informatie-delen |
| Kennisbehoefte | SN1 |

**Voorgestelde relevantContent:**

```text
Wanneer mag het wijkteam informatie delen?
De wijkteamprofessional moet bijna altijd toestemming vragen om jouw informatie met anderen te delen. Alleen als de wijkteamprofessional zich veel zorgen maakt, mag die dat zonder jouw toestemming doen. Bijvoorbeeld als je kinderen thuis niet meer veilig zijn en het delen van informatie vervelende gevolgen voorkomt. Dat heet conflict van plichten.

Afspreken wie informatie krijgt
In het beste geval praat het wijkteam niet óver jou of het gezin met anderen, maar samen mét jou. Jullie spreken dan samen af aan wie jullie informatie geven en hoe. Daarna is het goed als jullie allebei bij het gesprek zijn. Zo weet je altijd wat er besproken is.

Informatie over de hulp aan je kind
Krijgt je kind hulp van het wijkteam? De hulpverlener mag niet altijd informatie over je kind delen met jou. Dat hangt af van hoe oud je kind is en of je het gezag hebt.
- Is je kind 12, 13, 14 of 15 jaar en heb je gezag? De hulpverlener mag je op de hoogte houden. Het wijkteam moet wel eerst met je kind praten over wat het gaat vertellen en hoe.
- Is je kind 16 of 17 jaar en heb je gezag? Je kind beslist zelf of de hulpverlener informatie met jou mag delen. Maakt het wijkteam zich grote zorgen om de veiligheid van je kind? De hulpverlener kan dan beslissen je toch informatie te geven, ook als je kind dat niet wil.
```

**Waarom deze passages:** een gezaghebbende, actuele uitleg specifiek voor wijkteams over de positie van een
15-jarige en haar ouder: ouders mógen geïnformeerd worden, maar de professional moet eerst met de jongere bespreken
wat en hoe. Juist dat maakt "houd het geheim" geen eenvoudig ja/nee. De 16/17-regel staat erbij als contrast
(laat zien dat de leeftijd ertoe doet). De pagina is gericht aan ouders; dat is zichtbaar in de je-vorm.

### Bron C (optioneel): Jeugdwet, artikelen 7.3.4 en 7.3.11 (officiële wettekst)

| Veld in Studio | Waarde |
| --- | --- |
| Titel | Jeugdwet, artikelen 7.3.4 en 7.3.11 |
| Soort bron | Document (`document`); er is geen bronsoort "wet" |
| Auteur | (leeg) |
| Organisatie / uitgever | Overheid.nl (wetten.overheid.nl) |
| Datum | 2026-01-01 (versie "Geldend van 01-01-2026 t/m heden") |
| URL | https://wetten.overheid.nl/BWBR0034925/ |
| Kennisbehoefte | SN1 |

**Voorgestelde relevantContent:**

```text
Artikel 7.3.4, tweede lid
Indien de betrokkene minderjarig is en de leeftijd van twaalf maar nog niet die van zestien jaar heeft bereikt, is tevens de toestemming van de ouders die het gezag over hem uitoefenen of van zijn voogd vereist. De jeugdhulp kan evenwel zonder de toestemming van die ouders of de voogd worden verleend, indien zij kennelijk nodig is teneinde ernstig nadeel voor de betrokkene te voorkomen, alsmede indien de betrokkene ook na de weigering van de toestemming, de verrichting weloverwogen blijft wensen.

Artikel 7.3.11
1 Onverminderd artikel 7.3.2, vierde lid, tweede volzin, draagt de jeugdhulpverlener zorg, dat aan anderen dan de betrokkene geen inlichtingen over de betrokkene dan wel inzage in of afschrift van de gegevens uit het dossier worden verstrekt dan met toestemming van de betrokkene. […]
2 Onder anderen dan de betrokkene is niet begrepen: […] b. degene wiens toestemming ter zake van de verlening van jeugdhulp op grond van de artikelen 7.3.4 en 7.3.15 is vereist […].
3 Indien de jeugdhulpverlener door inlichtingen over de betrokkene dan wel inzage in of afschrift van de gegevens uit het dossier te verstrekken niet geacht kan worden de zorg van een goed jeugdhulpverlener in acht te nemen, laat hij zulks achterwege.
```

**Waarom:** de wettelijke basis onder bron B (ouders van een 12–15-jarige geven mee toestemming en vallen daardoor
niet onder "anderen"; tegelijk de grens van "de zorg van een goed jeugdhulpverlener").

**Waarschuwingen (daarom optioneel):**

- Ik trek hier **geen juridische conclusie** uit. Of deze artikelen op de wijkteamprofessional van toepassing zijn,
  hangt af van of die jeugdhulp verleent in de zin van de Jeugdwet; dat verschilt per gemeente en organisatie (NJi,
  bron B: "wijkteams [zijn] in elke gemeente anders georganiseerd").
- Bij artikel 7.3.11 meldt wetten.overheid.nl een **toekomstige wijziging per 01-01-2027**.
- Wettekst zonder uitleg kan Claude verleiden tot juridische stelligheid. Bron B dekt dezelfde kern in begrijpelijke
  taal. Mijn advies: **weglaten**, tenzij je de wettelijke basis expliciet in de training wilt.

---

## SN2: zorgen inschatten en meer te weten komen zonder het contact te schaden

### Bron D: Online seksueel misbruik (Nederlands Jeugdinstituut)

| Veld in Studio | Waarde |
| --- | --- |
| Titel | Online seksueel misbruik |
| Soort bron | Webpagina (`webpage`) |
| Auteur | (leeg) |
| Organisatie / uitgever | Nederlands Jeugdinstituut (NJi) |
| Datum | (leeg; geen publicatiedatum op de pagina; geraadpleegd 2026-10-05) |
| URL | https://www.nji.nl/kindermishandeling/online-seksueel-misbruik |
| Kennisbehoefte | SN2 |

**Voorgestelde relevantContent:**

```text
Wat is online seksueel misbruik?
Online seksueel misbruik is seksueel misbruik via het internet. Kenmerkend voor seksueel misbruik is dat er een leeftijds- of machtsverschil bestaat tussen de pleger en het slachtoffer.

Grooming of online kinderlokken
Grooming betekent dat iemand in het echte leven of online een slachtoffer benadert met seksueel misbruik als doel. De pleger doet zich online bijvoorbeeld voor als een kind of jongere en wint het vertrouwen van een slachtoffer. Vervolgens kan zowel on- als offline seksueel misbruik plaatsvinden.

Hoe weet je of een kind online seksueel misbruikt wordt?
Het is belangrijk om gevoelig te zijn voor signalen van online seksueel misbruik. Gevoelens van schaamte en angst voor reacties van anderen bij het kind of de jongere zorgen vaak dat het moeilijk is om te signaleren. Maar een kind of jongere kan wel ander gedrag gaan vertonen door de angst, stress of schaamte die gepaard gaan met online seksueel misbruik. De volgende signalen kunnen wijzen op online seksueel misbruik.
- Het belangrijkste signaal is wanneer een kind vertelt wat er is gebeurd. Of in meer voorzichtige woorden aangeeft online contact te hebben met een vreemde.
- Slachtoffers hebben vaak last van angst, stress en schaamte. Vermijdt iemand het afspreken met vrienden bijvoorbeeld? Dan kan dat een signaal zijn.
- Bij slachtoffers is er ook vaak sprake van fysieke of mentale afwezigheid op school.
- Kinderen die offline risico lopen op seksueel misbruik, lopen hier online ook meer kans op.
```

**Waarom:** SN2 vraagt naar het inschatten van zorgen bij een minderjarige die afspreekt met een aanzienlijk oudere
online kennis. Deze passage benoemt wat online misbruik en grooming zijn en welke signalen "kunnen wijzen op"
misbruik, inclusief dat het moeilijk te signaleren is.

**Risico (lees dit):** de zin over het leeftijds- of machtsverschil en de groomingdefinitie kunnen, los gelezen, de
situatie richting "dit is grooming" duwen. De bron zelf formuleert voorzichtig ("kunnen wijzen op"). Samen met bron E
(signalen kunnen op andere problematiek wijzen; uitzoeken wat er aan de hand is) blijft het een wegingskader. Wil je
het risico kleiner: neem alleen het derde deel (signalen) op.

### Bron E: Signalering van seksuele uitbuiting (Nederlands Jeugdinstituut)

| Veld in Studio | Waarde |
| --- | --- |
| Titel | Signalering van seksuele uitbuiting |
| Soort bron | Webpagina (`webpage`) |
| Auteur | (leeg) |
| Organisatie / uitgever | Nederlands Jeugdinstituut (NJi) |
| Datum | (leeg; geen publicatiedatum op de pagina; geraadpleegd 2026-10-05) |
| URL | https://www.nji.nl/seksuele-uitbuiting/signalering |
| Kennisbehoefte | SN2 |

**Voorgestelde relevantContent:**

```text
Signaleren van seksuele uitbuiting is lastig
Signaleren of er sprake is van seksuele uitbuiting is niet eenvoudig. Dit heeft een aantal redenen:
- De uitbuiters zijn vaak online actief. Hierdoor is het probleem vaak niet zichtbaar.
- Kinderen die slachtoffer zijn van seksuele uitbuiting ontkennen vaak dat er sprake is van gedwongen seks of uitbuiting. Ook komt het vaak voor dat zij het niet op die manier beleefd hebben.

De volgende punten dragen bij aan een betere signalering:
- Een jongere doet een onthulling over seksuele uitbuiting eerder spontaan dan tijdens een gepland gesprek. Bijvoorbeeld tijdens de afwas. Praat dus met elke jongere over seks en eventuele nare ervaringen op dit gebied. Weet wat je kunt doen waardoor een jongere je in vertrouwen neemt. Wees beschikbaar voor de jongere, oordeel niet en bied waar nodig veiligheid.
- Slachtoffers zien de problematiek vaak anders dan professionals. Zo voelen meisjes zich niet altijd het slachtoffer van seksuele uitbuiting. Ze zien de uitbuiters als hun vriend of ex-vriend, voelen zich sterk loyaal aan hem en ervaren rouw wanneer zij van hem loskomen.

[…] Signalen kunnen ook op andere problematiek wijzen. Wanneer een onderbuikgevoel of signalen aanwezig zijn, is het in ieder geval belangrijk om uit te zoeken wat er aan de hand is.
```

**Waarom:** dit is de passage over gespreksvoering en weging: beschikbaar zijn, niet oordelen, veiligheid bieden;
een jongere kan haar situatie anders beleven dan de professional ("hij is aardig"); en expliciet dat signalen ook op
andere problematiek kunnen wijzen en dat uitzoeken nodig is. Dat ondersteunt "eerst meer weten zonder het contact te
schaden" zonder te diagnosticeren.

**Bewust weggelaten:** de signalenlijst voor jongens, risicotaxatie-instrumenten (RiS, 11VB: organisatie- en
doelgroepspecifiek) en de lijst met meldpunten (zou naar melden sturen en SN3 via een achterdeur invullen).

---

## Overwogen maar niet voorgesteld

| Bron | Waarom niet |
| --- | --- |
| NJi, *Hoe signaleer je slachtoffers? Stappenplan voor professionals* (2021, [pdf](https://www.nji.nl/system/files/2021-05/Hoe-signaleer-je-slachtoffers-Stappenplan-voor-professionals.pdf)) | Bevat sterke gespreksadviezen ("Beloof geen geheimhouding. Leg vooraf goed uit waarom dat niet mogelijk is."), maar is uitdrukkelijk bedoeld voor situaties met een vermoeden van slachtofferschap van mensenhandel/loverboys. Opnemen zou de pilotsituatie als zodanig framen. Bovendien verwijst het naar het basismodel meldcode uit 2013. |
| NJi, *Is het geheim wat ik vertel in een wijkteam?* (jongerenpagina) | Inhoudelijk gelijk aan bron B, maar gericht aan jongeren; B is vollediger (ook conflict van plichten). |
| Rijksoverheid, inzagerecht jeugdhulpdossier | Gaat over inzage in het dossier, niet over wat de professional de ouder vertelt; voegt voor SN1 weinig toe. |
| BPSW, *Beroepscode voor de Jeugd- en Gezinsprofessional* (2017, ook als 2025-upload) | Vervangen per 1 januari 2022 (zie bron A). |

## Varianten

| Variant | Bronnen | Wanneer |
| --- | --- | --- |
| **Aanbevolen** | A, B (SN1) · D, E (SN2) | Normaal |
| Juridisch explicieter | A, B, C · D, E | Als je de wettelijke basis zichtbaar wilt |
| Minder diagnostisch risico | A, B · D (alleen signalen), E | Als je de groomingdefinitie te sturend vindt |

## Voor de operator

1. Controleer per bron de passage tegen de URL.
2. Voer de bron in via **Bronnen beheren → Bron toevoegen** (titel, soort, organisatie, datum, URL, relevante inhoud,
   kennisbehoefte aanvinken).
3. Vink de verklaring aan en klik **Valideren**: "Ik heb deze bron gecontroleerd en wil deze gebruiken voor deze
   training."
4. SN3 blijft open.
