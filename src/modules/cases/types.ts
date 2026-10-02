/**
 * Een geanonimiseerde praktijkcasus.
 *
 * Casussen worden altijd geanonimiseerd ingevoerd; Certum Studio slaat
 * geen herleidbare persoonsgegevens op.
 */
export interface PracticeCase {
  id: string;
  title: string;
  description: string;
  createdAt: string;
}
