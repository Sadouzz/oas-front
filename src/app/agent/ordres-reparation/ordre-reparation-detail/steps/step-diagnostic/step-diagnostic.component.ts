import { Component, inject, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule, NgClass } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { DiagnosticService } from '../../../../diagnostics/diagnostic.service';
import { DiagnosticResponse, DiagnosticStepDto } from '../../../../diagnostics/models/diagnostic.model';
import { OrdreReparationService } from '../../../ordre-reparation.service';
import { TechnicienService } from '../../../../techniciens/technicien.service';
import { AlertComponent } from '../../../../../shared/components/alert/alert.component';
import { MediaUploaderComponent } from '../../../../../shared/components/media-uploader/media-uploader.component';
import {
  OrdreReparation,
  Technicien,
  Specialite,
  RemarqueDiagnostic,
  PieceJointeDiagnostic,
  TypePieceJointeDiagnostic,
  StatutDiagnostic,
  StatutOrdre,
  CloudinaryUploadResult,
  extractContent
} from '../../../../../shared/models';

export const SPECIALITES_TECHNICIEN: { value: Specialite; label: string }[] = [
  { value: 'MECANIQUE_GENERALE', label: 'Mécanique générale' },
  { value: 'ELECTRICITE_AUTO', label: 'Électricité auto' },
  { value: 'CARROSSERIE_PEINTURE', label: 'Carrosserie / Peinture' },
  { value: 'TOLERIE', label: 'Tôlerie' },
  { value: 'CLIMATISATION', label: 'Climatisation' },
  { value: 'DIAGNOSTIC_ELECTRONIQUE', label: 'Diagnostic électronique' },
  { value: 'PNEUMATIQUE', label: 'Pneumatique' },
];

export const PANNES_FREQUENTES = [
  'Bruit anormal moteur',
  'Voyant moteur allumé',
  'Freinage inefficace / vibrations',
  'Fuite d\'huile',
  'Fumée anormale à l\'échappement',
  'Climatisation inopérante',
  'Problème démarrage',
  'Usure pneus',
  'Jeu dans la direction',
];

@Component({
  selector: 'app-step-diagnostic',
  standalone: true,
  imports: [CommonModule, FormsModule, NgClass, AlertComponent, MediaUploaderComponent],
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
  loadedOrdre: OrdreReparation | null = null;
  currentDiagnostic: DiagnosticResponse | null = null;

  loading = true;
  saving = false;
  errorMessage = '';
  successMessage = '';

  allTechniciens: Technicien[] = [];
  readonly specialitesTechnicien = SPECIALITES_TECHNICIEN;
  specialiteFiltreDiagnostic: Specialite | '' = '';
  selectedTechniciens: number[] = [];
  technicienToggling: number | null = null;

  pannesFrequentes = PANNES_FREQUENTES;
  selectedPannes: string[] = [];
  autrePannes = '';
  showAutrePannes = false;

  statutDiagnostic: StatutDiagnostic = 'EN_ATTENTE';

  remarquesDiagnostic: RemarqueDiagnostic[] = [];
  nouvelleRemarque = '';
  piecesJointesDiagnostic: PieceJointeDiagnostic[] = [];

  get techniciensDiagnosticFiltres(): Technicien[] {
    if (!this.specialiteFiltreDiagnostic) return this.allTechniciens;
    return this.allTechniciens.filter(t => t.specialite === this.specialiteFiltreDiagnostic);
  }

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
      error: () => {
        this.loadOrdre();
      }
    });
  }

  loadOrdre(): void {
    this.ordreService.getById(this.ordreId).subscribe({
      next: (o: OrdreReparation) => {
        this.loadedOrdre = o;
        this.selectedTechniciens = (o.techniciens || []).map(t => t.id);

        const pannesDecomp = this.decomposeToCheckboxes(o.listeDefauts ?? '', PANNES_FREQUENTES);
        this.selectedPannes = pannesDecomp.selected;
        this.autrePannes = pannesDecomp.autre;
        this.showAutrePannes = this.autrePannes.length > 0;

        // Détermine le statut initial du diagnostic
        if (o.diagnostic?.statut) {
          this.statutDiagnostic = o.diagnostic.statut;
        } else if (o.statut && o.statut !== 'A_FAIRE' && o.statut !== 'EN_DIAGNOSTIC') {
          this.statutDiagnostic = 'VALIDE';
        } else {
          this.statutDiagnostic = this.selectedTechniciens.length > 0 ? 'EN_COURS' : 'EN_ATTENTE';
        }

        // Récupère les données depuis le contrôleur dédié /api/diagnostics/ordre-reparation/{id}
        this.diagnosticService.getByOrdreReparationId(this.ordreId).subscribe({
          next: (diag) => {
            if (diag) {
              this.currentDiagnostic = diag;
              if (diag.statut) {
                this.statutDiagnostic = diag.statut;
              } else {
                this.statutDiagnostic = this.selectedTechniciens.length > 0 ? 'EN_COURS' : 'EN_ATTENTE';
              }
              if (diag.technicienIds && diag.technicienIds.length > 0) {
                this.selectedTechniciens = [...diag.technicienIds];
              } else if (diag.technicienId && !this.selectedTechniciens.includes(diag.technicienId)) {
                this.selectedTechniciens.push(diag.technicienId);
              }
              if (diag.pannesDetectees) {
                const p = this.decomposeToCheckboxes(diag.pannesDetectees, PANNES_FREQUENTES);
                this.selectedPannes = p.selected;
                this.autrePannes = p.autre;
                this.showAutrePannes = this.autrePannes.length > 0;
              }
              if (diag.piecesJointes && diag.piecesJointes.length > 0) {
                this.piecesJointesDiagnostic = diag.piecesJointes;
              }
              if (diag.remarques && diag.remarques.length > 0) {
                this.remarquesDiagnostic = diag.remarques;
              }
              this.cdr.markForCheck();
            } else {
              // Si aucun diagnostic n'existe encore pour cet OR, on le crée en statut 'EN_ATTENTE'
              this.diagnosticService.create({
                ordreReparationId: this.ordreId,
                statut: 'EN_ATTENTE',
                pannesDetectees: o.listeDefauts || o.descriptionTravaux
              }).subscribe({
                next: (created) => {
                  this.currentDiagnostic = created;
                  this.statutDiagnostic = created.statut || 'EN_ATTENTE';
                  this.cdr.markForCheck();
                },
                error: () => {}
              });
            }
          },
          error: () => {}
        });

        this.loadPiecesJointes();
        this.loadRemarques();

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
          if (this.currentDiagnostic?.id) {
            this.diagnosticService.updateStatut(this.currentDiagnostic.id, 'EN_COURS').subscribe({
              next: (d) => {
                if (d) this.currentDiagnostic = d;
                this.cdr.markForCheck();
              }
            });
          } else {
            this.diagnosticService.saveStep({
              ordreReparationId: this.ordreId,
              technicienIds: this.selectedTechniciens,
              statut: 'EN_COURS'
            }).subscribe({
              next: (d) => {
                if (d) this.currentDiagnostic = d;
                this.cdr.markForCheck();
              }
            });
          }
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
    this.technicienToggling = techId;
    this.ordreService.removeTechnicien(this.ordreId, techId).subscribe({
      next: () => {
        this.technicienToggling = null;
        this.selectedTechniciens = this.selectedTechniciens.filter(id => id !== techId);

        // Si plus aucun technicien n'est assigné et que le diagnostic était En cours, il repasse En attente
        if (this.selectedTechniciens.length === 0 && this.statutDiagnostic === 'EN_COURS') {
          this.statutDiagnostic = 'EN_ATTENTE';
          if (this.currentDiagnostic?.id) {
            this.diagnosticService.updateStatut(this.currentDiagnostic.id, 'EN_ATTENTE').subscribe({
              next: (d) => {
                if (d) this.currentDiagnostic = d;
                this.cdr.markForCheck();
              }
            });
          }
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

  loadPiecesJointes(): void {
    this.ordreService.getPiecesJointesDiagnostic(this.ordreId).subscribe({
      next: (pj) => {
        this.piecesJointesDiagnostic = pj || [];
        this.cdr.markForCheck();
      }
    });
  }

  onPieceJointeUploaded(res: CloudinaryUploadResult): void {
    const type: TypePieceJointeDiagnostic = res.resourceType === 'raw' || res.format === 'pdf' ? 'PDF' : 'PHOTO';
    const payload = {
      url: res.secureUrl,
      type,
      remarque: res.publicId || null
    };

    if (this.currentDiagnostic?.id) {
      this.diagnosticService.addPieceJointe(this.currentDiagnostic.id, payload).subscribe({
        next: () => {
          this.loadPiecesJointes();
          this.notify('Document de diagnostic ajouté.');
        },
        error: () => {
          this.ordreService.addPieceJointeDiagnostic(this.ordreId, payload).subscribe({
            next: () => {
              this.loadPiecesJointes();
              this.notify('Document de diagnostic ajouté.');
            }
          });
        }
      });
    } else {
      this.ordreService.addPieceJointeDiagnostic(this.ordreId, payload).subscribe({
        next: () => {
          this.loadPiecesJointes();
          this.notify('Document de diagnostic ajouté.');
        }
      });
    }
  }

  deletePieceJointe(id: number): void {
    this.diagnosticService.deletePieceJointe(id).subscribe({
      next: () => {
        this.piecesJointesDiagnostic = this.piecesJointesDiagnostic.filter(p => p.id !== id);
        this.notify('Document supprimé.');
      },
      error: () => {
        this.ordreService.deletePieceJointeDiagnostic(this.ordreId, id).subscribe({
          next: () => {
            this.piecesJointesDiagnostic = this.piecesJointesDiagnostic.filter(p => p.id !== id);
            this.notify('Document supprimé.');
          }
        });
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

  private autoSaveTimeout: any = null;

  togglePanne(p: string): void {
    const idx = this.selectedPannes.indexOf(p);
    if (idx >= 0) {
      this.selectedPannes.splice(idx, 1);
    } else {
      this.selectedPannes.push(p);
    }
    this.saveDiagnosticSilently();
  }

  onAutrePannesChange(): void {
    if (this.autoSaveTimeout) {
      clearTimeout(this.autoSaveTimeout);
    }
    this.autoSaveTimeout = setTimeout(() => {
      this.saveDiagnosticSilently();
    }, 600);
  }

  saveDiagnosticSilently(): void {
    const pannes = this.composeFromCheckboxes(this.selectedPannes, this.autrePannes);
    const stepDto: DiagnosticStepDto = {
      ordreReparationId: this.ordreId,
      listeDefauts: pannes,
      technicienIds: this.selectedTechniciens,
      statut: this.statutDiagnostic
    };
    this.diagnosticService.saveStep(stepDto).subscribe({
      next: (diag) => {
        if (diag) this.currentDiagnostic = diag;
      },
      error: () => {}
    });
  }

  private decomposeToCheckboxes(raw: string, frequentList: string[]): { selected: string[]; autre: string } {
    if (!raw || !raw.trim()) {
      return { selected: [], autre: '' };
    }
    const items = raw.split(',').map(s => s.trim()).filter(Boolean);
    const selected: string[] = [];
    const others: string[] = [];
    for (const item of items) {
      if (frequentList.includes(item)) selected.push(item);
      else others.push(item);
    }
    return { selected, autre: others.join(', ') };
  }

  private composeFromCheckboxes(selected: string[], autre: string): string {
    const list = [...selected];
    if (autre && autre.trim().length > 0) {
      list.push(autre.trim());
    }
    return list.join(', ');
  }

  marquerTermine(): void {
    if (this.selectedTechniciens.length === 0) {
      this.notifyError('Veuillez affecter au moins un technicien avant de terminer le diagnostic.');
      return;
    }
    this.statutDiagnostic = 'TERMINE';
    if (this.currentDiagnostic?.id) {
      this.diagnosticService.updateStatut(this.currentDiagnostic.id, 'TERMINE').subscribe({
        next: (d) => {
          if (d) this.currentDiagnostic = d;
          this.saveDiagnosticSeul();
          this.notify('Diagnostic marqué comme Terminé. Vous pouvez maintenant le valider.');
          this.cdr.markForCheck();
        },
        error: () => {
          this.saveDiagnosticSeul();
        }
      });
    } else {
      this.saveDiagnosticSeul();
    }
  }

  marquerValide(): void {
    if (this.selectedTechniciens.length === 0) {
      this.notifyError('Veuillez affecter au moins un technicien avant de valider le diagnostic.');
      return;
    }
    this.statutDiagnostic = 'VALIDE';
    this.saving = true;

    const pannes = this.composeFromCheckboxes(this.selectedPannes, this.autrePannes);
    const stepDto: DiagnosticStepDto = {
      ordreReparationId: this.ordreId,
      listeDefauts: pannes,
      technicienIds: this.selectedTechniciens,
      statut: 'VALIDE'
    };

    this.diagnosticService.saveStep(stepDto).subscribe({
      next: (diag) => {
        this.currentDiagnostic = diag;
        this.ordreService.updateStatut(this.ordreId, 'EN_ATTENTE_PIECES_MO').subscribe({
          next: () => {},
          error: () => {}
        });
        this.saving = false;
        this.notify('Diagnostic validé avec succès ! Le bouton d’étape suivante est maintenant débloqué.');
        this.cdr.markForCheck();
      },
      error: () => {
        this.ordreService.update(this.ordreId, {
          numero: this.loadedOrdre?.numero || '',
          descriptionTravaux: this.loadedOrdre?.descriptionTravaux || '',
          listeDefauts: pannes,
          vehiculeId: this.loadedOrdre?.vehicule?.id || 0,
          statut: 'EN_ATTENTE_PIECES_MO' as StatutOrdre
        }).subscribe({
          next: () => {
            this.ordreService.updateStatut(this.ordreId, 'EN_ATTENTE_PIECES_MO').subscribe({
              next: () => {},
              error: () => {}
            });
            this.saving = false;
            this.notify('Diagnostic validé avec succès ! Le bouton d’étape suivante est maintenant débloqué.');
            this.cdr.markForCheck();
          },
          error: (err) => {
            this.saving = false;
            this.notifyError(err.error?.message || 'Erreur lors de la validation.');
          }
        });
      }
    });
  }

  saveDiagnosticSeul(): void {
    const pannes = this.composeFromCheckboxes(this.selectedPannes, this.autrePannes);
    this.saving = true;

    const stepDto: DiagnosticStepDto = {
      ordreReparationId: this.ordreId,
      listeDefauts: pannes,
      technicienIds: this.selectedTechniciens,
      statut: this.statutDiagnostic
    };

    // Utilisation de POST /api/diagnostics/step
    this.diagnosticService.saveStep(stepDto).subscribe({
      next: (diag) => {
        this.currentDiagnostic = diag;
        this.saving = false;
        const libelle = this.statutDiagnostic === 'VALIDE' ? 'Validé' : this.statutDiagnostic === 'TERMINE' ? 'Terminé' : this.statutDiagnostic === 'EN_COURS' ? 'En cours' : 'En attente';
        this.notify(`Diagnostic synchronisé et enregistré (Statut : ${libelle}).`);
      },
      error: () => {
        // Fallback vers update ordre
        this.ordreService.update(this.ordreId, {
          numero: this.loadedOrdre?.numero || '',
          descriptionTravaux: this.loadedOrdre?.descriptionTravaux || '',
          listeDefauts: pannes,
          vehiculeId: this.loadedOrdre?.vehicule?.id || 0
        }).subscribe({
          next: () => {
            this.saving = false;
            const libelle = this.statutDiagnostic === 'VALIDE' ? 'Validé' : this.statutDiagnostic === 'TERMINE' ? 'Terminé' : this.statutDiagnostic === 'EN_COURS' ? 'En cours' : 'En attente';
            this.notify(`Données de diagnostic enregistrées (Statut : ${libelle}).`);
          },
          error: (err) => {
            this.saving = false;
            this.notifyError(err.error?.message || 'Erreur lors de l\'enregistrement.');
          }
        });
      }
    });
  }

  validateStep(): void {
    if (this.statutDiagnostic === 'VALIDE') {
      this.router.navigate(['/app/ordres-reparation', this.ordreId, 'pieces-mo']);
    } else {
      this.marquerValide();
    }
  }

  saveStep2ThenGoNext(): void {
    const pannes = this.composeFromCheckboxes(this.selectedPannes, this.autrePannes);
    this.saving = true;

    const stepDto: DiagnosticStepDto = {
      ordreReparationId: this.ordreId,
      listeDefauts: pannes,
      technicienIds: this.selectedTechniciens,
      statut: 'VALIDE'
    };

    // Synchronisation via POST /api/diagnostics/step puis avancement du workflow
    this.diagnosticService.saveStep(stepDto).subscribe({
      next: (diag) => {
        this.currentDiagnostic = diag;
        this.ordreService.updateStatut(this.ordreId, 'EN_ATTENTE_PIECES_MO').subscribe({
          next: () => {
            this.saving = false;
            this.notify('Diagnostic validé et étapes Pièces & Devis débloquées.');
            this.router.navigate(['/app/ordres-reparation', this.ordreId, 'pieces-mo']);
          },
          error: () => {
            this.saving = false;
            this.router.navigate(['/app/ordres-reparation', this.ordreId, 'pieces-mo']);
          }
        });
      },
      error: () => {
        // Fallback
        this.ordreService.update(this.ordreId, {
          numero: this.loadedOrdre?.numero || '',
          descriptionTravaux: this.loadedOrdre?.descriptionTravaux || '',
          listeDefauts: pannes,
          vehiculeId: this.loadedOrdre?.vehicule?.id || 0
        }).subscribe({
          next: () => {
            this.ordreService.updateStatut(this.ordreId, 'EN_ATTENTE_PIECES_MO').subscribe({
              next: () => {
                this.saving = false;
                this.notify('Diagnostic validé et étapes Pièces & Devis débloquées.');
                this.router.navigate(['/app/ordres-reparation', this.ordreId, 'pieces-mo']);
              },
              error: () => {
                this.saving = false;
                this.router.navigate(['/app/ordres-reparation', this.ordreId, 'pieces-mo']);
              }
            });
          },
          error: (err) => {
            this.saving = false;
            this.notifyError(err.error?.message || 'Erreur lors de la validation du diagnostic.');
          }
        });
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
