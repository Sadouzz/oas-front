import { Component, inject, OnInit, ChangeDetectorRef, HostListener, NgZone } from '@angular/core';
import { CommonModule, NgClass } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { OrdreTravailService } from '../../../ordre-travail.service';
import { TechnicienService } from '../../../../techniciens/technicien.service';
import { StepAssignationResponseDto, StatutOrdreTravail } from '../../../models/ordre-travail.model';
import { Technicien, Specialite, extractContent } from '../../../../../shared/models';
import { AlertComponent } from '../../../../../shared/components/alert/alert.component';

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
  selector: 'app-step-assignation',
  standalone: true,
  imports: [CommonModule, NgClass, FormsModule, RouterLink, AlertComponent],
  templateUrl: './step-assignation.component.html'
})
export class StepAssignationComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private otService = inject(OrdreTravailService);
  private technicienService = inject(TechnicienService);
  private cdr = inject(ChangeDetectorRef);
  private ngZone = inject(NgZone);

  otId!: number;
  data: StepAssignationResponseDto | null = null;
  allTechniciens: Technicien[] = [];
  selectedTechnicienIds: number[] = [];

  readonly specialitesTechnicien = SPECIALITES_TECHNICIEN;
  specialiteFiltre: Specialite | '' = '';
  specialiteDropdownOpen = false;
  specialiteSearchTerm = '';

  technicienDropdownOpen = false;
  technicienSearchTerm = '';
  techniciensLoading = false;

  dateDebutPrevue = '';
  tempsEstimeHeures: number | null = null;

  loading = true;
  saving = false;
  errorMessage = '';
  successMessage = '';

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.specialiteDropdownOpen = false;
    this.technicienDropdownOpen = false;
    this.cdr.detectChanges();
  }

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('id') || this.route.parent?.snapshot.paramMap.get('id');
    if (!idParam) {
      this.router.navigate(['/app/ordres-travail']);
      return;
    }
    this.otId = +idParam;
    this.loadData();
  }

  loadData(): void {
    this.loading = true;
    this.technicienService.getAll({ size: 100 }).subscribe({
      next: (res) => {
        this.allTechniciens = extractContent<Technicien>(res as any);
        this.loadStep();
      },
      error: () => this.loadStep()
    });
  }

  loadStep(): void {
    this.otService.getStepAssignation(this.otId).subscribe({
      next: (res) => {
        this.ngZone.run(() => {
          this.data = res;
          this.selectedTechnicienIds = (res.techniciens || []).map(t => t.id);
          if (res.dateDebutPrevue) {
            this.dateDebutPrevue = res.dateDebutPrevue.substring(0, 16);
          } else {
            const now = new Date();
            now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
            this.dateDebutPrevue = now.toISOString().slice(0, 16);
          }
          this.tempsEstimeHeures = res.tempsEstimeHeures || 2;
          this.loading = false;
          this.cdr.detectChanges();
        });
      },
      error: (err) => {
        this.ngZone.run(() => {
          this.loading = false;
          this.errorMessage = err.error?.message || 'Erreur lors du chargement de l\'assignation.';
          this.cdr.detectChanges();
        });
      }
    });
  }

  // --- Gestion du Dropdown Spécialités ---

  get selectedSpecialiteLabel(): string {
    if (!this.specialiteFiltre) return 'Toutes les spécialités';
    const found = this.specialitesTechnicien.find(s => s.value === this.specialiteFiltre);
    return found ? found.label : this.specialiteFiltre;
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
    this.cdr.detectChanges();
  }

  selectSpecialite(val: Specialite | ''): void {
    this.specialiteFiltre = val;
    this.specialiteDropdownOpen = false;
    this.specialiteSearchTerm = '';
    this.cdr.detectChanges();
  }

  clearSpecialite(event?: MouseEvent): void {
    if (event) {
      event.stopPropagation();
    }
    this.specialiteFiltre = '';
    this.specialiteSearchTerm = '';
    this.cdr.detectChanges();
  }

  // --- Gestion du Dropdown Multi-Sélection Techniciens ---

  toggleTechnicienDropdown(): void {
    this.technicienDropdownOpen = !this.technicienDropdownOpen;
    if (this.technicienDropdownOpen) {
      this.specialiteDropdownOpen = false;
      this.technicienSearchTerm = '';
    }
    this.cdr.detectChanges();
  }

  get techniciensFiltres(): Technicien[] {
    let list = this.allTechniciens;
    if (this.specialiteFiltre) {
      list = list.filter(t =>
        t.specialiteCode === this.specialiteFiltre ||
        t.specialite === this.specialiteFiltre ||
        (typeof t.specialite === 'string' && t.specialite.toUpperCase().includes(this.specialiteFiltre.toUpperCase()))
      );
    }
    if (this.technicienSearchTerm && this.technicienSearchTerm.trim()) {
      const term = this.technicienSearchTerm.trim().toLowerCase();
      list = list.filter(t => {
        const fullName = `${t.firstName || ''} ${t.lastName || ''}`.toLowerCase();
        const matricule = (t.matricule || '').toLowerCase();
        const phone = (t.phone || '').toLowerCase();
        const email = (t.email || '').toLowerCase();
        return fullName.includes(term) || matricule.includes(term) || phone.includes(term) || email.includes(term);
      });
    }
    return list;
  }

  toggleTechnicien(techId: number): void {
    const index = this.selectedTechnicienIds.indexOf(techId);
    if (index >= 0) {
      this.selectedTechnicienIds.splice(index, 1);
    } else {
      this.selectedTechnicienIds.push(techId);
    }
    this.cdr.detectChanges();
  }

  removeTechnicien(techId: number, event?: MouseEvent): void {
    if (event) {
      event.stopPropagation();
    }
    const index = this.selectedTechnicienIds.indexOf(techId);
    if (index >= 0) {
      this.selectedTechnicienIds.splice(index, 1);
      this.cdr.detectChanges();
    }
  }

  isTechnicienSelected(techId: number): boolean {
    return this.selectedTechnicienIds.includes(techId);
  }

  get assignedTechniciens(): Technicien[] {
    return this.selectedTechnicienIds.map(id => {
      const found = this.allTechniciens.find(t => t.id === id);
      if (found) return found;
      const fromStep = this.data?.techniciens?.find(t => t.id === id);
      if (fromStep) {
        return {
          id: fromStep.id,
          firstName: fromStep.firstName || fromStep.prenom || '',
          lastName: fromStep.lastName || fromStep.nom || '',
          specialite: fromStep.specialite || 'MÉCANIQUE',
          phone: fromStep.telephone || ''
        } as Technicien;
      }
      return {
        id,
        firstName: 'Technicien',
        lastName: `#${id}`,
        specialite: 'MÉCANIQUE'
      } as Technicien;
    });
  }

  getSpecialiteLabel(spec?: string | null): string {
    if (!spec) return 'Mécanique';
    const found = this.specialitesTechnicien.find(s => s.value === spec);
    return found ? found.label : spec;
  }

  getInitials(firstName?: string | null, lastName?: string | null): string {
    const f = (firstName || '').trim().charAt(0).toUpperCase();
    const l = (lastName || '').trim().charAt(0).toUpperCase();
    return (f + l) || 'T';
  }

  // --- Validation et transition ---

  validerEtDemarrerReparation(): void {
    if (this.selectedTechnicienIds.length === 0) {
      this.errorMessage = 'Veuillez sélectionner au moins un technicien à affecter aux travaux.';
      this.cdr.detectChanges();
      return;
    }

    this.saving = true;
    this.errorMessage = '';
    this.successMessage = '';
    this.cdr.detectChanges();

    const payload = {
      techniciensIds: this.selectedTechnicienIds,
      statut: StatutOrdreTravail.REPARATION,
      dateDebutPrevue: this.dateDebutPrevue ? new Date(this.dateDebutPrevue).toISOString() : undefined,
      tempsEstimeHeures: this.tempsEstimeHeures || undefined
    };

    this.otService.updateStepAssignation(this.otId, payload).subscribe({
      next: () => {
        this.ngZone.run(() => {
          this.saving = false;
          this.successMessage = 'Techniciens affectés avec succès. Démarrage des réparations !';
          this.cdr.detectChanges();
          setTimeout(() => {
            this.router.navigate(['/app/ordres-travail', this.otId, 'reparation']);
          }, 400);
        });
      },
      error: (err) => {
        this.ngZone.run(() => {
          this.saving = false;
          this.errorMessage = err.error?.message || 'Erreur lors de la validation de l\'assignation.';
          this.cdr.detectChanges();
        });
      }
    });
  }
}
