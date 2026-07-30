import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';

type Category = 'Tous' | 'Conseils automobiles' | 'Entretien' | 'Sécurité' | 'Actualités';

interface Article {
  title: string;
  excerpt: string;
  category: Exclude<Category, 'Tous'>;
  date: string;
  readTime: string;
  cover: string;
  featured?: boolean;
}

@Component({
  selector: 'app-blog',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './blog.html',
  styleUrl: './blog.css',
})
export class Blog {
  readonly categories: Category[] = ['Tous', 'Conseils automobiles', 'Entretien', 'Sécurité', 'Actualités'];
  selectedCategory: Category = 'Tous';
  searchTerm = '';

  readonly articles: Article[] = [
    { title: 'Les 6 vérifications à faire avant un long trajet', excerpt: 'Les contrôles simples qui préparent votre véhicule aux longues distances.', category: 'Conseils automobiles', date: '18 juillet 2026', readTime: '6 min de lecture', cover: 'road', featured: true },
    { title: 'Quand faut-il remplacer ses plaquettes de frein ?', excerpt: 'Les signes à reconnaître pour garder un freinage fiable.', category: 'Sécurité', date: '12 juillet 2026', readTime: '4 min de lecture', cover: 'brakes' },
    { title: 'Bien entretenir sa climatisation automobile', excerpt: 'Confort, qualité de l’air et bons réflexes au quotidien.', category: 'Entretien', date: '5 juillet 2026', readTime: '5 min de lecture', cover: 'air' },
    { title: 'Ce qui change à l’atelier cet été', excerpt: 'Nouveaux équipements et services pour mieux vous accompagner.', category: 'Actualités', date: '28 juin 2026', readTime: '3 min de lecture', cover: 'garage' },
    { title: 'Comprendre les voyants du tableau de bord', excerpt: 'Les alertes à ne jamais ignorer et celles qui demandent simplement une vérification.', category: 'Sécurité', date: '20 juin 2026', readTime: '7 min de lecture', cover: 'dashboard' },
    { title: 'Vidange moteur : pourquoi respecter les échéances ?', excerpt: 'Une huile adaptée et changée à temps protège durablement votre moteur.', category: 'Entretien', date: '14 juin 2026', readTime: '5 min de lecture', cover: 'oil' },
    { title: 'Préserver ses pneus pendant la saison des pluies', excerpt: 'Pression, usure et adhérence : les essentiels pour rouler sereinement.', category: 'Conseils automobiles', date: '6 juin 2026', readTime: '4 min de lecture', cover: 'tyres' },
    { title: 'OAS élargit ses prestations de diagnostic', excerpt: 'Un accompagnement plus précis pour identifier l’origine d’une panne.', category: 'Actualités', date: '29 mai 2026', readTime: '3 min de lecture', cover: 'tools' },
  ];

  get recentArticles(): Article[] { return this.articles.slice(1, 4); }
  get filteredArticles(): Article[] {
    const search = this.searchTerm.trim().toLocaleLowerCase();
    return this.articles.filter(article =>
      (!search || `${article.title} ${article.excerpt} ${article.category}`.toLocaleLowerCase().includes(search)) &&
      (this.selectedCategory === 'Tous' || article.category === this.selectedCategory)
    );
  }

  selectCategory(category: Category): void {
    this.selectedCategory = category;
  }

  trackArticle(_: number, article: Article): string {
    return article.title;
  }
}
