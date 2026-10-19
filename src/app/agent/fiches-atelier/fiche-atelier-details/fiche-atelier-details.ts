import { ConfirmationService } from '../../../shared/components/confirmation/confirmation.service';
import { Component, inject, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { FicheAtelierService } from '../fiche-atelier.service';
import { FicheAtelierDetailsResponse } from '../../../shared/models';
import {
  LigneReception,
  LigneDefaut,
  FicheAtelierRequest,
  DEFAULT_LIGNES_RECEPTION,
  DEFAULT_RUBRIQUES_DEFAUTS
} from '../models/fiche-atelier.model';
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
  private confirmation = inject(ConfirmationService);

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

  lignesReception: LigneReception[] = [];
  lignesDefauts: LigneDefaut[] = [];
  notesFicheAtelier = '';
  nouveauPointNom = '';
  nouveauDefautNom = '';

  initialSnapshot = '';
  savingChanges = false;
  saveSuccess = '';
  saveError = '';

  get lignesReceptionList(): LigneReception[] {
    return this.lignesReception;
  }

  get lignesDefautsList(): LigneDefaut[] {
    return this.lignesDefauts;
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

  private initDataFromFiche(data: FicheAtelierDetailsResponse): void {
    const rawReception = data.lignesReception || (data as any).reception || [];
    if (rawReception.length > 0) {
      this.lignesReception = rawReception.map((l: any) => ({
        nom: l.nom,
        etat: l.etat !== undefined ? l.etat : (l.oui === true ? true : (l.non === true ? false : null))
      }));
    } else {
      this.lignesReception = DEFAULT_LIGNES_RECEPTION.map(nom => ({ nom, etat: null }));
    }

    let rawDefauts = data.lignesDefauts || (data as any).defautsConstates || (data as any).defauts || [];
    const defautsMap = new Map<string, LigneDefaut>();
    DEFAULT_RUBRIQUES_DEFAUTS.forEach(nom => {
      defautsMap.set(nom.toLowerCase(), { nom, present: false, designation: '' });
    });
    rawDefauts.forEach((d: any) => {
      if (!d.nom) return;
      const desc = (d.designation || d.description || d.defaut || d.valeur || '').trim();
      defautsMap.set(d.nom.toLowerCase(), {
        nom: d.nom,
        present: !!d.present || desc.length > 0,
        designation: desc
      });
    });
    this.lignesDefauts = Array.from(defautsMap.values());
    this.notesFicheAtelier = data.nb || '';

    this.takeSnapshot();
  }

  takeSnapshot(): void {
    this.initialSnapshot = this.getCurrentSnapshot();
    this.cdr.markForCheck();
  }

  get hasChanges(): boolean {
    if (!this.initialSnapshot) return false;
    return this.getCurrentSnapshot() !== this.initialSnapshot;
  }

  private getCurrentSnapshot(): string {
    const rec = (this.lignesReception || []).map(l => ({
      nom: (l.nom || '').trim(),
      etat: l.etat ?? null
    }));
    const def = (this.lignesDefauts || []).map(d => ({
      nom: (d.nom || '').trim(),
      present: !!d.present,
      designation: (d.designation || '').trim()
    }));
    return JSON.stringify({
      lignesReception: rec,
      lignesDefauts: def,
      notes: (this.notesFicheAtelier || '').trim()
    });
  }

  cancelChanges(): void {
    if (this.fiche) {
      this.initDataFromFiche(this.fiche);
      this.saveSuccess = '';
      this.saveError = '';
      this.cdr.markForCheck();
    }
  }

  setLigneReceptionEtat(index: number, val: boolean): void {
    const item = this.lignesReception[index];
    if (!item) return;
    item.etat = item.etat === val ? null : val;
    this.cdr.markForCheck();
  }

  addCustomPointReception(): void {
    const nom = (this.nouveauPointNom || '').trim();
    if (!nom) return;
    this.lignesReception.push({ nom, etat: null });
    this.nouveauPointNom = '';
    this.cdr.markForCheck();
  }

  removeLigneReception(index: number): void {
    this.lignesReception.splice(index, 1);
    this.cdr.markForCheck();
  }

  toggleDefautPresent(defaut: LigneDefaut): void {
    defaut.present = !defaut.present;
    if (!defaut.present) {
      defaut.designation = '';
    }
    this.cdr.markForCheck();
  }

  addCustomDefaut(): void {
    const nom = (this.nouveauDefautNom || '').trim();
    if (!nom) return;
    if (this.lignesDefauts.some(d => d.nom.toLowerCase() === nom.toLowerCase())) {
      this.nouveauDefautNom = '';
      return;
    }
    this.lignesDefauts.push({
      nom,
      present: true,
      designation: ''
    });
    this.nouveauDefautNom = '';
    this.cdr.markForCheck();
  }

  removeDefaut(index: number): void {
    this.lignesDefauts.splice(index, 1);
    this.cdr.markForCheck();
  }

  saveChanges(): void {
    if (!this.fiche || this.savingChanges) return;
    this.savingChanges = true;
    this.saveSuccess = '';
    this.saveError = '';

    const lignesRec: LigneReception[] = (this.lignesReception || [])
      .map(l => ({ nom: (l.nom || '').trim(), etat: l.etat ?? null }))
      .filter(l => !!l.nom);

    const lignesDef: LigneDefaut[] = (this.lignesDefauts || [])
      .map(d => ({
        nom: (d.nom || '').trim(),
        present: !!d.present,
        designation: d.present ? (d.designation || '').trim() : ''
      }))
      .filter(d => !!d.nom);

    const req: FicheAtelierRequest = {
      rendezVousId: this.fiche.rendezVousId ?? null,
      clientId: this.fiche.clientId,
      vehiculeId: this.fiche.vehiculeId,
      nomChauffeur: this.fiche.nomChauffeur,
      telephoneChauffeur: this.fiche.telephoneChauffeur,
      niveauEssence: this.fiche.niveauEssence,
      kilometrage: this.fiche.kilometrage,
      designationTravaux: this.fiche.designationTravaux,
      lignesReception: lignesRec,
      reception: lignesRec,
      lignesDefauts: lignesDef,
      defautsConstates: lignesDef,
      nb: (this.notesFicheAtelier || '').trim(),
      signatureReceptionnaireBase64: this.fiche.signatureReceptionnaireBase64,
      signatureBase64: this.fiche.signatureBase64,
      signatureSortieBase64: this.fiche.signatureSortieBase64
    };

    this.ficheAtelierService.update(this.fiche.id, req).subscribe({
      next: (updated) => {
        this.fiche = updated;
        this.initDataFromFiche(updated);
        this.savingChanges = false;
        this.saveSuccess = 'Modifications enregistrées avec succès !';
        this.cdr.markForCheck();
        setTimeout(() => {
          this.saveSuccess = '';
          this.cdr.markForCheck();
        }, 4000);
      },
      error: (err) => {
        this.savingChanges = false;
        this.saveError = err.error?.message || 'Erreur lors de l\'enregistrement des modifications.';
        this.cdr.markForCheck();
      }
    });
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
        this.initDataFromFiche(data);
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

  async validerDevis() {
    if (!this.devis) return;
    if (!await this.confirmation.confirm("Voulez-vous forcer la validation de ce devis (ex: accord téléphonique du client) ?")) return;
    
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
