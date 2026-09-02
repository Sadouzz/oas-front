/**
 * Photos génériques (pas les vraies photos du véhicule du client — non disponibles côté back).
 * Assignation stable par véhicule (basée sur son id), pas aléatoire à chaque affichage,
 * pour qu'un même véhicule garde toujours la même photo.
 */
const PHOTOS = ['/vehicle-photos/car-1.png', '/vehicle-photos/car-2.png'];

export function vehiclePhotoFor(vehiculeId: number): string {
  return PHOTOS[vehiculeId % PHOTOS.length];
}
