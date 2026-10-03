# CA-009: Vaste handelingslijn: geblokkeerde nooduitgang

| | |
| --- | --- |
| **Eval-id** | CA-009 |
| **Domein** | Facilitair / veiligheid op de werkvloer |
| **Inputsoort** | casus |
| **Data** | Volledig fictief / synthetisch |
| **Status (laatste run)** | `PENDING_REVIEW` |

## Doel van deze eval

Testen of Certum (vanaf `training-analysis/v2.1`) een trainingsrichting met één vaste, in de input zelf gegeven
handelingslijn herkent als `routePolicy: prescribed_action`, zonder kunstmatig een keuze tussen gelijkwaardige routes te
maken. Tegenhanger van CA-006 (open keuze). Deze case is toegevoegd vóór de V2.1-baseline; er zijn geen V1- of
V2-runs.

## Input

Exact zoals in te voeren. Niet wijzigen.

```text
Tijdens een inspectieronde ziet een facilitair medewerker dat een nooduitgang geblokkeerd is door gestapelde dozen. In deze werksituatie geldt de vaste instructie dat een geblokkeerde nooduitgang direct wordt vrijgemaakt en dat dit daarna wordt gemeld aan de verantwoordelijke. Er hoeft niet te worden afgewogen of dit gebeurt: de medewerker moet de nooduitgang nu vrijmaken en het daarna melden.
```

De vaste handelingslijn (direct vrijmaken, daarna melden) staat in de input zelf. Certum hoeft haar dus niet als nieuwe
norm of bronfeit te introduceren.

## Verwachtingen voor Analysis Direction V2.1

Vastgelegd vóór de eerste run met `training-analysis/v2.1` en `analysis-contract/v2.1`.

**Verwachte uitkomst:** `ready`.

| # | Soort | Verwachting |
| --- | --- | --- |
| V2.1-1 | Moet | Uitkomst `ready`. |
| V2.1-2 | Moet | Minstens één trainingsrichting die rechtstreeks deze vaste handeling oefent (de nooduitgang direct vrijmaken en het daarna melden). |
| V2.1-3 | Moet | Die richting krijgt `routePolicy: prescribed_action`. |
| V2.1-4 | Mag | `focus` en `proposedLearningGoal` van die richting benoemen de concrete handelingslijn (direct vrijmaken, daarna melden). |
| V2.1-5 | Mag niet | Kunstmatig `open_choice` creëren of een keuze tussen gelijkwaardige routes maken waar de input geen professionele keuze bevat. |
| V2.1-6 | Mag niet | Een nieuwe wet, richtlijn, methodiek of veiligheidsregel introduceren die niet in de input staat. |
| V2.1-7 | Moet | `sourceRefs` zijn geldig en verwijzen naar bestaande bronsegmenten. |
| V2.1-8 | Mag | Een andere richting, maar alleen als die echt uit de input voortvloeit; niet om kunstmatig keuzevrijheid te maken. |
| V2.1-9 | Mag niet | Nieuwe scenariofeiten: personen, reacties, gebeurtenissen, oorzaken of gevolgen die niet in de input staan. |

## Runs

| Datum | promptVersion | Model | Effort | Status | Run |
| --- | --- | --- | --- | --- | --- |
| 2026-10-03 | training-analysis/v2.1 | claude-opus-5-5 | medium | `PENDING_REVIEW` | [run](runs/2026-10-03_training-analysis-v2.1_claude-opus-5-5_medium.md) |
