import { Component, EventEmitter, inject, Input, Output } from '@angular/core';
import { MediaUploadService } from '../../../core/services/media-upload.service';
import { CloudinaryUploadResult } from '../../models';

/**
 * Zone d'upload réutilisable (image ou vidéo) vers Cloudinary : clic ou glisser-déposer,
 * aperçu, barre de progression. Émet l'URL Cloudinary une fois l'upload terminé.
 *
 * Exemple :
 *   <app-media-uploader
 *     folder="oas/marketplace"
 *     [previewUrl]="produit.mediaUrl"
 *     (uploaded)="produit.mediaUrl = $event.secureUrl" />
 */
@Component({
  selector: 'app-media-uploader',
  standalone: true,
  templateUrl: './media-uploader.component.html',
})
export class MediaUploaderComponent {
  @Input() folder?: string;
  @Input() accept = 'image/*,video/*';
  @Input() label = 'Cliquez ou glissez un fichier ici';
  @Input() previewUrl: string | null = null;

  @Output() uploaded = new EventEmitter<CloudinaryUploadResult>();
  @Output() removed = new EventEmitter<void>();

  private mediaUploadService = inject(MediaUploadService);

  uploading = false;
  progress = 0;
  errorMessage = '';
  dragOver = false;

  get isVideo(): boolean {
    return /\.(mp4|mov|webm|avi)$/i.test(this.previewUrl ?? '');
  }

  onFileSelected(e: Event): void {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) this.startUpload(file);
    input.value = '';
  }

  onDrop(e: DragEvent): void {
    e.preventDefault();
    this.dragOver = false;
    const file = e.dataTransfer?.files?.[0];
    if (file) this.startUpload(file);
  }

  onDragOver(e: DragEvent): void {
    e.preventDefault();
    this.dragOver = true;
  }

  onDragLeave(): void {
    this.dragOver = false;
  }

  private startUpload(file: File): void {
    this.uploading = true;
    this.progress = 0;
    this.errorMessage = '';

    this.mediaUploadService.upload(file, this.folder).subscribe({
      next: event => {
        if (event.status === 'progress') {
          this.progress = event.progress;
        } else {
          this.uploading = false;
          this.previewUrl = event.result.secureUrl;
          this.uploaded.emit(event.result);
        }
      },
      error: () => {
        this.uploading = false;
        this.errorMessage = "Échec de l'upload. Réessayez.";
      },
    });
  }

  clear(): void {
    this.previewUrl = null;
    this.errorMessage = '';
    this.removed.emit();
  }
}
