export function montantEnLettresFCFA(n: number): string {
  if (isNaN(n) || n === 0) return 'zéro franc CFA';

  const unites = ['', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf'];
  const dizaines = ['', 'dix', 'vingt', 'trente', 'quarante', 'cinquante', 'soixante', 'soixante-dix', 'quatre-vingt', 'quatre-vingt-dix'];
  const particuliers: Record<number, string> = {
    11: 'onze', 12: 'douze', 13: 'treize', 14: 'quatorze', 15: 'quinze', 16: 'seize',
    71: 'soixante-onze', 72: 'soixante-douze', 73: 'soixante-treize', 74: 'soixante-quatorze',
    75: 'soixante-quinze', 76: 'soixante-seize', 91: 'quatre-vingt-onze', 92: 'quatre-vingt-douze',
    93: 'quatre-vingt-treize', 94: 'quatre-vingt-quatorze', 95: 'quatre-vingt-quinze', 96: 'quatre-vingt-seize'
  };

  function convertirNombre(num: number): string {
    if (num === 0) return '';
    if (particuliers[num]) return particuliers[num];
    if (num < 10) return unites[num];
    if (num < 20) return 'dix-' + unites[num - 10];
    if (num < 100) {
      const d = Math.floor(num / 10);
      const u = num % 10;
      if (u === 1 && d < 8) return dizaines[d] + ' et un';
      return dizaines[d] + (u > 0 ? '-' + unites[u] : '');
    }
    if (num < 1000) {
      const c = Math.floor(num / 100);
      const r = num % 100;
      const centStr = c === 1 ? 'cent' : unites[c] + ' cents';
      return centStr + (r > 0 ? ' ' + convertirNombre(r) : '');
    }
    if (num < 1000000) {
      const m = Math.floor(num / 1000);
      const r = num % 1000;
      const milleStr = m === 1 ? 'mille' : convertirNombre(m) + ' mille';
      return milleStr + (r > 0 ? ' ' + convertirNombre(r) : '');
    }
    if (num < 1000000000) {
      const million = Math.floor(num / 1000000);
      const r = num % 1000000;
      const millionStr = million === 1 ? 'un million' : convertirNombre(million) + ' millions';
      return millionStr + (r > 0 ? ' ' + convertirNombre(r) : '');
    }
    return num.toString();
  }

  return convertirNombre(Math.floor(n)).trim() + ' francs CFA';
}
