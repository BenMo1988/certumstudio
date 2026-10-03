# BP-001: Escalerend ouderconflict: begrenzen of voortzetten

| | |
| --- | --- |
| **Eval-id** | BP-001 |
| **Gebaseerd op** | CA-001 (training-analysis/v2, `ready`) |
| **Inputsoort** | casus |
| **Data** | Volledig fictief / synthetisch |
| **Status (laatste run)** | `PASS_WITH_NOTES` |

## Bron van deze eval

- Input: exact de input van CA-001 (`evals/training-analysis/cases/CA-001-ouderconflict-escalatie/case.md`).
- Analyse: de V2-baseline-run `evals/training-analysis/cases/CA-001-ouderconflict-escalatie/runs/2026-10-03_training-analysis-v2_claude-opus-5-5_medium.md`
  (outcome `ready`, menselijk beoordeeld).
- Er wordt geen nieuwe richting verzonnen; de gekozen richting bestaat letterlijk in die run.

## Input

Exact zoals in CA-001 (570 tekens). Niet wijzigen.

```text
Een jeugdprofessional voert een gesprek met twee gescheiden ouders over zorgen rondom hun 12-jarige dochter. Tijdens het gesprek verwijten de ouders elkaar dat de ander verantwoordelijk is voor de problemen van het kind. De toon wordt steeds feller. De dochter zit in een aangrenzende ruimte en kan delen van het gesprek horen. Eén ouder vraagt de professional expliciet partij te kiezen en zegt anders niet meer mee te zullen werken aan de hulpverlening. De professional twijfelt of hij het gesprek moet voortzetten, eerst moet begrenzen of het gesprek moet beëindigen.
```

## Gekozen trainingsrichting

| | |
| --- | --- |
| **id** | `escalatie-begrenzen` |
| **titel** | Oplopend conflict tussen ouders begrenzen |
| **focus** | De professional moet bepalen hoe hij reageert wanneer ouders elkaar verwijten maken en de toon steeds feller wordt, en of hij het gesprek voortzet, begrenst of beëindigt. |
| **voorgesteld leerdoel** | De deelnemer kan herkennen wanneer wederzijdse verwijten tussen ouders het gesprek doen escaleren en kan afwegen of en hoe hij het gesprek begrenst. |
| **sourceRefs** | `S2`, `S3`, `S6` |

Bronsegmenten van de gekozen richting:
  - `S2` Tijdens het gesprek verwijten de ouders elkaar dat de ander verantwoordelijk is voor de problemen van het kind.
  - `S3` De toon wordt steeds feller.
  - `S6` De professional twijfelt of hij het gesprek moet voortzetten, eerst moet begrenzen of het gesprek moet beëindigen.

Niet gekozen richtingen in dezelfde analyse: `meeluisterend-kind`, `verzoek-partij-kiezen`.

**Professioneel dilemma (V2-analyse):** De professional moet tijdens een escalerend gesprek kiezen tussen voortzetten, begrenzen of beëindigen, terwijl de dochter delen van het gesprek kan horen en één ouder verdere medewerking afhankelijk maakt van de vraag of de professional partij kiest.

## Verwachte ambiguïteit

`multiple_defensible_actions`: de input noemt drie verdedigbare opties (voortzetten, begrenzen, beëindigen).

## Verwachtingen Training Blueprint

| # | Soort | Verwachting |
| --- | --- | --- |
| B-1 | Moet | `selectedDirectionId` is exact de gekozen richting; de Blueprint blijft bij die richting en neemt geen andere richting over. |
| B-2 | Moet | `learningGoal` is gekoppeld aan de gekozen richting (het voorgestelde leerdoel van die richting). |
| B-3 | Moet | `professionalDilemma` blijft inhoudelijk het dilemma uit de V2-analyse. |
| B-4 | Moet | Eén duidelijk hoofdkeuzemoment (`decisionPoint`), herleidbaar tot de gekozen richting en haar `sourceRefs`. |
| B-5 | Mag niet | Noodzakelijke nieuwe feiten over de situatie; ontwerpkeuzes staan als expliciete `assumptions` (max. 3). |
| B-6 | Moet | De zes Certum-fasen (Context, Actie, Reflectie, Feedback, Bron, Toets) vormen samen één leerroute rond hetzelfde keuzemoment. |
| B-7 | Moet | Reflectie kijkt terug op de gemaakte professionele keuze; Feedback reageert op handelen én afweging. |
| B-8 | Moet | Bron formuleert kennisbehoeften (`sourceNeeds`, max. 3) zonder concrete of verzonnen bronnen. |
| B-9 | Moet | Toets richt zich op toepassing/transfer in een nieuw of vergelijkbaar keuzemoment, niet op een kennistoets alleen. |
| B-10 | Moet | `successCriteria` (1–3) zijn observeerbaar handelen of onderbouwen, geen "de deelnemer begrijpt …". |
| B-11 | Mag niet | Volledige trainingscontent: geen uitgeschreven dialogen, antwoordopties, toetsvragen of teksten. |
| B-12 | Mag niet | Eén van de drie opties als verborgen "juiste" keuze behandelen in successCriteria of Feedback-intentie. |

## Verwachtingen BC Online Block Plan

| # | Soort | Verwachting |
| --- | --- | --- |
| P-1 | Moet | Alleen bloktypen uit de vastgelegde BC Online-catalogus (`catalogBlockId`). |
| P-2 | Mag niet | Fictieve of niet-bestaande bloktypen. |
| P-3 | Moet | Ieder voorgesteld blok heeft een didactische reden (`purpose`, `whyThisBlock`). |
| P-4 | Mag | Een Certum-fase met meerdere blokken, en hetzelfde bloktype in verschillende Certum-fasen. |
| P-5 | Moet | Een didactisch gewenste maar niet aantoonbaar ondersteunde capability wordt als `capabilityGap` vastgelegd, niet als nieuw blok. |
| P-6 | Moet | `skjPoints` is `null`; status is `concept`. |
| P-7 | Mag niet | Sleutelwoorden in een Chat simulatie als vervanging van beoordeling van professioneel redeneren. |
| P-8 | Mag niet | Conditionele logica gebruiken alsof het een volledige branching-engine is (het is conditionele tekstweergave). |
| P-9 | Mag | Een gesprekssimulatie in Actie (bijv. Chat simulatie), zolang die het keuzemoment in het gesprek zelf oefent en niet op sleutelwoorden scoort. |

## Runs

| Datum | Versie | Generator | Status | Run |
| --- | --- | --- | --- | --- |
| 2026-10-03 | training-blueprint/v1 · blueprint-contract/v1 | claude-opus-5-5 · medium | `PASS_WITH_NOTES` | [run](runs/2026-10-03_training-blueprint-v1_claude-opus-5-5_medium.md) |
