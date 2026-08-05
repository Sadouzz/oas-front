import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../environments/environment';

export interface BlogPostModel {
  id: number;
  title: string;
  metaDescription: string;
  datePublication: string;
  description: string;
  images: string;
  category: string;
  readTime: string;
  featured: boolean;
}

const MOCK_BLOG_POSTS: BlogPostModel[] = [
  {
    id: 1,
    title: 'Les 6 vérifications à faire avant un long trajet',
    metaDescription: 'Les contrôles simples qui préparent votre véhicule aux longues distances.',
    datePublication: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    description: 'Avant de prendre la route pour un long trajet, quelques contrôles s\'imposent pour éviter les pannes. Vérifiez la pression et l\'état des pneus (y compris la roue de secours), les niveaux des liquides (huile moteur, liquide de refroidissement, lave-glace, liquide de frein), le fonctionnement de tous les feux de signalisation, l\'état des balais d\'essuie-glace, la présence du kit de sécurité obligatoire, et le fonctionnement de la climatisation.',
    images: 'road',
    category: 'Conseils automobiles',
    readTime: '6 min de lecture',
    featured: true
  },
  {
    id: 2,
    title: 'Quand faut-il remplacer ses plaquettes de frein ?',
    metaDescription: 'Les signes à reconnaître pour garder un freinage fiable.',
    datePublication: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
    description: 'Le système de freinage est l\'organe de sécurité le plus important de votre véhicule. Les plaquettes de frein doivent être contrôlées régulièrement. Les signes d\'usure incluent un sifflement ou un grincement lors du freinage, une baisse du niveau de liquide de frein, des vibrations dans la pédale ou un allongement anormal des distances d\'arrêt. N\'attendez pas que le témoin s\'allume pour agir.',
    images: 'brakes',
    category: 'Sécurité',
    readTime: '4 min de lecture',
    featured: false
  },
  {
    id: 3,
    title: 'Bien entretenir sa climatisation automobile',
    metaDescription: 'Confort, qualité de l’air et bons réflexes au quotidien.',
    datePublication: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
    description: 'Une climatisation bien entretenue assure un air sain dans l\'habitacle et évite les surconsommations de carburant. Pensez à faire fonctionner votre climatisation au moins 10 minutes chaque mois, hiver comme été, pour lubrifier les joints. Le filtre d\'habitacle doit être remplacé chaque année pour stopper les pollens et poussières, et une recharge en gaz est conseillée tous les 2 ans.',
    images: 'air',
    category: 'Entretien',
    readTime: '5 min de lecture',
    featured: false
  },
  {
    id: 4,
    title: 'Ce qui change à l’atelier cet été',
    metaDescription: 'Nouveaux équipements et services pour mieux vous accompagner.',
    datePublication: new Date(Date.now() - 22 * 24 * 60 * 60 * 1000).toISOString(),
    description: 'Pour toujours mieux vous servir, notre atelier OAS fait peau neuve cet été avec de nouveaux équipements de diagnostic électronique de pointe et une station de géométrie 3D pour un réglage de parallélisme parfait. Nos mécaniciens ont également suivi une formation spécifique sur les véhicules hybrides pour élargir nos champs d\'intervention.',
    images: 'garage',
    category: 'Actualités',
    readTime: '3 min de lecture',
    featured: false
  },
  {
    id: 5,
    title: 'Comprendre les voyants du tableau de bord',
    metaDescription: 'Les alertes à ne jamais ignorer et celles qui demandent simplement une vérification.',
    datePublication: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    description: 'Les voyants lumineux du tableau de bord sont de trois couleurs : rouge (danger immédiat, arrêtez-vous), orange (anomalie à contrôler rapidement sans urgence absolue), et vert/bleu (fonctionnement d\'un équipement). Apprenez à décoder le symbole de pression d\'huile, le témoin moteur, le système de freinage ou le voyant de batterie pour agir avec sérénité.',
    images: 'dashboard',
    category: 'Sécurité',
    readTime: '7 min de lecture',
    featured: false
  },
  {
    id: 6,
    title: 'Vidange moteur : pourquoi respecter les échéances ?',
    metaDescription: 'Une huile adaptée et changée à temps protège durablement votre moteur.',
    datePublication: new Date(Date.now() - 36 * 24 * 60 * 60 * 1000).toISOString(),
    description: 'L\'huile moteur lubrifie, nettoie et refroidit les pièces internes du moteur. Avec le temps et les kilomètres, elle se charge en impuretés et perd ses propriétés protectrices. Respecter l\'intervalle de vidange préconisé par le constructeur évite l\'usure prématurée des cylindres et prolonge la durée de vie globale du moteur.',
    images: 'oil',
    category: 'Entretien',
    readTime: '5 min de lecture',
    featured: false
  },
  {
    id: 7,
    title: 'Préserver ses pneus pendant la saison des pluies',
    metaDescription: 'Pression, usure et adhérence : les essentiels pour rouler sereinement.',
    datePublication: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString(),
    description: `Sur route mouillée, le risque d'aquaplaning augmente considérablement. L'état et la pression de vos pneus sont déterminants. Vérifiez que la profondeur des sculptures est bien supérieure à la limite légale de 1,6 mm, ajustez la pression (des pneus sous-gonflés évacuent moins bien l'eau) et réduisez votre vitesse par temps de pluie.`,
    images: 'tyres',
    category: 'Conseils automobiles',
    readTime: '4 min de lecture',
    featured: false
  },
  {
    id: 8,
    title: 'OAS élargit ses prestations de diagnostic',
    metaDescription: 'Un accompagnement plus précis pour identifier l’origine d’une panne.',
    datePublication: new Date(Date.now() - 52 * 24 * 60 * 60 * 1000).toISOString(),
    description: `Grâce à l'acquisition de nos nouveaux outils de numérisation de calculateurs, nous pouvons désormais identifier avec une précision absolue les pannes intermittentes ou complexes sur l'ensemble des marques de voitures européennes et asiatiques. Prenez rendez-vous pour un check-up complet.`,
    images: 'tools',
    category: 'Actualités',
    readTime: '3 min de lecture',
    featured: false
  }
];

@Injectable({ providedIn: 'root' })
export class BlogService {
  private http = inject(HttpClient);
  private api = `${environment.apiUrl}/api/blog`;

  getAll(): Observable<BlogPostModel[]> {
    return this.http.get<BlogPostModel[]>(this.api).pipe(
      catchError(err => {
        console.warn('Backend injoignable ou hors ligne, basculement automatique sur les données de secours locales.', err);
        return of(MOCK_BLOG_POSTS);
      })
    );
  }

  getById(id: number): Observable<BlogPostModel> {
    return this.http.get<BlogPostModel>(`${this.api}/${id}`).pipe(
      catchError(err => {
        console.warn(`Impossible de récupérer l'article ${id} en ligne, recherche dans les données de secours locales...`, err);
        const post = MOCK_BLOG_POSTS.find(p => p.id === id);
        if (post) {
          return of(post);
        }
        return of(MOCK_BLOG_POSTS[0]); // Fallback sur le premier par défaut
      })
    );
  }
}
