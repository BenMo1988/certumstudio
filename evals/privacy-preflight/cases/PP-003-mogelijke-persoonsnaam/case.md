# PP-003: Mogelijke persoonsnaam

| | |
| --- | --- |
| **Eval-id** | PP-003 |
| **Domein** | Jeugdhulp |
| **Inputsoort** | casus |
| **Laag** | Privacy Preflight (lokaal, deterministisch) |
| **Data** | Volledig fictief / synthetisch |
| **Status (laatste run)** | `PASS` |

## Doel van deze eval

Testen dat een mogelijke voornaam zonder andere directe identificatoren leidt tot een review-signaal, en niet tot
een automatische garantie of een harde blokkade op basis van een zwakke naamheuristiek.

## Input

Exact zoals in te voeren (261 tekens). Niet wijzigen.

```text
Tijdens een gesprek vertelt Sanne dat zij zich zorgen maakt over haar jongere broertje. Ze zegt dat het thuis de laatste tijd onrustig is. De jeugdprofessional twijfelt of hij verder moet doorvragen of eerst moet bespreken wat hij met deze informatie gaat doen.
```

## Verwachte uitkomst

| Onderdeel | Verwachting |
| --- | --- |
| Preflight-status | `review_required` |
| Bevindingen | Precies één: `possible_person_name` ("Sanne"), als review-signaal. |
| Attestatie | Verplicht (inputsoort casus). |

## Verwachtingen

| # | Soort | Verwachting |
| --- | --- | --- |
| V1 | Moet | `possible_person_name` als review-signaal; status `review_required`. |
| V2 | Mag niet | `blocked` uitsluitend op basis van de naamheuristiek. |
| V3 | Moet | Zonder afzonderlijke bevestiging van de bevinding én de casusattestatie geen provider-aanroep. |
| V4 | Moet | Wordt de tekst na bevestiging gewijzigd, dan vervallen eerdere bevestigingen. |
| V5 | Mag niet | De UI suggereert dat er na bevestiging gegarandeerd geen persoonsgegevens meer in staan. |

## Bijzondere aandachtspunten

- De naamheuristiek is een signaalgever. Een naam aan het begin van een zin ("Sanne vertelt …") wordt in V1 niet
  herkend; dat is een bekende beperking en geen garantie dat er geen naam aanwezig is.

## Runs

| Datum | Laag / versie | Status | Run |
| --- | --- | --- | --- |
| 2026-10-03 | privacy-preflight/v1 | `PASS` | [run](runs/2026-10-03_privacy-preflight-v1.md) |
