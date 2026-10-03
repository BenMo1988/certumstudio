# Certum Analysis Evals

Kwaliteitsbasis voor **Certum Analyse**: de stap waarin een onderwerp, praktijkvraag of casus wordt geanalyseerd
voordat een mens een trainingsrichting kiest.

> Dit is geen productiecode. Deze map bevat uitsluitend synthetische testdata en menselijke beoordelingen.
> Er is (nog) geen geautomatiseerde scorer of test-runner.

## Waarom we analyses evalueren

De analyse bepaalt waar een training over gaat. Een gemist dilemma, een verzonnen feit of een gemiste
privacybevinding werkt door in alles wat daarna komt. Wijzigingen in prompt, model of effort kunnen de kwaliteit
verbeteren of juist ongemerkt verslechteren. Met een vaste set evals vergelijken we configuraties op dezelfde
input en beslissen we op basis van bewijs, niet van indruk.

## Waar we wel en niet op beoordelen

We beoordelen **niet** op exacte bewoording. Twee analyses kunnen anders geformuleerd zijn en allebei goed zijn.

We beoordelen op:

| Criterium | Vraag |
| --- | --- |
| Professionele kern | Is het centrale professionele dilemma herkend, en niet versmald tot iets generieks? |
| Trouw aan de input | Blijft de analyse bij wat er staat, zonder feiten, diagnoses of context te verzinnen? |
| Leerdoel | Is het leerdoel handelingsgericht, passend bij het dilemma en haalbaar in een simulatie? |
| Geschiktheid | Is het oordeel (geschikt / aanpassen / ongeschikt) terecht en goed toegelicht? |
| Privacy | Is het privacyniveau (geen / aandachtspunt / blokkeren) juist, zonder over- of ondersignalering? |
| Trainingsrichtingen | Zijn de 1–3 richtingen professioneel echt verschillend en elk bruikbaar? |
| Terughoudendheid met aannames | Worden aannames als aanname gepresenteerd, niet als feit? |
| Ontbrekende informatie | Is wat ontbreekt relevant voor trainingsontwikkeling, en niet breder dan nodig? |

### Kaders niet ongefundeerd als feit

Methodische, juridische en normatieve kaders (bijvoorbeeld een meldplicht, een specifieke methodiek of een
beroepscode) mogen **niet ongefundeerd als feit** worden geïntroduceerd. Een analyse mag zo'n kader hooguit noemen
als mogelijk relevant aandachtspunt, zolang er geen bronvalidatie is. Een analyse die een kader stellig toepast
dat niet uit de input volgt, krijgt daarvoor een aandachtspunt.

## Uitsluitend fictieve, synthetische data

Iedere eval is volledig fictief. Gebruik nooit echte casuïstiek, ook niet geanonimiseerd. Geen namen, adressen,
geboortedata, contactgegevens, dossiernummers, namen van echte organisaties of unieke combinaties van kenmerken
die naar een echte situatie kunnen verwijzen.

## Traceerbaarheid

Iedere run is herleidbaar naar de AI-configuratie waarmee hij is gemaakt:

- **promptVersion**: `TRAINING_ANALYSIS_PROMPT_VERSION` in `src/knowledge/prompts/training-analysis.ts`
- **model** en **effort**: `CLAUDE_ANALYSIS_DEFAULTS` in `src/services/analysis/config.ts`

Deze drie waarden staan ook in de metadata-logregel (`certum.analysis`) van iedere echte analyse. Een run zonder
deze drie waarden telt niet mee in een vergelijking.

## Structuur

```
evals/training-analysis/
  README.md
  cases/
    CA-001-ouderconflict-escalatie/
      case.md                                   input + verwachtingen (verandert niet per run)
      runs/
        2026-10-03_training-analysis-v1_claude-opus-5-5_medium.md
    CA-002-breed-onderwerp-zonder-context/
      case.md                                   nog geen runs/ zolang er niet is gedraaid
    ...
```

- `case.md` bevat de exacte input en de verwachtingen. Sinds Analysis Contract V2 staat daarin ook een aparte sectie
  "Verwachtingen voor Analysis Contract V2" (V2-1, V2-2, …), vastgelegd vóór de implementatie; de V1-verwachtingen
  blijven ongewijzigd. Wijzig de input van een bestaande eval niet; maak bij
  twijfel een nieuwe eval aan.
- Elke run krijgt een eigen bestand: `<datum>_<promptVersion>_<model>_<effort>.md`, met metadata, de volledige
  output en de menselijke beoordeling.

## Beoordelingen

| Status | Betekenis |
| --- | --- |
| `PASS` | Voldoet aan alle verwachtingen. |
| `PASS_WITH_NOTES` | Bruikbaar en voldoet aan de kern, met aandachtspunten voor prompt of configuratie. |
| `FAIL` | Mist de kern, verzint feiten, beoordeelt privacy of geschiktheid onjuist, of schrijft al een training uit. |
| `PENDING_REVIEW` | Run uitgevoerd en vastgelegd; menselijke beoordeling volgt nog. |
| `NOT_RUN` | Input en verwachtingen zijn vastgelegd; er is nog geen run uitgevoerd. |

Verwachtingen worden altijd vastgelegd **voordat** het model de input te zien krijgt, zodat de beoordeling niet
achteraf naar de uitkomst wordt toegeschreven.

## Baseline conclusions — training-analysis/v2

Menselijke review van de baseline (Analysis Contract V2, claude-opus-5-5, medium, 2026-10-03) over CA-001 t/m CA-008.

1. V2 behaalt 7× `PASS`, 1× `PASS_WITH_NOTES` (CA-006), 0× `FAIL`. V1 had 2× `FAIL` (CA-003, CA-004).
2. De twee fundamentele V1-fouten zijn opgelost:
   - `unsuitable` produceert geen trainingsinhoud;
   - privacygevoelige input kan lokaal worden gestopt vóór externe AI-verwerking.
3. Alle 17 V2-trainingDirections hadden geldige sourceRefs; er waren 0 `invalid-output`-resultaten.
4. Er verschenen 0 ongefundeerde controlled terms in gebruikersgerichte analysevelden.
5. De analyse bewaart perspectieven en onzekerheid aantoonbaar beter dan V1.
6. Systeembrede observatie voor toekomstige evaluatie:
   - iedere `ready`-run leverde precies 2 decisionRelevantGaps;
   - iedere `ready`-run leverde precies 3 sourceCandidates;
   - dit kan wijzen op template- of quotagedrag en moet met een grotere evalset worden onderzocht voordat de
     prompt hiervoor wordt aangepast. Lege lijsten (`[]`) moeten een normale, toegestane uitkomst blijven.
7. sourceCandidates zijn nog geen gevalideerde bronnen. Sommige zijn eerder zoekrichtingen of beschrijvende
   onderwerpen dan formele begrippen. Ze mogen bij toekomstige Bron-functionaliteit nooit rechtstreeks als
   gevalideerde kennis worden gebruikt.

## Baseline conclusions — training-analysis/v1

Menselijke review van de baseline (claude-opus-5-5, medium, 2026-10-03) over CA-001 t/m CA-008:
6× `PASS_WITH_NOTES` (CA-001, CA-002, CA-005, CA-006, CA-007, CA-008) en 2× `FAIL` (CA-003, CA-004).

Systeembrede bevindingen:

1. De agent herkent professionele dilemma's en handelingsgerichte leerdoelen over meerdere domeinen goed.
2. Het huidige analysecontract dwingt trainingsinhoud af wanneer een input ongeschikt of privacytechnisch
   geblokkeerd is.
3. Privacycontrole vindt momenteel pas binnen de externe AI-analyse plaats; vóór gebruik met echte casuïstiek is een
   privacy-preflight vóór externe verzending noodzakelijk.
4. De agent moet terughoudender worden met niet-aangeleverde theoretische/juridische begrippen, niet-essentiële
   ontbrekende informatie en nieuwe scenariofeiten.

## Overzicht

Evalset V1. Baseline van training-analysis/v2 (Analysis Contract V2, claude-opus-5-5, medium) uitgevoerd op
2026-10-03 en menselijk beoordeeld. Baseline van training-analysis/v1 (claude-opus-5-5, medium) uitgevoerd op 2026-10-03 en vastgezet met git-tag
`analysis-v1-baseline`. Evals voor de lokale Privacy Preflight staan apart in
[`evals/privacy-preflight/`](../privacy-preflight/README.md).

| Eval | Inputsoort | Domein | Wat wordt getest | V1 (2026-10-03) | V2 (2026-10-03) |
| --- | --- | --- | --- | --- | --- |
| [CA-001](cases/CA-001-ouderconflict-escalatie/case.md) | casus | Jeugdhulp | Escalerend ouderconflict, kind binnen gehoorsafstand | `PASS_WITH_NOTES` | `PASS` |
| [CA-002](cases/CA-002-breed-onderwerp-zonder-context/case.md) | onderwerp | Algemeen | Breed onderwerp; geen context verzinnen | `PASS_WITH_NOTES` | `PASS` |
| [CA-003](cases/CA-003-casus-zonder-beslismoment/case.md) | casus | Sociaal werk | Gebeurtenis zonder beslismoment; geen dilemma verzinnen | `FAIL` | `PASS` |
| [CA-004](cases/CA-004-direct-herleidbare-persoonsgegevens/case.md) | casus | Jeugd / onderwijs | Direct herleidbare (synthetische) persoonsgegevens; privacyblokkade | `FAIL` | `PASS` |
| [CA-005](cases/CA-005-onzekerheid-zonder-bewijs/case.md) | casus | Onderwijs | Redeneren onder onzekerheid zonder oorzaak in te vullen | `PASS_WITH_NOTES` | `PASS` |
| [CA-006](cases/CA-006-leidinggeven-privegrens/case.md) | casus | Leidinggeven | Dilemma buiten het sociaal domein; geen diagnose of arbeidsrecht | `PASS_WITH_NOTES` | `PASS_WITH_NOTES` |
| [CA-007](cases/CA-007-autonomie-versus-zorg/case.md) | casus | Ambulante begeleiding | Autonomie versus professionele zorg; niet paternalistisch | `PASS_WITH_NOTES` | `PASS` |
| [CA-008](cases/CA-008-twee-verdedigbare-routes/case.md) | casus | Jeugdhulp | Twee verdedigbare routes; niet zelf kiezen wie gelijk heeft | `PASS_WITH_NOTES` | `PASS` |
