import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { Product } from '../shared/models/product.model';

export interface BackendProduit {
  id: number;
  nom: string;
  description: string;
  prix: number;
  mediaUrl: string;
  disponible: boolean;
  archive: boolean;
}

export const MOCK_PRODUCTS: Product[] = [
  {
    id: '1',
    nom: 'Porsche 911 Carrera (2020)',
    description: 'Véhicule de sport d\'exception, entretien réseau Porsche, carnet à jour. Parfait état esthétique et mécanique. Un pur plaisir de conduite avec un historique limpide.',
    prix: 105000,
    categorie: 'Vehicules',
    isVedette: true,
    images: [
      'https://images.unsplash.com/photo-1503375894014-cb1d31df3324?q=80&w=1200&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1580273916550-e323be2ae537?q=80&w=1200&auto=format&fit=crop'
    ]
  },
  {
    id: '2',
    nom: 'Moteur V8 Ford Mustang',
    description: 'Moteur V8 reconditionné entièrement par nos soins. Cylindrée 5.0L, idéal pour un projet de restauration. Garanti 6 mois pièces et main d\'œuvre.',
    prix: 8500,
    categorie: 'Pieces',
    images: [
      'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?q=80&w=1200&auto=format&fit=crop'
    ]
  },
  {
    id: '3',
    nom: 'Jantes Alliage 19" AMG',
    description: 'Set de 4 jantes AMG 19 pouces d\'origine. Quelques légères traces d\'usure (visibles sur photos), mais parfaitement droites et prêtes à être montées.',
    prix: 1200,
    categorie: 'Accessoires',
    images: [
      'https://images.unsplash.com/photo-1574067332768-450f612d46e9?q=80&w=1200&auto=format&fit=crop'
    ]
  },
  {
    id: '4',
    nom: 'Mercedes-Benz Classe G',
    description: 'Le tout-terrain par excellence. Motorisation V8 Bi-turbo, intérieur cuir complet, système audio premium. Véhicule révisé et prêt pour l\'aventure.',
    prix: 145000,
    categorie: 'Vehicules',
    isVedette: true,
    images: [
      'https://images.unsplash.com/photo-1520627918841-86e57201c13d?q=80&w=1200&auto=format&fit=crop'
    ]
  },
  {
    id: '5',
    nom: 'Suspension Pneumatique Range Rover',
    description: 'Kit de suspension pneumatique complet pour Range Rover Sport. Pièce neuve d\'origine constructeur.',
    prix: 2300,
    categorie: 'Pieces',
    images: [
      'https://images.unsplash.com/photo-1486262715619-679ce40760ab?q=80&w=1200&auto=format&fit=crop'
    ]
  },
  {
    id: '6',
    nom: 'Tapis de sol sur mesure Audi RS',
    description: 'Jeu de 4 tapis de sol en velours épais avec surpiqûres rouges et logo RS. S\'adapte parfaitement aux modèles Audi RS3, RS4, RS5.',
    prix: 150,
    categorie: 'Accessoires',
    images: [
      'https://images.unsplash.com/photo-1605330364964-b0ec7b805401?q=80&w=1200&auto=format&fit=crop'
    ]
  }
];

@Injectable({ providedIn: 'root' })
export class MarketplaceService {
  private http = inject(HttpClient);
  private api = `${environment.apiUrl}/api/client/marketplace`;

  getAll(): Observable<Product[]> {
    return this.http.get<BackendProduit[]>(`${this.api}/produits`).pipe(
      map(produits => produits.map(p => this.mapToFrontendProduct(p))),
      catchError(err => {
        console.warn('Backend injoignable ou hors ligne, basculement automatique sur les produits locaux.', err);
        return of(MOCK_PRODUCTS);
      })
    );
  }

  getPopulaires(): Observable<Product[]> {
    return this.http.get<BackendProduit[]>(`${this.api}/produits/populaires`).pipe(
      map(produits => produits.map(p => {
        const prod = this.mapToFrontendProduct(p);
        prod.isVedette = true;
        return prod;
      })),
      catchError(err => {
        console.warn('Backend injoignable pour les produits populaires, filtrage local.', err);
        return of(MOCK_PRODUCTS.filter(p => p.isVedette));
      })
    );
  }

  private mapToFrontendProduct(p: BackendProduit): Product {
    // Déterminer la catégorie de manière dynamique si elle n'est pas précisée
    let categorie: 'Vehicules' | 'Pieces' | 'Accessoires' = 'Accessoires';
    const lowerName = (p.nom || '').toLowerCase();
    const lowerDesc = (p.description || '').toLowerCase();

    if (lowerName.includes('porsche') || lowerName.includes('mercedes') || lowerName.includes('audi') || lowerName.includes('voiture') || lowerName.includes('véhicule') || lowerName.includes('classe') || lowerName.includes('mustang') || lowerDesc.includes('véhicule')) {
      categorie = 'Vehicules';
    } else if (lowerName.includes('moteur') || lowerName.includes('jante') || lowerName.includes('suspension') || lowerName.includes('pièce') || lowerDesc.includes('kit') || lowerDesc.includes('reconditionné')) {
      categorie = 'Pieces';
    }

    // Gérer les images (mediaUrl peut être une liste séparée par des virgules)
    let images: string[] = [];
    if (p.mediaUrl) {
      images = p.mediaUrl.split(',').map(url => url.trim()).filter(url => url.length > 0);
    }
    if (images.length === 0) {
      images = ['https://images.unsplash.com/photo-1549399542-7e3f8b79c341?q=80&w=1200&auto=format&fit=crop']; // Fallback image
    }

    return {
      id: String(p.id),
      nom: p.nom,
      description: p.description,
      prix: p.prix,
      images: images,
      categorie: categorie,
      isVedette: false // sera mis à jour si populaire
    };
  }
}
