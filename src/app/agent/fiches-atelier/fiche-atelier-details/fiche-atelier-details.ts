import { Component, inject, OnInit, ElementRef, ViewChild, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { FicheAtelierService } from '../fiche-atelier.service';
import { FicheAtelierResponse } from '../../../shared/models';
import { DevisPrevisionnel, DevisPrevisionnelService } from '../../devis-previsionnels/devis-previsionnel.service';
import { LucideArrowLeft, LucideCheck, LucideX } from '@lucide/angular';
import { OrdreReparationService } from '../../ordres-reparation/ordre-reparation.service';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-fiche-atelier-details',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideArrowLeft, LucideCheck],
  templateUrl: './fiche-atelier-details.html'
})
export class FicheAtelierDetails implements OnInit {
  private cdr = inject(ChangeDetectorRef);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private service = inject(FicheAtelierService);
  private ordreReparationService = inject(OrdreReparationService);
  private authService = inject(AuthService);
  private devisService = inject(DevisPrevisionnelService);

  fiche: FicheAtelierResponse | null = null;
  loading = false;
  error = '';
  
  devis: DevisPrevisionnel | null = null;
  loadingDevis = false;
  creatingDevis = false;
  devisMontant: number | null = null;
  devisNotes = '';

  // ─── Bouton "Créer l'ordre de réparation" (cf. spec point 8) ─────────
  ordreReparationExists = false;
  checkingOrdreReparation = false;
  creatingOrdreReparation = false;

  private readonly rolesAutorisesCreationOR = ['ROLE_SUPER_AGENT', 'ROLE_MASTER', 'ROLE_CHEF_ATELIER'];
  get canCreateOrdreReparation(): boolean {
    const role = this.authService.getRole();
    return !!role && this.rolesAutorisesCreationOR.includes(role);
  }

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
        this.loading = false; this.cdr.markForCheck();
        this.checkOrdreReparationExists(id);
        this.loadDevis(id);
      },
      error: () => {
        this.error = "Impossible de charger la fiche atelier.";
        this.loading = false; this.cdr.markForCheck();
      }
    });
  }

  private checkOrdreReparationExists(ficheAtelierId: number) {
    this.checkingOrdreReparation = true;
    this.ordreReparationService.existsForFicheAtelier(ficheAtelierId).subscribe({
      next: (res) => { this.ordreReparationExists = !!res?.exists; this.checkingOrdreReparation = false; },
      error: () => { this.checkingOrdreReparation = false; }
    });
  }

  loadDevis(ficheId: number) {
    this.loadingDevis = true;
    this.devisService.getByFicheAtelierId(ficheId).subscribe({
      next: (devis) => {
        this.devis = devis;
        this.loadingDevis = false;
      },
      error: () => {
        this.loadingDevis = false;
      }
    });
  }

  saveDevis() {
    if (!this.fiche || !this.devisMontant) return;
    this.creatingDevis = true;
    this.devisService.create({
      montantTotal: this.devisMontant,
      notesReparation: this.devisNotes,
      kilometrageVehicule: this.fiche.kilometrage || 0,
      vehiculeId: this.fiche.vehiculeId,
      clientId: this.fiche.clientId,
      ficheAtelierId: this.fiche.id
    }).subscribe({
      next: (newDevis) => {
        this.devis = newDevis;
        this.creatingDevis = false;
      },
      error: (err) => {
        this.error = err.error?.message || "Erreur lors de la création du devis.";
        this.creatingDevis = false;
      }
    });
  }

  validerDevis() {
    if (!this.devis) return;
    if (!confirm("Voulez-vous forcer la validation de ce devis (ex: accord téléphonique du client) ?")) return;
    
    this.devisService.valider(this.devis.id).subscribe({
      next: (updated) => {
        this.devis = updated;
      },
      error: (err) => {
        this.error = err.error?.message || "Impossible de valider le devis.";
      }
    });
  }

  creerOrdreReparation() {
    if (!this.fiche) return;
    if (!this.devis || (this.devis.statut !== 'ACCEPTE' && this.devis.statut !== 'PAYEE')) {
      this.error = "Un devis prévisionnel doit être créé et accepté avant de créer l'ordre de réparation.";
      return;
    }
    this.router.navigate(['/agent/ordres-reparation'], { queryParams: { ficheAtelierId: this.fiche.id } });
  }

  goBack() {
    this.router.navigate(['/agent/fiches-atelier']);
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
