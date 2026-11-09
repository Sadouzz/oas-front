import { Component, inject, OnInit, ChangeDetectorRef, HostListener } from '@angular/core';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { CommonModule, NgClass } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { DiagnosticService } from '../../../../diagnostics/diagnostic.service';
import { DiagnosticResponse, DiagnosticStepDto } from '../../../../diagnostics/models/diagnostic.model';
import { OrdreReparationService } from '../../../ordre-reparation.service';
import { TechnicienService } from '../../../../techniciens/technicien.service';
import { AlertComponent } from '../../../../../shared/components/alert/alert.component';
import {
  OrdreReparation,
  Technicien,
  Specialite,
  RemarqueDiagnostic,
  StatutDiagnostic,
  extractContent
} from '../../../../../shared/models';
import { StepDiagnosticResponseDto } from '../../../models/responses/step-diagnostic-response.dto';

export const SPECIALITES_TECHNICIEN: { value: Specialite; label: string }[] = [
  { value: 'MECANIQUE_GENERALE', label: 'Mécanique générale' },
  { value: 'ELECTRICITE_AUTO', label: 'Électricité auto' },
  { value: 'CARROSSERIE_PEINTURE', label: 'Carrosserie / Peinture' },
  { value: 'TOLERIE', label: 'Tôlerie' },
  { value: 'CLIMATISATION', label: 'Climatisation' },
  { value: 'DIAGNOSTIC_ELECTRONIQUE', label: 'Diagnostic électronique' },
  { value: 'PNEUMATIQUE', label: 'Pneumatique' },
];

@Component({
  selector: 'app-step-diagnostic',
  standalone: true,
  imports: [CommonModule, FormsModule, NgClass, AlertComponent],
  templateUrl: './step-diagnostic.component.html'
})
export class StepDiagnosticComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private diagnosticService = inject(DiagnosticService);
  private ordreService = inject(OrdreReparationService);
  private technicienService = inject(TechnicienService);
  private cdr = inject(ChangeDetectorRef);

  ordreId!: number;
  loadedOrdre: StepDiagnosticResponseDto | null = null;
  currentDiagnostic: any = null;

  get isReadOnly(): boolean {
    return getEtapeFromStatut(this.loadedOrdre?.statut) >= 5;
  }

  loading = true;
  saving = false;
  errorMessage = '';
  successMessage = '';

  allTechniciens: any[] = [];
  readonly specialitesTechnicien = SPECIALITES_TECHNICIEN;
  specialiteFiltreDiagnostic: Specialite | '' = '';
  specialiteDropdownOpen = false;
  specialiteSearchTerm = '';

  technicienDropdownOpen = false;
  technicienSearchTerm = '';
  technicienSearchSubject = new Subject<string>();
  techniciensLoading = false;
  knownTechniciensMap = new Map<number, any>();

  selectedTechniciens: number[] = [];
  technicienToggling: number | null = null;
  onStepCompleted?: () => void;

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.specialiteDropdownOpen = false;
    this.technicienDropdownOpen = false;
  }

  get selectedSpecialiteLabel(): string {
    if (!this.specialiteFiltreDiagnostic) return 'Toutes les spécialités';
    const found = this.specialitesTechnicien.find(s => s.value === this.specialiteFiltreDiagnostic);
    return found ? found.label : this.specialiteFiltreDiagnostic;
  }

  get filteredSpecialites(): { value: Specialite | ''; label: string }[] {
    const list: { value: Specialite | ''; label: string }[] = [
      { value: '', label: 'Toutes les spécialités' },
      ...this.specialitesTechnicien
    ];
    if (!this.specialiteSearchTerm || !this.specialiteSearchTerm.trim()) {
      return list;
    }
    const term = this.specialiteSearchTerm.trim().toLowerCase();
    return list.filter(s => s.label.toLowerCase().includes(term));
  }

  toggleSpecialiteDropdown(): void {
    this.specialiteDropdownOpen = !this.specialiteDropdownOpen;
    if (this.specialiteDropdownOpen) {
      this.technicienDropdownOpen = false;
      this.specialiteSearchTerm = '';
    }
  }

  selectSpecialite(val: Specialite | ''): void {
    this.specialiteFiltreDiagnostic = val;
    this.specialiteDropdownOpen = false;
    this.specialiteSearchTerm = '';
    this.loadTechniciensFromBackend();
  }

  clearSpecialite(event?: MouseEvent): void {
    if (event) {
      event.stopPropagation();
    }
    this.specialiteFiltreDiagnostic = '';
    this.specialiteSearchTerm = '';
    this.loadTechniciensFromBackend();
  }

  toggleTechnicienDropdown(): void {
    this.technicienDropdownOpen = !this.technicienDropdownOpen;
    if (this.technicienDropdownOpen) {
      this.specialiteDropdownOpen = false;
      this.technicienSearchTerm = '';
      if (this.allTechniciens.length === 0) {
        this.loadTechniciensFromBackend();
      }
    }
  }

  onTechnicienSearchChange(term: string): void {
    this.technicienSearchTerm = term;
    this.technicienSearchSubject.next(term);
  }

  loadTechniciensFromBackend(): void {
    if (this.allTechniciens.length === 0) {
      this.techniciensLoading = true;
      this.cdr.markForCheck();
    }

    const params: { page?: number; size?: number; keyword?: string; specialite?: string } = {
      page: 0,
      size: 50,
    };
    if (this.technicienSearchTerm && this.technicienSearchTerm.trim()) {
      params.keyword = this.technicienSearchTerm.trim();
    }
    if (this.specialiteFiltreDiagnostic) {
      params.specialite = this.specialiteFiltreDiagnostic;
    }

    this.technicienService.getAll(params).subscribe({
      next: (res) => {
        this.techniciensLoading = false;
        const fetched = extractContent<Technicien>(res as any);
        if (fetched && fetched.length > 0) {
          const map = new Map<number, any>();
          this.allTechniciens.forEach(t => map.set(t.id, this.normalizeTechnicien(t)));
          fetched.forEach(t => {
            const norm = this.normalizeTechnicien(t);
            map.set(norm.id, norm);
            this.knownTechniciensMap.set(norm.id, norm);
          });
          this.allTechniciens = Array.from(map.values());
        }
        this.cdr.markForCheck();
      },
      error: () => {
        this.techniciensLoading = false;
        this.cdr.markForCheck();
      }
    });
  }

  normalizeTechnicien(t: any): any {
    if (!t) return null;
    const firstName = (t.firstName || t.prenom || (t.technicienNom ? t.technicienNom.split(' ')[0] : '') || '').trim();
    const lastName = (t.lastName || t.nom || (t.technicienNom ? t.technicienNom.split(' ').slice(1).join(' ') : '') || '').trim();
    const fullName = t.technicienNom || (firstName || lastName ? `${firstName} ${lastName}`.trim() : (t.username || `Technicien #${t.id}`));
    const phone = t.phone || t.telephone || '';
    const specialite = t.specialite || t.specialiteCode || null;

    return {
      ...t,
      id: t.id,
      firstName,
      lastName,
      prenom: firstName,
      nom: lastName,
      fullName,
      phone,
      telephone: phone,
      specialite,
      specialiteCode: t.specialiteCode || t.specialite || null,
      matricule: t.matricule || `#${t.id}`
    };
  }

  getTechnicienFullName(t: any): string {
    if (!t) return '';
    if (t.fullName && t.fullName.trim()) return t.fullName.trim();
    if (t.technicienNom && t.technicienNom.trim()) return t.technicienNom.trim();
    const f = (t.firstName || t.prenom || '').trim();
    const l = (t.lastName || t.nom || '').trim();
    const combined = `${f} ${l}`.trim();
    if (combined) return combined;
    if (t.username && t.username.trim()) return t.username.trim();
    return t.id ? `Technicien #${t.id}` : 'Technicien';
  }

  get techniciensDiagnosticFiltres(): any[] {
    let list = this.allTechniciens;
    if (this.specialiteFiltreDiagnostic) {
      list = list.filter(t => (t.specialiteCode || t.specialite) === this.specialiteFiltreDiagnostic);
    }
    if (this.technicienSearchTerm && this.technicienSearchTerm.trim()) {
      const term = this.technicienSearchTerm.trim().toLowerCase();
      list = list.filter(t => {
        const fullName = this.getTechnicienFullName(t).toLowerCase();
        const matricule = (t.matricule || '').toLowerCase();
        const phone = (t.phone || t.telephone || '').toLowerCase();
        const email = (t.email || '').toLowerCase();
        return fullName.includes(term) || matricule.includes(term) || phone.includes(term) || email.includes(term);
      });
    }

    return list;
  }

  get assignedTechniciens(): any[] {
    return this.selectedTechniciens
      .map(id => {
        if (this.knownTechniciensMap.has(id)) {
          return this.normalizeTechnicien(this.knownTechniciensMap.get(id)!);
        }
        const fromAll = this.allTechniciens.find(t => t.id === id);
        if (fromAll) {
          const norm = this.normalizeTechnicien(fromAll);
          this.knownTechniciensMap.set(id, norm);
          return norm;
        }
        const fromOrdre = this.loadedOrdre?.techniciensAssocies?.find(t => t.id === id);
        if (fromOrdre) {
          const norm = this.normalizeTechnicien(fromOrdre);
          this.knownTechniciensMap.set(id, norm);
          return norm;
        }
        if (this.loadedOrdre?.diagnostic?.technicienId === id) {
          const norm = this.normalizeTechnicien({
            id,
            technicienNom: this.loadedOrdre.diagnostic.technicienNom
          });
          this.knownTechniciensMap.set(id, norm);
          return norm;
        }
        return {
          id,
          firstName: 'Technicien',
          lastName: `#${id}`,
          fullName: `Technicien #${id}`,
          specialite: null,
          matricule: `#${id}`,
          phone: ''
        };
      });
  }

  get diagnosticCloture(): boolean {
    return this.statutDiagnostic === 'TERMINE' || this.statutDiagnostic === 'VALIDE';
  }

  getSpecialiteLabel(spec?: string | null): string {
    if (!spec) return 'Générale';
    const found = this.specialitesTechnicien.find(s => s.value === spec);
    return found ? found.label : spec;
  }

  getInitials(firstName?: string | null, lastName?: string | null, t?: any): string {
    let f = (firstName || t?.firstName || t?.prenom || '').trim();
    let l = (lastName || t?.lastName || t?.nom || '').trim();
    
    if (!f && !l && t?.technicienNom) {
      const parts = t.technicienNom.trim().split(/\s+/);
      if (parts.length >= 2) {
        f = parts[0];
        l = parts[parts.length - 1];
      } else if (parts.length === 1) {
        f = parts[0];
      }
    }

    if (!f && !l && t?.fullName) {
      const parts = t.fullName.trim().split(/\s+/);
      if (parts.length >= 2) {
        f = parts[0];
        l = parts[parts.length - 1];
      } else if (parts.length === 1) {
        f = parts[0];
      }
    }

    const initialF = f ? f.charAt(0).toUpperCase() : '';
    const initialL = l ? l.charAt(0).toUpperCase() : '';
    return (initialF + initialL) || 'T';
  }

  statutDiagnostic: StatutDiagnostic = 'EN_ATTENTE';

  remarquesDiagnostic: RemarqueDiagnostic[] = [];
  nouvelleRemarque = '';

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('id') || this.route.parent?.snapshot.paramMap.get('id');
    if (!idParam) {
      this.router.navigate(['/app/ordres-reparation']);
      return;
    }
    this.ordreId = +idParam;

    this.technicienSearchSubject.pipe(
      debounceTime(300),
      distinctUntilChanged()
    ).subscribe(() => {
      this.loadTechniciensFromBackend();
    });

    this.loadData();
  }

  loadData(): void {
    this.loading = true;
    const params: { page?: number; size?: number; keyword?: string; specialite?: string } = {
      page: 0,
      size: 50
    };
    if (this.specialiteFiltreDiagnostic) {
      params.specialite = this.specialiteFiltreDiagnostic;
    }
    this.technicienService.getAll(params).subscribe({
      next: (res) => {
        const fetched = extractContent<Technicien>(res as any) || [];
        this.allTechniciens = fetched.map(t => this.normalizeTechnicien(t));
        this.allTechniciens.forEach(t => this.knownTechniciensMap.set(t.id, t));
        this.loadOrdre();
      },
      error: () => {
        this.loadOrdre();
      }
    });
  }

  loadOrdre(): void {
    this.ordreService.getStepDiagnostic(this.ordreId).subscribe({
      next: (o: StepDiagnosticResponseDto) => {
        this.loadedOrdre = o;
        (o.techniciensAssocies || []).forEach(t => {
          const norm = this.normalizeTechnicien(t);
          this.knownTechniciensMap.set(norm.id, norm);
        });
        this.selectedTechniciens = (o.techniciensAssocies || []).map(t => t.id);

        // Fallback si la liste associée est vide mais que diagnostic.technicienId est présent
        if (this.selectedTechniciens.length === 0 && (o.diagnostic?.technicienIds?.length || o.diagnostic?.technicienId)) {
          this.selectedTechniciens = o.diagnostic?.technicienIds?.length
            ? [...o.diagnostic.technicienIds]
            : [o.diagnostic!.technicienId!];
          this.selectedTechniciens.forEach(techId => {
            if (this.knownTechniciensMap.has(techId)) return;
            const norm = this.normalizeTechnicien({
              id: techId,
              technicienNom: o.diagnostic?.technicienNom
            });
            this.knownTechniciensMap.set(techId, norm);
          });
        }

        // Détermine le statut initial du diagnostic
        if (o.diagnostic?.statut) {
          this.statutDiagnostic = o.diagnostic.statut;
        } else if (o.statut && o.statut !== 'RECEPTION' && o.statut !== 'A_FAIRE' && o.statut !== 'DIAGNOSTIC' && o.statut !== 'EN_DIAGNOSTIC') {
          this.statutDiagnostic = 'VALIDE';
        } else {
          this.statutDiagnostic = this.selectedTechniciens.length > 0 ? 'EN_COURS' : 'EN_ATTENTE';
        }

        // On utilise directement les infos du DTO renvoyé par le backend
        if (o.diagnostic) {
          this.currentDiagnostic = o.diagnostic;
          
          if (o.diagnostic.statut) {
            this.statutDiagnostic = o.diagnostic.statut;
          }
          if (o.diagnostic.remarques && o.diagnostic.remarques.length > 0) {
            this.remarquesDiagnostic = o.diagnostic.remarques;
          }
        } else {
          // Si aucun diagnostic n'existe, on reste en attente
          if (!this.statutDiagnostic) {
            this.statutDiagnostic = 'EN_ATTENTE';
          }
        }

        this.loading = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.loading = false;
        this.errorMessage = err.error?.message || 'Erreur chargement ordre.';
        this.cdr.markForCheck();
      }
    });
  }

  toggleTechnicien(t: Technicien): void {
    if (this.diagnosticCloture || this.saving) return;
    if (this.isTechnicienAssigned(t.id)) {
      this.removeTechnicien(t.id);
    } else {
      this.assignTechnicien(t.id);
    }
  }

  isTechnicienAssigned(id: number): boolean {
    return this.selectedTechniciens.includes(id);
  }

  assignTechnicien(techId: number): void {
    if (this.diagnosticCloture || this.saving) return;
    this.technicienToggling = techId;
    this.ordreService.assignTechnicien(this.ordreId, techId).subscribe({
      next: () => {
        this.technicienToggling = null;
        if (!this.selectedTechniciens.includes(techId)) {
          this.selectedTechniciens.push(techId);
        }

        // L'assignation d'un technicien fait passer le diagnostic de 'EN_ATTENTE' à 'EN_COURS'
        if (this.statutDiagnostic === 'EN_ATTENTE') {
          this.statutDiagnostic = 'EN_COURS';
          if (this.currentDiagnostic) this.currentDiagnostic.statut = 'EN_COURS';
          this.notify('Technicien assigné · Le diagnostic passe En cours.');
        } else {
          this.notify('Technicien assigné au diagnostic.');
        }
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.technicienToggling = null;
        this.notifyError(err.error?.message || 'Erreur assignation technicien.');
      }
    });
  }

  removeTechnicien(techId: number): void {
    if (this.diagnosticCloture || this.saving) return;
    this.technicienToggling = techId;
    this.ordreService.removeTechnicien(this.ordreId, techId).subscribe({
      next: () => {
        this.technicienToggling = null;
        this.selectedTechniciens = this.selectedTechniciens.filter(id => id !== techId);

        // Si plus aucun technicien n'est assigné et que le diagnostic était En cours, il repasse En attente
        if (this.selectedTechniciens.length === 0 && this.statutDiagnostic === 'EN_COURS') {
          this.statutDiagnostic = 'EN_ATTENTE';
          if (this.currentDiagnostic) this.currentDiagnostic.statut = 'EN_ATTENTE';
          this.notify('Technicien retiré · Diagnostic repassé En attente.');
        } else {
          this.notify('Technicien retiré du diagnostic.');
        }
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.technicienToggling = null;
        this.notifyError(err.error?.message || 'Erreur retrait technicien.');
      }
    });
  }

  loadRemarques(): void {
    this.ordreService.getRemarquesDiagnostic(this.ordreId).subscribe({
      next: (rem) => {
        this.remarquesDiagnostic = rem || [];
        this.cdr.markForCheck();
      }
    });
  }

  addRemarque(): void {
    if (this.isReadOnly) return;
    if (!this.nouvelleRemarque.trim()) return;
    const contenu = this.nouvelleRemarque.trim();

    if (this.currentDiagnostic?.id) {
      this.diagnosticService.addRemarque(this.currentDiagnostic.id, { contenu }).subscribe({
        next: (r) => {
          this.remarquesDiagnostic.push(r);
          this.nouvelleRemarque = '';
          this.notify('Remarque ajoutée.');
        },
        error: () => {
          this.ordreService.addRemarqueDiagnostic(this.ordreId, contenu).subscribe({
            next: (r) => {
              this.remarquesDiagnostic.push(r);
              this.nouvelleRemarque = '';
              this.notify('Remarque ajoutée.');
            }
          });
        }
      });
    } else {
      this.ordreService.addRemarqueDiagnostic(this.ordreId, contenu).subscribe({
        next: (r) => {
          this.remarquesDiagnostic.push(r);
          this.nouvelleRemarque = '';
          this.notify('Remarque ajoutée.');
        }
      });
    }
  }

  deleteRemarque(id: number): void {
    if (this.isReadOnly) return;
    this.diagnosticService.deleteRemarque(id).subscribe({
      next: () => {
        this.remarquesDiagnostic = this.remarquesDiagnostic.filter(r => r.id !== id);
        this.notify('Remarque supprimée.');
      },
      error: () => {
        this.ordreService.deleteRemarqueDiagnostic(this.ordreId, id).subscribe({
          next: () => {
            this.remarquesDiagnostic = this.remarquesDiagnostic.filter(r => r.id !== id);
            this.notify('Remarque supprimée.');
          }
        });
      }
    });
  }

  saveDiagnosticSilently(): void {
    const stepDto: DiagnosticStepDto = {
      ordreReparationId: this.ordreId,
      listeDefauts: this.loadedOrdre?.listeDefauts || this.currentDiagnostic?.pannesDetectees || '',
      technicienIds: this.selectedTechniciens,
      statut: this.statutDiagnostic
    };
    this.diagnosticService.saveStep(stepDto).subscribe({
      next: (diag) => {
        if (diag) this.currentDiagnostic = diag;
      },
      error: () => { }
    });
  }

  validateStep(): void {
    this.saveStep2ThenGoNext();
  }

  saveStep2ThenGoNext(): void {
    if (this.selectedTechniciens.length === 0) {
      this.notifyError('Affectez au moins un technicien avant de terminer le diagnostic.');
      return;
    }
    const listeDefauts = this.loadedOrdre?.listeDefauts || this.currentDiagnostic?.pannesDetectees || '';
    this.saving = true;

    const stepDto: DiagnosticStepDto = {
      ordreReparationId: this.ordreId,
      listeDefauts: listeDefauts,
      technicienIds: this.selectedTechniciens,
    };

    // La clôture du diagnostic et le passage de l'OR à PIECES_MO sont atomiques côté serveur.
    this.diagnosticService.completeStep(stepDto).subscribe({
      next: (diag) => {
        this.currentDiagnostic = diag;
        this.statutDiagnostic = 'TERMINE';
        this.saving = false;
        this.onStepCompleted?.();
        this.notify('Diagnostic terminé. Passage à l’étape suivante enregistré.');
        this.router.navigate(['/app/ordres-reparation', this.ordreId, 'pieces-mo']);
      },
      error: (err) => {
        this.saving = false;
        this.notifyError(err.error?.message || 'Erreur lors de la clôture du diagnostic.');
      }
    });
  }

  notify(msg: string) {
    this.successMessage = msg;
    this.errorMessage = '';
    this.cdr.markForCheck();
    setTimeout(() => { this.successMessage = ''; this.cdr.markForCheck(); }, 4000);
  }

  notifyError(msg: string) {
    this.errorMessage = msg;
    this.successMessage = '';
    this.cdr.markForCheck();
    setTimeout(() => { this.errorMessage = ''; this.cdr.markForCheck(); }, 5000);
  }
}
