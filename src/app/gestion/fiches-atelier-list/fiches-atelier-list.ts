import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FicheAtelierService } from '../../services/fiche-atelier.service';
import { FicheAtelierResponse } from '../../shared/models';
import { RouterLink } from '@angular/router';
import { LucideEye } from '@lucide/angular';

@Component({
  selector: 'app-fiches-atelier-list',
  standalone: true,
  imports: [CommonModule, RouterLink, LucideEye],
  templateUrl: './fiches-atelier-list.html',
  styleUrl: './fiches-atelier-list.css'
})
export class FichesAtelierList implements OnInit {
  private service = inject(FicheAtelierService);
  
  fiches: FicheAtelierResponse[] = [];
  loading = false;
  error = '';

  ngOnInit(): void {
    this.loadFiches();
  }

  loadFiches() {
    this.loading = true;
    this.error = '';
    this.service.getAll().subscribe({
      next: (data) => {
        this.fiches = data;
        this.loading = false;
      },
      error: () => {
        this.error = 'Erreur lors du chargement des fiches atelier.';
        this.loading = false;
      }
    });
  }
}
