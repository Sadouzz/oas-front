import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

export interface BlogArticle {
    id: number | string;
    imageSrc: string;
    alt: string;
    rotation: string;
    title: string;
    date: string;
}

@Component({
  selector: 'app-blog-preview',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './blog-preview.html',
  styles: []
})
export class BlogPreviewComponent {
  @Input() articles: BlogArticle[] = [];
  @Input() title = 'Derniers <br class="hidden md:block" /> Articles.';
  @Input() subtitle = 'Le Blog OAS';
  @Input() description = "Restez informé des dernières nouveautés de l'automobile. Découvrez nos conseils d'entretien, des analyses techniques et suivez les restaurations incroyables de l'atelier <strong class='text-oas-navy-dark'>OAS</strong>.";
}
