import { Component, inject, OnInit, ChangeDetectorRef, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { OrdreTravailService } from '../../../ordre-travail.service';
import {
  StepReparationResponseDto,
  StepReparationDto,
  StatutOrdreTravail,
  DocumentOrdreTravailDto,
  TypeDocumentOt
} from '../../../models/ordre-travail.model';
import { AlertComponent } from '../../../../../shared/components/alert/alert.component';
import { MediaUploadService } from '../../../../../core/services/media-upload.service';

interface UploadItemProgress {
  fileName: string;
  progress: number;
  error?: string;
}

@Component({
  selector: 'app-step-reparation',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, AlertComponent],
  templateUrl: './step-reparation.component.html'
})
export class StepReparationComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private otService = inject(OrdreTravailService);
  private mediaUploadService = inject(MediaUploadService);
  private cdr = inject(ChangeDetectorRef);
  private ngZone = inject(NgZone);

  otId!: number;
  data: StepReparationResponseDto | null = null;

  rapportReparation = '';
  dateFinReparation = '';

  // Documents & Photos de réparation
  documents: DocumentOrdreTravailDto[] = [];
  uploadingFiles: UploadItemProgress[] = [];
  isUploading = false;
  dragOver = false;
  selectedPreviewPhoto: DocumentOrdreTravailDto | null = null;
  deletingDocId: number | null = null;

  loading = true;
  saving = false;
  isReparationTerminee = false;
  errorMessage = '';
  successMessage = '';

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
    this.otService.getStepReparation(this.otId).subscribe({
      next: (res) => {
        this.data = res;
        this.rapportReparation = res.rapportReparation || '';
        this.documents = res.documents || res.piecesJointes || [];

        if (res.dateFinReparation) {
          this.dateFinReparation = res.dateFinReparation.substring(0, 16);
        } else {
          const now = new Date();
          now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
          this.dateFinReparation = now.toISOString().slice(0, 16);
        }
        this.isReparationTerminee = res.statut === StatutOrdreTravail.TERMINE;
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.loading = false;
        this.errorMessage = err.error?.message || 'Erreur lors du chargement des réparations.';
        this.cdr.markForCheck();
      }
    });
  }

  // --- Séparation Photos / Documents ---

  get photos(): DocumentOrdreTravailDto[] {
    return this.documents.filter(d => d.type === 'PHOTO' || this.isImageUrl(d.url));
  }

  get otherDocs(): DocumentOrdreTravailDto[] {
    return this.documents.filter(d => d.type !== 'PHOTO' && !this.isImageUrl(d.url));
  }

  isImageUrl(url?: string): boolean {
    if (!url) return false;
    return /\.(jpe?g|png|webp|gif|svg|bmp)(\?.*)?$/i.test(url);
  }

  formatBytes(bytes?: number): string {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'Ko', 'Mo', 'Go'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  detectDocumentType(fileName: string, mimeType?: string): TypeDocumentOt {
    if (mimeType?.startsWith('image/') || /\.(jpe?g|png|webp|gif|svg|bmp)$/i.test(fileName)) {
      return 'PHOTO';
    }
    if (mimeType === 'application/pdf' || /\.pdf$/i.test(fileName)) {
      return 'PDF';
    }
    if (/\.(docx?|odt|txt|xlsx?|csv)$/i.test(fileName)) {
      return 'DOCUMENT';
    }
    return 'AUTRE';
  }

  // --- Gestion du Drag & Drop et Upload ---

  onDragOver(e: DragEvent): void {
    e.preventDefault();
    e.stopPropagation();
    this.dragOver = true;
  }

  onDragLeave(): void {
    this.dragOver = false;
  }

  onDrop(e: DragEvent): void {
    e.preventDefault();
    e.stopPropagation();
    this.dragOver = false;
    const files = e.dataTransfer?.files;
    if (files && files.length > 0) {
      this.handleFiles(Array.from(files));
    }
  }

  onFileSelected(e: Event): void {
    const input = e.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.handleFiles(Array.from(input.files));
      input.value = '';
    }
  }

  private handleFiles(files: File[]): void {
    this.errorMessage = '';
    for (const file of files) {
      this.uploadSingleFile(file);
    }
  }

  private uploadSingleFile(file: File): void {
    const itemProgress: UploadItemProgress = { fileName: file.name, progress: 0 };
    this.uploadingFiles.push(itemProgress);
    this.isUploading = true;
    this.cdr.markForCheck();

    const type = this.detectDocumentType(file.name, file.type);

    // Tentative 1 : Upload direct Cloudinary
    this.mediaUploadService.upload(file, 'oas/ordres-travail/reparation').subscribe({
      next: (event) => {
        this.ngZone.run(() => {
          if (event.status === 'progress') {
            itemProgress.progress = event.progress;
            this.cdr.markForCheck();
          } else if (event.status === 'done') {
            const res = event.result;
            // Enregistrement des métadonnées côté back
            const payload: Partial<DocumentOrdreTravailDto> = {
              nomFichier: file.name,
              url: res.secureUrl,
              type: type,
              taille: res.bytes || file.size,
              publicId: res.publicId,
              etape: 4
            };

            this.otService.addDocumentOt(this.otId, payload).subscribe({
              next: (savedDoc) => {
                this.ngZone.run(() => {
                  this.removeUploadProgress(itemProgress);
                  this.documents.push(savedDoc || payload as DocumentOrdreTravailDto);
                  this.successMessage = `« ${file.name} » ajouté avec succès.`;
                  this.cdr.markForCheck();
                });
              },
              error: () => {
                this.ngZone.run(() => {
                  // Fallback : on garde quand même localement
                  this.removeUploadProgress(itemProgress);
                  this.documents.push(payload as DocumentOrdreTravailDto);
                  this.cdr.markForCheck();
                });
              }
            });
          }
        });
      },
      error: () => {
        // Tentative 2 (Fallback) : Upload direct Multipart via le serveur Spring Boot
        this.otService.uploadDocumentOt(this.otId, file, type).subscribe({
          next: (savedDoc) => {
            this.ngZone.run(() => {
              this.removeUploadProgress(itemProgress);
              this.documents.push(savedDoc);
              this.successMessage = `« ${file.name} » ajouté avec succès.`;
              this.cdr.markForCheck();
            });
          },
          error: (err) => {
            this.ngZone.run(() => {
              itemProgress.error = err.error?.message || 'Échec de l\'upload.';
              this.errorMessage = `Impossible d'uploader ${file.name}.`;
              setTimeout(() => this.removeUploadProgress(itemProgress), 4000);
              this.cdr.markForCheck();
            });
          }
        });
      }
    });
  }

  private removeUploadProgress(item: UploadItemProgress): void {
    const idx = this.uploadingFiles.indexOf(item);
    if (idx !== -1) {
      this.uploadingFiles.splice(idx, 1);
    }
    this.isUploading = this.uploadingFiles.length > 0;
    this.cdr.markForCheck();
  }

  // --- Suppression de document ---

  supprimerDocument(doc: DocumentOrdreTravailDto, event?: Event): void {
    if (event) event.stopPropagation();
    if (!confirm(`Supprimer « ${doc.nomFichier || 'ce document'} » ?`)) return;

    if (doc.id) {
      this.deletingDocId = doc.id;
      this.otService.deleteDocumentOt(this.otId, doc.id).subscribe({
        next: () => {
          this.ngZone.run(() => {
            this.documents = this.documents.filter(d => d.id !== doc.id);
            this.deletingDocId = null;
            this.successMessage = 'Document supprimé.';
            if (this.selectedPreviewPhoto?.id === doc.id) {
              this.selectedPreviewPhoto = null;
            }
            this.cdr.markForCheck();
          });
        },
        error: (err) => {
          this.ngZone.run(() => {
            this.deletingDocId = null;
            this.errorMessage = err.error?.message || 'Erreur lors de la suppression.';
            this.cdr.markForCheck();
          });
        }
      });
    } else {
      this.documents = this.documents.filter(d => d !== doc);
      if (this.selectedPreviewPhoto === doc) {
        this.selectedPreviewPhoto = null;
      }
      this.cdr.markForCheck();
    }
  }

  // --- Clôture et Validation Finale ---

  terminerReparation(): void {
    if (!this.rapportReparation.trim()) {
      this.errorMessage = 'Veuillez saisir un rapport technique détaillant les travaux effectués.';
      return;
    }

    this.saving = true;
    this.errorMessage = '';
    this.successMessage = '';

    const payload: StepReparationDto = {
      rapportReparation: this.rapportReparation,
      dateFinReparation: this.dateFinReparation ? new Date(this.dateFinReparation).toISOString() : new Date().toISOString(),
      statut: StatutOrdreTravail.TERMINE,
      documents: this.documents,
      piecesJointes: this.documents
    };

    this.otService.updateStepReparation(this.otId, payload).subscribe({
      next: (res) => {
        this.saving = false;
        this.isReparationTerminee = true;
        if (this.data) {
          this.data = {
            ...this.data,
            avertissementsBonsDeSortie: res.avertissementsBonsDeSortie ?? [],
            documents: res.documents || this.documents
          };
        }
        this.successMessage = 'Rapport technique et documents validés ! L\'Ordre de Travail est maintenant TERMINE.';
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.saving = false;
        this.errorMessage = err.error?.message || 'Erreur lors de la validation du rapport.';
        this.cdr.markForCheck();
      }
    });
  }
}
