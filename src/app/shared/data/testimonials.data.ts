export interface Testimonial {
  id: number;
  text: string;
  author: string;
  location: string;
  imageSrc: string;
}

export const TESTIMONIALS_DATA: Testimonial[] = [
  {
    id: 1,
    text: 'Un travail minutieux et des explications claires à chaque étape. Ma voiture n’a jamais aussi bien roulé.',
    author: 'Fatou D.',
    location: 'Dakar',
    imageSrc: 'https://images.unsplash.com/photo-1573496527892-904f897eb744?q=80&w=200&auto=format&fit=crop',
  },
  {
    id: 2,
    text: 'Intervention rapide sur ma boîte de vitesses, devis respecté au centime près. Je recommande sans hésiter.',
    author: 'Moussa K.',
    location: 'Dakar',
    imageSrc: 'https://images.unsplash.com/photo-1543965170-4c01a586684e?q=80&w=200&auto=format&fit=crop',
  },
  {
    id: 3,
    text: 'Après un accrochage, ma carrosserie est comme neuve. Un travail vraiment soigné, je suis impressionnée.',
    author: 'Aïcha B.',
    location: 'Rufisque',
    imageSrc: 'https://images.unsplash.com/photo-1760552069014-78ff72ee7cac?q=80&w=200&auto=format&fit=crop',
  },
  {
    id: 4,
    text: 'Le diagnostic électronique a été rapide et précis. Une équipe vraiment professionnelle qui maîtrise la mécanique moderne.',
    author: 'Oumar S.',
    location: 'Thiès',
    imageSrc: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=200&auto=format&fit=crop'
  },
  {
    id: 5,
    text: 'Changement de plaquettes et révision complète réalisés dans les temps. C\'est mon garage de confiance depuis des années.',
    author: 'Marie N.',
    location: 'Dakar',
    imageSrc: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?q=80&w=200&auto=format&fit=crop'
  },
  {
    id: 6,
    text: 'J\'ai eu un souci de climatisation qui persistait. OAS a trouvé la fuite en un rien de temps. Le service est impeccable !',
    author: 'Cheikh T.',
    location: 'Saly',
    imageSrc: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=200&auto=format&fit=crop'
  }
];
