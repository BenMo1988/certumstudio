# CA-008 · Run 2026-10-03 · training-analysis/v2 · claude-opus-5-5 · medium

Baseline-run van training-analysis/v2 (Analysis Contract V2), uitgevoerd via de normale flow op `/trainings/new`,
met precies één poging. Configuratie bevroren tijdens de baseline.

## Configuratie en metadata

Overgenomen uit de metadata-logregels `certum.analysis` en `certum.analysis_result` van deze run.

| Veld | Waarde |
| --- | --- |
| rundatum | 2026-10-03 |
| provider | claude |
| model | claude-opus-5-5 |
| effort | medium |
| promptVersion | training-analysis/v2 |
| contractVersion | analysis-contract/v2 |
| preflightVersion | privacy-preflight/v1 |
| preflightStatus | safe |
| preflightMiss | false |
| inputKind | casus |
| inputLength | 602 |
| segmentCount | 5 |
| durationMs | 20451 |
| outcome | success |
| analysisOutcome | ready |
| epistemicFlags | 0 |

Tokengebruik en kosten werden voor deze run niet geregistreerd.

## Bronsegmenten

Zoals server-side gesegmenteerd (`source-segments/v1`) en aan de provider aangeleverd.

- `S1` Een jeugdprofessional ontvangt van een school en van een ouder verschillende beschrijvingen van het gedrag van dezelfde jongere.
- `S2` De school zegt dat de jongere regelmatig teruggetrokken en gespannen overkomt.
- `S3` De ouder herkent dit thuis niet en vindt dat school het probleem groter maakt dan het is.
- `S4` Er zijn geen acute veiligheidszorgen.
- `S5` De professional heeft de volgende dag een gesprek met het gezin en twijfelt of hij vóór dat gesprek eerst opnieuw contact opneemt met school om de verschillen verder te verhelderen, of dat hij de verschillende perspectieven eerst open met ouder en jongere bespreekt.

## Output

Gebruikerszichtbare analyse (`ready`).

**Samenvatting**
Een jeugdprofessional krijgt van school en van een ouder verschillende beschrijvingen van het gedrag van dezelfde jongere. Volgens school komt de jongere regelmatig teruggetrokken en gespannen over. De ouder herkent dit thuis niet en vindt dat school het probleem groter maakt dan het is. Er zijn geen acute veiligheidszorgen. De professional heeft de volgende dag een gesprek met het gezin en twijfelt of hij eerst opnieuw contact opneemt met school of de verschillende perspectieven eerst open met ouder en jongere bespreekt.

**Professioneel dilemma**
De professional moet kiezen tussen vóór het gezinsgesprek eerst bij school verdere verheldering zoeken over de verschillen, of de uiteenlopende perspectieven zonder die extra stap direct en open met ouder en jongere bespreken.

**Voorgesteld leerdoel**
De deelnemer kan bij uiteenlopende beschrijvingen van school en ouder over dezelfde jongere een onderbouwde keuze maken over de volgorde van vervolgcontacten en deze keuze toelichten.

**Doelgroep**
Jeugdprofessionals die met gezinnen en scholen samenwerken.

**Beslisrelevante ontbrekende informatie (decisionRelevantGaps)**
- Is ouder en jongere bekend dat de professional contact heeft met school, en hebben zij daarmee ingestemd?
  *Richtingkeuze:* Als die instemming ontbreekt of onduidelijk is, verschuift het zwaartepunt naar de afweging rond eerst het gezin spreken en wordt de richting over verheldering bij school minder vanzelfsprekend.
- Wat is de leeftijd van de jongere en is de jongere aanwezig bij het gesprek van de volgende dag?
  *Leerdoel:* Bij een oudere of aanwezige jongere ligt meer nadruk op het betrekken van het eigen perspectief van de jongere in het leerdoel; bij afwezigheid richt het leerdoel zich vooral op het gesprek met de ouder.

**Abstraction notes**
Geen.

**Rationale**
De casus bevat een concreet keuzemoment: de professional twijfelt over de volgorde van contact met school en gezin vóór een gepland gesprek. Beide opties zijn verdedigbaar en er zijn geen acute veiligheidszorgen, waardoor de afweging zelf leerwaardig is. Daarom is de input geschikt als basis voor een praktijksimulatie.

**Trainingsrichtingen**

1. **Afwegen van de volgorde van contacten** (`volgorde-vervolgcontact`)
   *Focus:* De twijfel van de professional of hij vóór het gezinsgesprek eerst opnieuw contact opneemt met school of eerst met ouder en jongere spreekt, gegeven dat er geen acute veiligheidszorgen zijn.
   *Leerdoel:* De deelnemer kan de voor- en nadelen van eerst school benaderen versus eerst het gezin spreken tegen elkaar afwegen en een gemotiveerde keuze maken.
   *sourceRefs:* `S4`, `S5`
2. **Verschillende perspectieven open bespreken** (`perspectieven-open-bespreken`)
   *Focus:* De optie om de verschillende beschrijvingen van school en ouder open met ouder en jongere te bespreken, waarbij de uitspraak van school en de opvatting van de ouder elk aan de betrokkene toegeschreven blijven.
   *Leerdoel:* De deelnemer kan uiteenlopende beschrijvingen van school en ouder neutraal en toegeschreven aan de betrokkenen inbrengen in een gesprek met ouder en jongere.
   *sourceRefs:* `S1`, `S2`, `S3`, `S5`
3. **Doelgericht verhelderen bij school** (`verheldering-bij-school`)
   *Focus:* De optie om vóór het gezinsgesprek opnieuw contact op te nemen met school om de verschillen in beschrijving van het gedrag verder te verhelderen.
   *Leerdoel:* De deelnemer kan bepalen of en welke aanvullende verheldering bij school nodig is voordat hij het gesprek met het gezin voert.
   *sourceRefs:* `S1`, `S2`, `S5`

## Interne evaluatie-output: sourceCandidates

Niet zichtbaar in de UI. Kandidaten voor de latere Bron-fase; **geen gevalideerde bronnen en geen vaststelling** dat een kader van toepassing is.

- **Regels rond toestemming en gegevensuitwisseling tussen hulpverlening en school**: De keuze om opnieuw contact op te nemen met school raakt mogelijk aan de vraag welke informatie de professional met school mag delen of opvragen.
- **Gespreksmethodieken voor het bespreken van uiteenlopende perspectieven met gezinnen**: Een van de opties is de verschillende beschrijvingen open met ouder en jongere bespreken, waarvoor mogelijk gespreksbenaderingen bestaan.
- **Werkwijzen voor samenwerking tussen jeugdhulp, school en ouders**: De casus draait om afstemming tussen professional, school en gezin bij verschillende beelden van dezelfde jongere.

## Feitelijke metingen

| Meting | Waarde |
| --- | --- |
| verwachte outcome (vooraf vastgelegd) | `ready` |
| werkelijke outcome | `ready` |
| komt overeen | ja |
| trainingsrichtingen | 3 |
| decisionRelevantGaps | 2 |
| possibleScopings | n.v.t. |
| sourceCandidates | 3 |
| epistemicFlags | 0 |
| alle sourceRefs geldig | ja |
| invalid-output | nee |
| gecontroleerde begrippen in gebruikersgerichte velden | geen |

**Signaleringen (geen oordeel):**

- *Mogelijke nieuwe scenariofeiten:* Geen nieuw gedrag van ouder of jongere toegevoegd (een V1-aandachtspunt). Gap 1 vraagt naar instemming met het contact met school.
- *Perspectieven sterker dan in de input:* De formulering "groter maakt dan het is" uit de input is behouden; uitspraken zijn toegeschreven ("Volgens school …", "De ouder herkent …"). Richting 2 benoemt expliciet dat uitspraken toegeschreven blijven.
- *Overig:* Richting 2 verwijst naar vier bronsegmenten.

## Menselijke evaluatie

**Status: `PASS`**

Menselijke review van de baseline training-analysis/v2.

Beide professionele routes blijven verdedigbaar. De uitspraken van school en ouder blijven correct toegeschreven, de oorspronkelijke formulering wordt niet versterkt en er worden geen nieuwe gedragingen of feiten toegevoegd.
