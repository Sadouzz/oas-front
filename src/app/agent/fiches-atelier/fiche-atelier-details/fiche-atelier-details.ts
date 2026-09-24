import { Component, inject, OnInit, ElementRef, ViewChild, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { FicheAtelierService } from '../fiche-atelier.service';
import { FicheAtelierDetailsResponse } from '../../../shared/models';
import { DevisPrevisionnel, DevisPrevisionnelService } from '../../devis-previsionnels/devis-previsionnel.service';
import { OrdreReparationService } from '../../ordres-reparation/ordre-reparation.service';
import { LucideArrowLeft, LucideCheck, LucideX } from '@lucide/angular';
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
  private ficheAtelierService = inject(FicheAtelierService);
  private ordreService = inject(OrdreReparationService);
  private authService = inject(AuthService);
  private devisService = inject(DevisPrevisionnelService);

  fiche: FicheAtelierDetailsResponse | null = null;
  loading = false;
  error = '';
  
  devis: DevisPrevisionnel | null = null;
  creatingDevis = false;
  devisMontant: number | null = null;
  devisNotes = '';

  // ─── Bouton "Créer l'ordre de réparation" (cf. spec point 8) ─────────
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
    this.ficheAtelierService.getById(id).subscribe({
      next: (data) => {
        this.fiche = data;
        this.devis = (data.devisPrevisionnel as any) ?? null;
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.error = "Impossible de charger la fiche atelier.";
        this.loading = false;
        this.cdr.markForCheck();
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
        if (this.fiche) {
          this.fiche.devisPrevisionnel = newDevis as any;
        }
        this.creatingDevis = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.error = err.error?.message || "Erreur lors de la création du devis.";
        this.creatingDevis = false;
        this.cdr.markForCheck();
      }
    });
  }

  validerDevis() {
    if (!this.devis) return;
    if (!confirm("Voulez-vous forcer la validation de ce devis (ex: accord téléphonique du client) ?")) return;
    
    this.devisService.valider(this.devis.id).subscribe({
      next: (updated) => {
        this.devis = updated;
        if (this.fiche) {
          this.fiche.devisPrevisionnel = updated as any;
        }
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.error = err.error?.message || "Impossible de valider le devis.";
        this.cdr.markForCheck();
      }
    });
  }

  statutToStepPath(statut?: string | null): string {
    switch (statut) {
      case 'RECEPTION':
      case 'A_FAIRE': return 'reception';
      case 'DIAGNOSTIC':
      case 'EN_DIAGNOSTIC': return 'diagnostic';
      case 'PIECES_MO':
      case 'EN_ATTENTE_PIECES_MO': return 'pieces-mo';
      case 'PROFORMA':
      case 'EN_ATTENTE_PROFORMA': return 'proforma';
      case 'BON_DE_COMMANDE':
      case 'PROFORMA_VALIDE':
      case 'EN_ATTENTE_COMMANDE': return 'approvisionnement';
      case 'BON_DE_SORTIE':
      case 'EN_ATTENTE_SORTIE': return 'bon-sortie';
      case 'ASSIGN_TECHNICIEN':
      case 'EN_ATTENTE_MECANICIEN': return 'assignation';
      case 'REPARATION':
      case 'EN_COURS': return 'reparation';
      case 'PAIEMENT':
      case 'EN_ATTENTE_PAIEMENT': return 'paiement';
      case 'PRET_A_LIVRER':
      case 'TERMINE': return 'livraison';
      case 'LIVRE': return 'cloture';
      default: return 'reception';
    }
  }

  ouvrirOrdreReparation() {
    if (!this.fiche) return;
    this.creatingOrdreReparation = true;
    this.cdr.markForCheck();

    this.ordreService.createFromFicheAtelier(this.fiche.id).subscribe({
      next: (ordre) => {
        this.creatingOrdreReparation = false;
        this.cdr.markForCheck();
        const step = this.statutToStepPath(ordre.statut);
        this.router.navigate(['/app/ordres-reparation', ordre.id, step]);
      },
      error: () => {
        this.creatingOrdreReparation = false;
        this.cdr.markForCheck();
        this.router.navigate(['/app/ordres-reparation'], { queryParams: { ficheAtelierId: this.fiche?.id } });
      }
    });
  }

  creerOrdreReparation() {
    if (!this.fiche) return;
    this.ouvrirOrdreReparation();
  }


  voirDevis() {
    if (!this.devis) return;
    const query = this.devis.numero || (this.fiche ? this.fiche.vehiculeImmatriculation : '');
    this.router.navigate(['/app/devis-previsionnels'], { queryParams: { keyword: query } });
  }

  goBack() {
    this.router.navigate(['/app/fiches-atelier']);
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

    this.ficheAtelierService.signForExit(this.fiche.id, signatureBase64).subscribe({
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
