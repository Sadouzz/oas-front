import { Component, inject, OnInit, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FicheAtelierService } from '../../services/fiche-atelier.service';
import { FicheAtelierResponse } from '../../shared/models';
import { LucideArrowLeft, LucideCheck, LucideX } from '@lucide/angular';

@Component({
  selector: 'app-fiche-atelier-details',
  standalone: true,
  imports: [CommonModule, LucideArrowLeft, LucideCheck, LucideX],
  templateUrl: './fiche-atelier-details.html'
})
export class FicheAtelierDetails implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private service = inject(FicheAtelierService);

  fiche: FicheAtelierResponse | null = null;
  loading = false;
  error = '';

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam) {
      this.loadFiche(+idParam);
    } else {
      this.error = "ID de la fiche manquant.";
    }
  }

  loadFiche(id: number) {
    this.loading = true;
    this.service.getById(id).subscribe({
      next: (data) => {
        this.fiche = data;
        this.loading = false;
      },
      error: () => {
        this.error = "Impossible de charger la fiche atelier.";
        this.loading = false;
      }
    });
  }

  goBack() {
    this.router.navigate(['/gestion/fiches-atelier']);
  }

  // --- Signature Sortie ---
  @ViewChild('signatureSortieCanvas') set sigSortieCanvas(el: ElementRef<HTMLCanvasElement>) {
    if (el) {
      this.sigSortieEl = el;
      this.ctx = el.nativeElement.getContext('2d');
      if (this.ctx) {
        this.ctx.lineWidth = 2;
        this.ctx.lineCap = 'round';
        this.ctx.strokeStyle = '#000000';
      }
    }
  }
  sigSortieEl!: ElementRef<HTMLCanvasElement>;
  private ctx: CanvasRenderingContext2D | null = null;
  private isDrawing = false;
  savingSortie = false;

  startDrawing(event: MouseEvent | TouchEvent) {
    this.isDrawing = true;
    this.draw(event);
  }

  draw(event: MouseEvent | TouchEvent) {
    if (!this.isDrawing || !this.ctx || !this.sigSortieEl) return;
    event.preventDefault();

    const canvas = this.sigSortieEl.nativeElement;
    const rect = canvas.getBoundingClientRect();
    
    let x, y;
    if (event instanceof MouseEvent) {
      x = event.clientX - rect.left;
      y = event.clientY - rect.top;
    } else if (event instanceof TouchEvent) {
      x = event.touches[0].clientX - rect.left;
      y = event.touches[0].clientY - rect.top;
    }

    if (x !== undefined && y !== undefined) {
      this.ctx.lineTo(x, y);
      this.ctx.stroke();
      this.ctx.beginPath();
      this.ctx.moveTo(x, y);
    }
  }

  stopDrawing() {
    this.isDrawing = false;
    if (this.ctx) this.ctx.beginPath();
  }

  clearSignature() {
    if (this.ctx && this.sigSortieEl) {
      const canvas = this.sigSortieEl.nativeElement;
      this.ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  }

  validerSortie() {
    if (!this.fiche || !this.sigSortieEl) return;
    this.savingSortie = true;
    const signatureBase64 = this.sigSortieEl.nativeElement.toDataURL('image/png');

    this.service.signForExit(this.fiche.id, signatureBase64).subscribe({
      next: (data) => {
        this.fiche = data;
        this.savingSortie = false;
      },
      error: () => {
        this.error = "Erreur lors de la validation de la sortie.";
        this.savingSortie = false;
      }
    });
  }
}
