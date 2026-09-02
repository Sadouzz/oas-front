/**
 * Logos sous licence MIT (cardog-ai/icons, https://github.com/cardog-ai/icons).
 * Marques non listées ici (ex. Renault, Peugeot, Dacia, Suzuki, Citroën) n'ont pas
 * de logo disponible sous licence claire pour un usage commercial — elles retombent
 * sur l'illustration générique dans VehicleAvatarComponent.
 */
const KNOWN_MARQUES: Record<string, string> = {
  acura: 'acura',
  'alfa romeo': 'alfa-romeo',
  'aston martin': 'aston-martin',
  audi: 'audi',
  bmw: 'bmw',
  byd: 'byd',
  bentley: 'bentley',
  bugatti: 'bugatti',
  buick: 'buick',
  cadillac: 'cadillac',
  chevrolet: 'chevrolet',
  chrysler: 'chrysler',
  dodge: 'dodge',
  ferrari: 'ferrari',
  fiat: 'fiat',
  ford: 'ford',
  gmc: 'gmc',
  genesis: 'genesis',
  honda: 'honda',
  hummer: 'hummer',
  hyundai: 'hyundai',
  infiniti: 'infiniti',
  jaguar: 'jaguar',
  jeep: 'jeep',
  kia: 'kia',
  koenigsegg: 'koenigsegg',
  lamborghini: 'lamborghini',
  'land rover': 'landrover',
  landrover: 'landrover',
  lexus: 'lexus',
  lincoln: 'lincoln',
  lotus: 'lotus',
  lucid: 'lucid',
  mercedes: 'mb',
  'mercedes-benz': 'mb',
  'mercedes benz': 'mb',
  maserati: 'maserati',
  mazda: 'mazda',
  mclaren: 'mclaren',
  mini: 'mini',
  mitsubishi: 'mitsubishi',
  nissan: 'nissan',
  pagani: 'pagani',
  polestar: 'polestar',
  porsche: 'porsche',
  ram: 'ram',
  rivian: 'rivian',
  'rolls-royce': 'rolls-royce',
  'rolls royce': 'rolls-royce',
  subaru: 'subaru',
  tesla: 'tesla',
  toyota: 'toyota',
  vinfast: 'vinfast',
  volkswagen: 'volkswagen',
  vw: 'volkswagen',
  volvo: 'volvo',
};

export function resolveMarqueLogo(marque: string | null | undefined): string | null {
  if (!marque) return null;
  const key = marque.trim().toLowerCase();
  const slug = KNOWN_MARQUES[key];
  return slug ? `/vehicle-logos/${slug}.svg` : null;
}
