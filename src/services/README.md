# services

Hier komen later de koppelingen met de buitenwereld, elk achter een eigen interface:

- `ai/`: AI-provider (bijv. Anthropic)
- `storage/`: database / opslag
- `lms/`: externe Bureau Certum-leeromgeving

Modules en UI praten alleen met deze interfaces, nooit rechtstreeks met een SDK of database.
Nog leeg: in de fundering zijn er bewust geen externe koppelingen.
