export interface Service {
  slug: string;
  number: string;
  title: string;
  shortTitle: string;
  summary: string;
  description: string;
  image: string;
  alert: string[];
  includes: string[];
}

export const SERVICES: Service[] = [
  {
    slug: 'mecanique',
    number: '01',
    title: 'Mécanique',
    shortTitle: 'Mécanique',
    summary: 'Réparations mécaniques fiables pour préserver les performances de votre véhicule.',
    description: 'Notre atelier prend en charge tous les travaux de mécanique automobile, du diagnostic à la réparation du moteur, de la transmission et des organes mécaniques afin de garantir sécurité et performance.',
    image: 'https://res.cloudinary.com/p3dkpqm9/image/upload/v1788140623/oas/website/re6e8exjjflzwaks8zpv.jpg',
    alert: [
      'Bruits inhabituels',
      'Perte de puissance',
      'Fuite d’huile ou de liquide'
    ],
    includes: [
      'Diagnostic mécanique',
      'Réparation moteur',
      'Réparation boîte de vitesses',
      'Remplacement des pièces défectueuses'
    ]
  },
  {
    slug: 'electricite',
    number: '02',
    title: 'Électricité',
    shortTitle: 'Électricité',
    summary: 'Diagnostic et réparation de tous les systèmes électriques du véhicule.',
    description: 'Nous intervenons sur les batteries, alternateurs, démarreurs, faisceaux électriques et équipements électroniques pour assurer le bon fonctionnement de votre véhicule.',
    image: 'https://res.cloudinary.com/p3dkpqm9/image/upload/v1786449272/oas/website/gxule2frfbwuhkbij7eb.jpg',
    alert: [
      'Batterie déchargée',
      'Problème de démarrage',
      'Panne électrique'
    ],
    includes: [
      'Test de batterie',
      'Contrôle alternateur',
      'Réparation du circuit électrique',
      'Diagnostic électronique'
    ]
  },
  {
    slug: 'vidange',
    number: '03',
    title: 'Vidange',
    shortTitle: 'Vidange',
    summary: 'Entretenez votre moteur grâce à une vidange réalisée dans les règles de l’art.',
    description: 'Nous effectuons les vidanges avec remplacement des filtres et contrôle des niveaux afin d’optimiser les performances et la durée de vie du moteur.',
    image: 'https://res.cloudinary.com/p3dkpqm9/image/upload/v1786449299/oas/website/samcwf93dnxox0og9avx.jpg',
    alert: [
      'Huile moteur usée',
      'Révision périodique',
      'Consommation excessive d’huile'
    ],
    includes: [
      'Vidange moteur',
      'Remplacement des filtres',
      'Contrôle des niveaux',
      'Entretien périodique'
    ]
  },
  {
    slug: 'climatisation',
    number: '04',
    title: 'Climatisation',
    shortTitle: 'Climatisation',
    summary: 'Retrouvez une climatisation performante toute l’année.',
    description: 'Nous assurons l’entretien, la recharge en gaz, le diagnostic et la réparation complète du système de climatisation.',
    image: 'https://res.cloudinary.com/p3dkpqm9/image/upload/v1788140624/oas/website/xocgj92qc393xje9sssu.jpg',
    alert: [
      'Climatisation inefficace',
      'Mauvaise odeur',
      'Bruit du compresseur'
    ],
    includes: [
      'Recharge de gaz',
      'Détection de fuite',
      'Entretien du circuit',
      'Nettoyage antibactérien'
    ]
  },
  {
    slug: 'tolerie',
    number: '05',
    title: 'Tôlerie',
    shortTitle: 'Tôlerie',
    summary: 'Réparation et remise en état de la carrosserie après un choc.',
    description: 'Nos techniciens redressent, remplacent et restaurent les éléments de carrosserie afin de redonner à votre véhicule son aspect d’origine.',
    image: 'https://res.cloudinary.com/p3dkpqm9/image/upload/v1788140670/oas/website/d2eir2blm5juniuykdbx.jpg',
    alert: [
      'Carrosserie déformée',
      'Impact',
      'Rayures profondes'
    ],
    includes: [
      'Débosselage',
      'Redressage',
      'Réparation de carrosserie',
      'Préparation avant peinture'
    ]
  },
  {
    slug: 'peinture',
    number: '06',
    title: 'Peinture',
    shortTitle: 'Peinture',
    summary: 'Des finitions professionnelles pour redonner son éclat à votre véhicule.',
    description: 'Nous réalisons des travaux de peinture automobile complets ou partiels avec des produits de qualité pour une finition durable.',
    image: 'https://res.cloudinary.com/p3dkpqm9/image/upload/v1788137728/oas/website/etytu10xsxufrlnucfce.jpg',
    alert: [
      'Peinture ternie',
      'Rayures',
      'Retouches nécessaires'
    ],
    includes: [
      'Préparation des surfaces',
      'Application de peinture',
      'Vernissage',
      'Polissage et finition'
    ]
  }
];
