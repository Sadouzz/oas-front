import { Component, inject, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { FicheAtelierService } from '../fiche-atelier.service';
import { FicheAtelierDetailsResponse } from '../../../shared/models';
import { LigneReception, LigneDefaut } from '../models/fiche-atelier.model';
import { DevisPrevisionnel, DevisPrevisionnelService } from '../../devis-previsionnels/devis-previsionnel.service';
import { OrdreReparationService } from '../../ordres-reparation/ordre-reparation.service';
import { LucideArrowLeft, LucideCheck } from '@lucide/angular';
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
  sharingPdf = false;
  shareMessage = '';

  partagerFicheSignee(): void {
    if (!this.fiche || this.sharingPdf) return;
    this.sharingPdf = true;
    this.shareMessage = '';
    this.ficheAtelierService.getSignedPdf(this.fiche.id).subscribe({
      next: async (blob) => {
        const file = new File([blob], `fiche-atelier-${this.fiche!.numero || this.fiche!.id}.pdf`, { type: 'application/pdf' });
        try {
          if (navigator.share && navigator.canShare?.({ files: [file] })) {
            await navigator.share({ files: [file], title: 'Fiche atelier signée' });
            this.shareMessage = 'Document transmis à l’application de partage. Sélectionnez WhatsApp et le client.';
          } else {
            const url = URL.createObjectURL(file);
            const link = document.createElement('a');
            link.href = url;
            link.download = file.name;
            link.click();
            setTimeout(() => URL.revokeObjectURL(url), 60000);
            this.shareMessage = 'PDF téléchargé : joignez-le à la conversation WhatsApp du client.';
          }
        } catch (error) {
          if ((error as DOMException).name !== 'AbortError') this.error = 'Le partage de la fiche a échoué.';
        } finally {
          this.sharingPdf = false;
          this.cdr.markForCheck();
        }
      },
      error: () => {
        this.sharingPdf = false;
        this.error = 'Impossible de générer la fiche signée.';
        this.cdr.markForCheck();
      }
    });
  }
  
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

  get lignesReceptionList(): LigneReception[] {
    if (!this.fiche) return [];
    return this.fiche.lignesReception || (this.fiche as any).reception || [];
  }

  get lignesDefautsList(): LigneDefaut[] {
    if (!this.fiche) return [];
    return this.fiche.lignesDefauts || (this.fiche as any).defautsConstates || (this.fiche as any).defauts || [];
  }

  isLigneOui(ligne: LigneReception): boolean {
    return ligne.etat === true || (ligne as any).oui === true;
  }

  isLigneNon(ligne: LigneReception): boolean {
    return ligne.etat === false || (ligne as any).non === true;
  }

  hasDefaut(defaut: LigneDefaut): boolean {
    const text = (defaut.designation || (defaut as any).description || (defaut as any).defaut || (defaut as any).valeur || '').trim();
    return defaut.present === true || text.length > 0;
  }

  getDefautTexte(defaut: LigneDefaut): string {
    const text = (defaut.designation || (defaut as any).description || (defaut as any).defaut || (defaut as any).valeur || '').trim();
    if (text) return text;
    if (defaut.present === true) return 'Défaut signalé (aucun détail saisi)';
    return 'R.A.S (aucun défaut)';
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
        if (!this.devis) {
          this.devisService.getByFicheAtelierId(id).subscribe({
            next: (devisData) => {
              if (devisData) {
                this.devis = devisData;
                if (this.fiche) this.fiche.devisPrevisionnel = devisData as any;
                this.cdr.markForCheck();
              }
            },
            error: () => {}
          });
        }
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

}
