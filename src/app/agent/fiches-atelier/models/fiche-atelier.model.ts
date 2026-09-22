import { DevisPrevisionnelOnFicheAtelier } from "@app/shared/models";

export interface BriqueConfig {
  id?: number;
  label: string;
  type: string;
  options?: string;
  ordre?: number;
  obligatoire?: boolean;
}

export interface FicheAtelierConfigBackend {
  id?: number;
  configJson: string;
}

export interface FicheAtelierConfigItem {
  nom: string;
  archive?: boolean;
}

export interface FicheAtelierFullConfig {
  lignesReception: FicheAtelierConfigItem[];
  rubriquesDefauts: FicheAtelierConfigItem[];
  briques: BriqueConfig[];
}

export const DEFAULT_LIGNES_RECEPTION: string[] = [
  'Carrosserie',
  'Intérieur / Habitacle',
  'Vitrage / Pare-brise',
  'Eclairage',
  'Accessoires (Cric, roue de secours...)'
];

export const DEFAULT_RUBRIQUES_DEFAUTS: string[] = [
  'Mécanique',
  'Électrique',
  'Climatisation',
  'Peinture',
  'Tôlerie'
];

export function toConfigItems(items: (string | FicheAtelierConfigItem)[]): FicheAtelierConfigItem[] {
  return items.map(item => {
    if (typeof item === 'string') {
      return { nom: item, archive: false };
    }
    return { nom: item.nom, archive: !!item.archive };
  });
}

export function parseFicheAtelierConfig(jsonStr?: string | null): FicheAtelierFullConfig {
  const result: FicheAtelierFullConfig = {
    lignesReception: DEFAULT_LIGNES_RECEPTION.map(nom => ({ nom, archive: false })),
    rubriquesDefauts: DEFAULT_RUBRIQUES_DEFAUTS.map(nom => ({ nom, archive: false })),
    briques: []
  };

  if (!jsonStr) return result;

  try {
    const parsed = JSON.parse(jsonStr);
    if (Array.isArray(parsed)) {
      result.briques = parsed;
    } else if (typeof parsed === 'object' && parsed !== null) {
      if (Array.isArray(parsed.lignesReception) && parsed.lignesReception.length > 0) {
        result.lignesReception = toConfigItems(parsed.lignesReception);
      }
      if (Array.isArray(parsed.rubriquesDefauts) && parsed.rubriquesDefauts.length > 0) {
        result.rubriquesDefauts = toConfigItems(parsed.rubriquesDefauts);
      }
      if (Array.isArray(parsed.briques)) {
        result.briques = parsed.briques;
      }
    }
  } catch (e) {
    console.warn('Erreur parsing fiche atelier config:', e);
  }

  return result;
}

export interface LigneReception {
    nom: string;
    etat: boolean | null; // true = OUI, false = NON, null = non renseigné
}

export interface LigneDefaut {
    nom: string;
    present?: boolean | null; // true = cochée, false = non cochée
    designation?: string;
}

export interface FicheAtelierRequest {
    rendezVousId?: number | null;
    clientId: number;
    vehiculeId: number;
    nomChauffeur?: string;
    telephoneChauffeur?: string;
    niveauEssence?: string;
    kilometrage?: number;
    designationTravaux?: string;
    lignesReception?: LigneReception[];
    lignesDefauts?: LigneDefaut[];
    nb?: string;
    dateSortiePrevue?: string;
    garantie?: string;
    signatureReceptionnaireBase64?: string;
    signatureBase64?: string;
    signatureSortieBase64?: string;
}

export interface FicheAtelierDetailsResponse {
    id: number;
    numero?: string;
    rendezVousId?: number | null;
    clientId: number;
    clientName: string;
    vehiculeId: number;
    vehiculeImmatriculation: string;
    garageId: number;
    nomChauffeur?: string;
    telephoneChauffeur?: string;
    niveauEssence?: string;
    kilometrage?: number;
    designationTravaux?: string;
    lignesReception?: LigneReception[];
    lignesDefauts?: LigneDefaut[];
    nb?: string;
    dateSortiePrevue?: string;
    garantie?: string;
    signatureReceptionnaireBase64?: string;
    signatureBase64?: string;
    signatureSortieBase64?: string;
    createdAt: string;
    updatedAt: string;
    hasOrdreReparation?: boolean;
  devisPrevisionnel?: DevisPrevisionnelOnFicheAtelier | null;
}

export type FicheAtelierResponse = FicheAtelierDetailsResponse;

