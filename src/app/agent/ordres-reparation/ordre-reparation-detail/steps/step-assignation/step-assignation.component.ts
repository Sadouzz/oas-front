import { Component, inject, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule, NgClass } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { OrdreReparationService } from '../../../ordre-reparation.service';
import { TechnicienService } from '../../../../techniciens/technicien.service';
import { AlertComponent } from '../../../../../shared/components/alert/alert.component';
import { OrdreReparation, Technicien, extractContent } from '../../../../../shared/models';

@Component({
  selector: 'app-step-assignation',
  standalone: true,
  imports: [CommonModule, NgClass, AlertComponent],
  templateUrl: './step-assignation.component.html'
})
export class StepAssignationComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private ordreService = inject(OrdreReparationService);
  private technicienService = inject(TechnicienService);
  private cdr = inject(ChangeDetectorRef);

  ordreId!: number;
  loadedOrdre: OrdreReparation | null = null;
  allTechniciens: Technicien[] = [];
  selectedTechniciensReparation: number[] = [];
  technicienToggling: number | null = null;

  loading = true;
  saving = false;
  errorMessage = '';
  successMessage = '';

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('id') || this.route.parent?.snapshot.paramMap.get('id');
    if (!idParam) {
      this.router.navigate(['/app/ordres-reparation']);
      return;
    }
    this.ordreId = +idParam;
    this.loadData();
  }

  loadData(): void {
    this.loading = true;
    this.technicienService.getAll().subscribe({
      next: (res) => {
        this.allTechniciens = extractContent<Technicien>(res as any);
        this.loadOrdre();
      },
      error: () => this.loadOrdre()
    });
  }

  loadOrdre(): void {
    this.ordreService.getById(this.ordreId).subscribe({
      next: (o: OrdreReparation) => {
        this.loadedOrdre = o;
        this.selectedTechniciensReparation = (o.techniciensReparation || []).map(t => t.id);
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.loading = false;
        this.errorMessage = err.error?.message || 'Erreur lors du chargement de l\'ordre.';
        this.cdr.markForCheck();
      }
    });
  }

  toggleTechnicienReparation(t: Technicien): void {
    if (this.selectedTechniciensReparation.includes(t.id)) {
      this.removeTechnicienReparation(t.id);
    } else {
      this.assignTechnicienReparation(t.id);
    }
  }

  assignTechnicienReparation(techId: number): void {
    this.technicienToggling = techId;
    this.ordreService.assignTechnicienReparation(this.ordreId, techId).subscribe({
      next: () => {
        this.technicienToggling = null;
        if (!this.selectedTechniciensReparation.includes(techId)) {
          this.selectedTechniciensReparation.push(techId);
        }
        this.successMessage = 'Technicien assigné aux réparations.';
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.technicienToggling = null;
        this.errorMessage = err.error?.message || 'Erreur assignation.';
        this.cdr.markForCheck();
      }
    });
  }

  removeTechnicienReparation(techId: number): void {
    this.technicienToggling = techId;
    this.ordreService.removeTechnicienReparation(this.ordreId, techId).subscribe({
      next: () => {
        this.technicienToggling = null;
        this.selectedTechniciensReparation = this.selectedTechniciensReparation.filter(id => id !== techId);
        this.successMessage = 'Technicien retiré des réparations.';
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.technicienToggling = null;
        this.errorMessage = err.error?.message || 'Erreur retrait technicien.';
        this.cdr.markForCheck();
      }
    });
  }

  validateStep(): void {
    this.demarrerReparation();
  }

  demarrerReparation(): void {
    this.saving = true;
    this.ordreService.updateStatut(this.ordreId, 'REPARATION').subscribe({
      next: () => {
        this.saving = false;
        this.successMessage = 'Réparation lancée avec succès. Redirection...';
        this.cdr.markForCheck();
        setTimeout(() => {
          this.router.navigate(['/app/ordres-reparation', this.ordreId, 'reparation']);
        }, 800);
      },
      error: (err) => {
        this.saving = false;
        this.errorMessage = err.error?.message || 'Erreur lors du démarrage des réparations.';
        this.cdr.markForCheck();
      }
    });
  }
}
