# services

Koppelingen met de buitenwereld, elk achter een eigen interface. Modules en UI praten alleen met deze interfaces, nooit
rechtstreeks met een SDK of database. Services draaien alleen server-side (`import "server-only"`).

| Map | Contract | Huidige implementatie |
| --- | --- | --- |
| `analysis/` | `TrainingAnalysisService`: Certum Analyse | `MockTrainingAnalysisService` (vaste fictieve analyses) |

Later:

- `storage/`: database / opslag
- `lms/`: externe Bureau Certum-leeromgeving

Een nieuwe implementatie (bijv. een Claude-provider) komt naast de mock in de map van de service, implementeert
hetzelfde contract en wordt gekozen in die map's `index.ts`. Verder verandert er niets in de app.
