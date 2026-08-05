import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { SectionTitle } from '../../shared/components/section-title/section-title';
import { BlogService } from '../../services/blog.service';
import { Router } from '@angular/router';
import { MechanicalGearsComponent } from '../../shared/components/mechanical-gears/mechanical-gears';

type Category = 'Tous' | 'Conseils automobiles' | 'Entretien' | 'Sécurité' | 'Actualités';

interface Article {
  id: number;
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
  imports: [CommonModule, FormsModule, SectionTitle, RouterLink, MechanicalGearsComponent],
  templateUrl: './blog.html',
  styleUrl: './blog.css',
})
export class Blog implements OnInit {
  private blogService = inject(BlogService);
  private router = inject(Router);

  navigateToArticle(id: number): void {
    this.router.navigate(['/blog', id]);
  }

  readonly categories: Category[] = ['Tous', 'Conseils automobiles', 'Entretien', 'Sécurité', 'Actualités'];
  selectedCategory: Category = 'Tous';
  searchTerm = '';

  readonly pageText = {
    featuredEyebrow: 'À la une',
    featuredTitle: 'Les dernières publications',
    featuredSubtitle: 'Nos conseils les plus récents',
    allArticlesEyebrow: 'Toutes nos publications',
    allArticlesTitle: 'Explorez nos articles',
    allArticlesSubtitleSuffix: 'à découvrir',
    noResultsTitle: 'Aucun article trouvé.',
    noResultsDesc: 'Essayez un autre mot-clé ou une autre rubrique.',
    newsletterEyebrow: 'Le conseil du mois, directement dans votre boîte mail',
    newsletterTitleMain: 'Restez au courant,',
    newsletterTitleHighlight: 'roulez l’esprit tranquille.',
    newsletterButton: 'Recevoir les conseils OAS'
  };

  articles: Article[] = [];
  isLoading = true;

  ngOnInit(): void {
    this.blogService.getAll().subscribe({
      next: (data) => {
        this.articles = data.map(post => ({
          id: post.id,
          title: post.title,
          excerpt: post.metaDescription,
          category: (post.category || 'Conseils automobiles') as any,
          date: this.formatDate(post.datePublication),
          readTime: post.readTime || '5 min de lecture',
          cover: post.images || 'road',
          featured: post.featured
        }));

        // Trier pour mettre l'article "featured" en premier
        const featuredIndex = this.articles.findIndex(a => a.featured);
        if (featuredIndex > 0) {
          const [featured] = this.articles.splice(featuredIndex, 1);
          this.articles.unshift(featured);
        }
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Erreur lors de la récupération des articles du blog:', err);
        this.isLoading = false;
      }
    });
  }

  private formatDate(dateStr: string): string {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      });
    } catch (e) {
      return dateStr;
    }
  }

  get recentArticles(): Article[] { 
    return this.articles.length > 1 ? this.articles.slice(1, 4) : []; 
  }
  
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
