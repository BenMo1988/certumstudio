# CA-002 · Run 2026-10-03 · training-analysis/v2 · claude-opus-5-5 · medium

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
| inputKind | onderwerp |
| inputLength | 20 |
| segmentCount | 1 |
| durationMs | 15766 |
| outcome | success |
| analysisOutcome | needs_adjustment |
| epistemicFlags | 0 |

Tokengebruik en kosten werden voor deze run niet geregistreerd.

## Bronsegmenten

Zoals server-side gesegmenteerd (`source-segments/v1`) en aan de provider aangeleverd.

- `S1` Omgaan met weerstand

## Output

Gebruikerszichtbare analyse (`needs_adjustment`).

**Samenvatting**
De input bestaat uit een los onderwerp over omgaan met weerstand, zonder beschreven situatie, betrokkenen, werkveld of professioneel keuzemoment.

**Voorlopige professionele kern**
Een professional ervaart weerstand bij een ander in het werk en moet bepalen hoe daarop te reageren.

**Beslisrelevante ontbrekende informatie (decisionRelevantGaps)**
- In welk werkveld en welke rol speelt de situatie zich af, bijvoorbeeld een hulpverlener in het sociaal domein, een leerkracht of een leidinggevende?
  *Doelgroep:* Het werkveld en de rol bepalen voor wie de training bedoeld is en welke professionele verantwoordelijkheden en afwegingen in het dilemma meespelen.
- Van wie komt de weerstand en waartegen richt die zich, bijvoorbeeld een cliënt of ouder tegenover een voorgestelde aanpak, of een medewerker tegenover een verandering?
  *Dilemma:* De bron en het onderwerp van de weerstand bepalen welk spanningsveld centraal staat, zoals doorzetten versus meebewegen, of de relatie behouden versus een grens stellen.
- Is er een concreet moment waarop de professional moet kiezen hoe te handelen, en wat staat er op dat moment op het spel?
  *Geschiktheid:* Met een concreet keuzemoment kan de input als gereed worden beoordeeld en kunnen trainingsrichtingen worden opgesteld; zonder dat blijft het een algemeen thema.

**Abstraction notes**
Geen.

**Rationale**
Omgaan met weerstand heeft duidelijke leerpotentie, maar de input is nu een los onderwerp zonder situatie, rol of keuzemoment. Een praktijksimulatie vraagt om een concrete situatie waarin een professional een afweging maakt. Kies een van de voorgestelde afbakeningen of beschrijf een eigen situatie, dan kan de analyse worden afgerond.

**Mogelijke afbakeningen (possibleScopings)**

1. **Weerstand van een ouder tegen hulp** (`weerstand-ouder-hulpverlening`)
   Voorstel: een professional in de jeugdhulp of het sociaal domein bespreekt een vorm van ondersteuning met een ouder die daar afwijzend op reageert, en moet kiezen hoe het gesprek voort te zetten.
   *Voeg toe:* De rol van de professional, wat er wordt voorgesteld, hoe de weerstand zich concreet uit en welke keuze de professional op dat moment moet maken.
2. **Weerstand in een team bij verandering** (`weerstand-team-verandering`)
   Voorstel: een leidinggevende introduceert een wijziging in werkwijze en krijgt te maken met bezwaren van teamleden, waarbij een afweging nodig is tussen doorzetten en ruimte geven.
   *Voeg toe:* Het soort organisatie, de aard van de verandering, welke bezwaren worden geuit en welk besluit de leidinggevende moet nemen.
3. **Weerstand van een leerling in de klas** (`weerstand-leerling-onderwijs`)
   Voorstel: een leerkracht krijgt te maken met een leerling die zich verzet tegen een opdracht of afspraak, en moet kiezen hoe daarop te reageren.
   *Voeg toe:* Het onderwijstype, de context van het moment, het gedrag van de leerling zoals beschreven en de handelingsopties van de leerkracht.

## Feitelijke metingen

| Meting | Waarde |
| --- | --- |
| verwachte outcome (vooraf vastgelegd) | `needs_adjustment` |
| werkelijke outcome | `needs_adjustment` |
| komt overeen | ja |
| trainingsrichtingen | 0 |
| decisionRelevantGaps | 3 |
| possibleScopings | 3 |
| sourceCandidates | n.v.t. |
| epistemicFlags | 0 |
| alle sourceRefs geldig | n.v.t. |
| invalid-output | nee |
| gecontroleerde begrippen in gebruikersgerichte velden | geen |

**Signaleringen (geen oordeel):**

- *Mogelijke nieuwe scenariofeiten:* De possibleScopings bevatten voorbeeldsituaties (ouder tegen hulp, team bij een verandering, leerling in de klas), elk gemarkeerd als "Voorstel". De samenvatting en de voorlopige kern verzinnen geen situatie.
- *Perspectieven sterker dan in de input:* Niet van toepassing (geen betrokkenen in de input).
- *Overig:* Geen trainingsrichtingen; de rationale verwijst naar het kiezen van een afbakening of het beschrijven van een eigen situatie.

## Menselijke evaluatie

**Status: `PASS`**

Menselijke review van de baseline training-analysis/v2.

De brede input wordt correct geclassificeerd als `needs_adjustment`. Er worden geen trainingsrichtingen gegenereerd. De afbakeningen zijn expliciet voorstellen en worden niet als feiten over de oorspronkelijke situatie gepresenteerd. Daarmee doet deze outcome wat het contract beoogt.
