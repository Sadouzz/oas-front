import { Component, OnInit, inject, ChangeDetectionStrategy } from '@angular/core';

import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { BlogService, BlogPostModel } from '../../services/blog.service';
import { BoltCornersComponent } from '../../shared/components/bolt-corners/bolt-corners';
import { PaginationComponent } from '../../shared/components/pagination/pagination.component';

interface Comment {
  author: string;
  date: string;
  content: string;
}

@Component({
  selector: 'app-blog-detail',
  standalone: true,
  imports: [FormsModule, RouterLink, BoltCornersComponent, PaginationComponent],
  templateUrl: './blog-detail.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './blog-detail.css'
})
export class BlogDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private blogService = inject(BlogService);

  article: BlogPostModel | null = null;
  isLoading = true;

  // Likes & Comments
  likesCount = 0;
  hasLiked = false;
  comments: Comment[] = [];

  newCommentAuthor = '';
  newCommentContent = '';

  private articleId = 0;

  // Pagination
  currentPage = 1;
  pageSize = 5;

  // Share
  linkCopied = false;

  get paginatedComments(): Comment[] {
    const startIndex = (this.currentPage - 1) * this.pageSize;
    return this.comments.slice(startIndex, startIndex + this.pageSize);
  }

  get totalPages(): number {
    return Math.ceil(this.comments.length / this.pageSize);
  }

  onNextPage(): void {
    if (this.currentPage < this.totalPages) this.currentPage++;
  }

  onPrevPage(): void {
    if (this.currentPage > 1) this.currentPage--;
  }

  copyLink(): void {
    const url = window.location.href;
    navigator.clipboard.writeText(url).then(() => {
      this.linkCopied = true;
      setTimeout(() => this.linkCopied = false, 3000);
    });
  }

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam) {
      this.articleId = parseInt(idParam, 10);
      this.blogService.getById(this.articleId).subscribe({
        next: (data) => {
          this.article = data;
          this.loadInteractiveData();
          this.isLoading = false;
        },
        error: (err) => {
          console.error('Erreur lors du chargement de l\'article:', err);
          this.isLoading = false;
        }
      });
    } else {
      this.isLoading = false;
    }
  }

  toggleLike(): void {
    this.hasLiked = !this.hasLiked;
    if (this.hasLiked) {
      this.likesCount++;
    } else {
      this.likesCount--;
    }
    this.saveInteractiveData();
  }

  submitComment(event: Event): void {
    event.preventDefault();
    if (!this.newCommentAuthor.trim() || !this.newCommentContent.trim()) return;

    const newComment: Comment = {
      author: this.newCommentAuthor.trim(),
      date: new Date().toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }),
      content: this.newCommentContent.trim()
    };

    this.comments.unshift(newComment);
    this.newCommentAuthor = '';
    this.newCommentContent = '';
    this.saveInteractiveData();
  }

  private loadInteractiveData(): void {
    // Charger depuis le localStorage ou initialiser avec des données fictives
    const storageKey = `oas_blog_interactive_${this.articleId}`;
    const stored = localStorage.getItem(storageKey);

    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        this.likesCount = parsed.likesCount || 0;
        this.hasLiked = parsed.hasLiked || false;
        this.comments = parsed.comments || [];
      } catch (e) {
        this.initDefaultMockData();
      }
    } else {
      this.initDefaultMockData();
    }
  }

  private saveInteractiveData(): void {
    const storageKey = `oas_blog_interactive_${this.articleId}`;
    const data = {
      likesCount: this.likesCount,
      hasLiked: this.hasLiked,
      comments: this.comments
    };
    localStorage.setItem(storageKey, JSON.stringify(data));
  }

  private initDefaultMockData(): void {
    // Générer des likes aléatoires et des commentaires par défaut selon l'article
    this.likesCount = Math.floor(Math.random() * 25) + 5;
    this.hasLiked = false;

    const defaultComments: Record<number, Comment[]> = {
      1: [
        { author: 'Jean-Marc', date: '3 août 2026', content: 'Très bon article, j\'ai tendance à oublier la vérification de la pression de la roue de secours. C\'est pourtant crucial.' },
        { author: 'Sophie V.', date: '2 août 2026', content: 'Merci pour ces conseils ! Un check-up mécanique s\'impose avant notre départ dans le Sud la semaine prochaine.' }
      ],
      2: [
        { author: 'Alexandre', date: '28 juillet 2026', content: 'Exactement ce qu\'il me fallait. Mes freins commencent à siffler depuis quelques jours, je vais prendre rendez-vous chez OAS.' },
        { author: 'Garage Passion', date: '27 juillet 2026', content: 'Rappel capital sur le liquide de frein. Trop de conducteurs oublient de le faire purger régulièrement !' }
      ]
    };

    this.comments = defaultComments[this.articleId] || [
      { author: 'Anonyme', date: 'Hier', content: 'Super article, très instructif pour l\'entretien quotidien de nos mécaniques.' }
    ];
    this.saveInteractiveData();
  }

  getArticleImage(imageKey: string): string {
    const mapping: Record<string, string> = {
      road: 'https://images.unsplash.com/photo-1494976388531-d1058494cdd8?q=80&w=1200&auto=format&fit=crop',
      brakes: 'https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?q=80&w=1200&auto=format&fit=crop',
      air: 'https://images.unsplash.com/photo-1517524008697-84bbe3c3fd98?q=80&w=1200&auto=format&fit=crop',
      garage: 'https://images.unsplash.com/photo-1520627918841-86e57201c13d?q=80&w=1200&auto=format&fit=crop',
      dashboard: 'https://images.unsplash.com/photo-1635835694200-a4a350080648?q=80&w=1200&auto=format&fit=crop',
      oil: 'https://images.unsplash.com/photo-1632823471565-1ec2a74c2e6f?q=80&w=1200&auto=format&fit=crop',
      tyres: 'https://images.unsplash.com/photo-1600705722908-bab1e61c0b4d?q=80&w=1200&auto=format&fit=crop',
      tools: 'https://images.unsplash.com/photo-1487754180451-c456f719a1fc?q=80&w=1200&auto=format&fit=crop'
    };
    return mapping[imageKey] || 'https://images.unsplash.com/photo-1494976388531-d1058494cdd8?q=80&w=1200&auto=format&fit=crop';
  }

  formatDate(dateStr: string): string {
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
}
