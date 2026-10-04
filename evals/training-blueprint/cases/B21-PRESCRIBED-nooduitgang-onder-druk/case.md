# B21-PRESCRIBED: Trusted prescribed_action: vaste handelingslijn onder druk

| | |
| --- | --- |
| **Eval-id** | B21-PRESCRIBED |
| **Gebaseerd op** | CA-010 (Analysis V2.1, `ready`, menselijk beoordeeld) |
| **Inputsoort** | casus |
| **Data** | Volledig fictief / synthetisch |
| **Status (laatste run)** | `PASS_WITH_NOTES` |

## Doel van deze eval

Blueprint V2.1-integratiecase voor trusted routebeleid (prompt `training-blueprint/v2.1`, contract
`blueprint-contract/v2`). Houdt de Blueprint één leidende handelingslijn vast wanneer het routebeleid `prescribed_action` uit de analyse komt, met professionele speelruimte in de uitvoering?

## Bron van deze eval

- Input en analyse: exact de fixture `test/fixtures/v21-ready-analyses.json` (`CA-010`), afkomstig uit
  `evals/training-analysis/cases/CA-010-vaste-handelingslijn-onder-druk/runs/2026-10-03_training-analysis-v2.1.1_claude-opus-5-5_medium.md`.
- Er wordt geen nieuwe richting verzonnen; de gekozen richting staat letterlijk in die analyse.

## Input

```text
Tijdens een lopende groepsactiviteit merkt een begeleider dat een nooduitgang geblokkeerd is door gestapelde dozen. Een collega vraagt de dozen pas na afloop weg te halen, omdat het onderbreken van de activiteit onrust geeft in de groep. In deze werksituatie geldt de vaste instructie dat een geblokkeerde nooduitgang direct wordt vrijgemaakt en dat dit daarna wordt gemeld aan de verantwoordelijke.
```

## Gekozen trainingsrichting (trusted context)

| | |
| --- | --- |
| **id** | `instructie-volgen-ondanks-verzoek` |
| **titel** | Vaste instructie uitvoeren bij tegengesteld verzoek |
| **routePolicy** | `prescribed_action` |
| **focus** | De begeleider ontvangt van een collega het verzoek om te wachten met het vrijmaken van de geblokkeerde nooduitgang, terwijl de vaste instructie voorschrijft dat dit direct gebeurt en daarna wordt gemeld. De richting oefent het vasthouden aan deze handelingslijn en het verantwoorden daarvan tegenover de collega. |
| **voorgesteld leerdoel** | De deelnemer kan de nooduitgang direct vrijmaken en dit daarna melden aan de verantwoordelijke, en kan aan de collega uitleggen waarom het verzoek om te wachten niet wordt gevolgd. |
| **sourceRefs** | `S1`, `S2`, `S3` |

## Verwachtingen

Vastgelegd vóór de eerste run.

| # | Soort | Verwachting |
| --- | --- | --- |
| R-1 | Moet | Trusted Analysis-routebeleid: `prescribed_action`. |
| R-2 | Moet | Server-side Blueprint-ambiguïteit: `single_best_action`. |
| R-3 | Moet | `decisionPoint.routePolicy` is `prescribed_action`. |
| R-4 | Moet | `learningArc.actie.routePolicy` is `prescribed_action`. |
| R-5 | Mag | De vaste handelingslijn expliciet ontwerpen, inclusief de volgorde direct vrijmaken → daarna melden (komt uit de trusted context). |
| R-6 | Mag | Professionele speelruimte in de uitvoering, bijvoorbeeld hoe de collega wordt aangesproken of hoe rekening wordt gehouden met de groep. |
| R-7 | Moet | Feedback beoordeelt correcte uitvoering én de professionele uitvoering daarvan. |
| R-8 | Moet | Toets meet transfer naar een vergelijkbare situatie waarin dezelfde leidende handelingslijn geldt. |
| R-9 | Mag niet | Er een kunstmatige open keuze van maken. |
| R-10 | Mag niet | Een externe wet of richtlijn als feit introduceren. |
| R-11 | Moet | Bron alleen via `sourceNeeds`. |
| R-12 | Mag niet | BC Online-bloknamen. |

## Runs

| Datum | Versie | Generator | Status | Run |
| --- | --- | --- | --- | --- |
| 2026-10-03 | training-blueprint/v2.1 · blueprint-contract/v2 | claude-opus-5-5 · medium | `PASS_WITH_NOTES` | [run](runs/2026-10-03_training-blueprint-v2.1_claude-opus-5-5_medium.md) |
