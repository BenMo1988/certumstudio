# CA-010: False positive bij cijfers en datums

| | |
| --- | --- |
| **Eval-id** | CA-010 |
| **Domein** | Teamorganisatie (sociaal domein) |
| **Inputsoort** | praktijkvraag |
| **Laag** | Privacy Preflight (lokaal, deterministisch) |
| **Data** | Volledig fictief / synthetisch |
| **Status (laatste run)** | `NOT_RUN` |

## Doel van deze eval

Testen dat cijfer- en datumachtige informatie die géén persoonsgegeven is niet onnodig hard wordt geblokkeerd.
Waar onzekerheid bestaat, is `review_required` de juiste uitkomst, niet `blocked`.

## Input

Exact zoals in te voeren (478 tekens). Niet wijzigen.

```text
Tijdens de teamvergadering van 12-03-2025 bespreekt het team de werkwijze uit versie 2.4 van het protocol. Volgens hoofdstuk 3, artikel 12 moet een eerste gesprek binnen 5 werkdagen plaatsvinden. Het team van 12 professionals ondersteunt dit jaar 230 gezinnen en registreerde 1.850 contactmomenten. Het team is op werkdagen bereikbaar tussen 9.00 en 17.00 uur. Bij twijfel overlegt het team met Veilig Thuis. De teamleider twijfelt of de termijn van 5 werkdagen haalbaar blijft.
```

## Verwachte uitkomst

| Onderdeel | Verwachting |
| --- | --- |
| Preflight-status | `review_required` |
| Bevindingen | Precies één: `full_date` (12-03-2025), als review-signaal. |
| Geen bevindingen voor | Versienummer, artikelnummers, aantallen, tijden, "Veilig Thuis". |

## Verwachtingen

| # | Soort | Verwachting |
| --- | --- | --- |
| V1 | Mag niet | Een `blocked`-bevinding op basis van deze tekst. |
| V2 | Moet | De volledige datum zonder geboortedatumcontext geeft `full_date` met `review_required`. |
| V3 | Mag niet | Versie-, artikel-, aantal- of tijdnotaties aanzien voor telefoonnummer, BSN, postcode of datum. |
| V4 | Mag niet | "Veilig Thuis" aanzien voor een persoonsnaam. |
| V5 | Moet | Na bevestiging van de datum (en zonder andere bevindingen) mag de input door naar de analyse. |

## Bijzondere aandachtspunten

- De datum is hier een vergaderdatum, geen persoonsgegeven. Dat de preflight dit niet kan weten en daarom om
  bevestiging vraagt, is het bedoelde gedrag (productbeslissing 3).

## Runs

Nog geen runs. Een runbestand wordt pas aangemaakt nadat de evaluatie daadwerkelijk is uitgevoerd.

| Datum | Laag / versie | Status | Run |
| --- | --- | --- | --- |
