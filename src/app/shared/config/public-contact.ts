/** Numéro WhatsApp public d'OAS, réservé aux demandes entrantes depuis le site. */
export const PUBLIC_WHATSAPP_NUMBER = '221785968642';
export const PUBLIC_WHATSAPP_URL = `https://wa.me/${PUBLIC_WHATSAPP_NUMBER}`;

/** Normalise un numéro client pour le lien WhatsApp; un numéro local sénégalais reçoit l'indicatif 221. */
export function toWhatsAppNumber(phone: string | null | undefined): string | null {
  if (!phone) return null;
  let digits = phone.replace(/\D/g, '');
  if (digits.startsWith('00')) digits = digits.slice(2);
  if (digits.length === 9) digits = `221${digits}`;
  return digits.length >= 9 ? digits : null;
}
