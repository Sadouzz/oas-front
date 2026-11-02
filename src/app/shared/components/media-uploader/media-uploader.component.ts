import { Component, EventEmitter, inject, Input, Output } from '@angular/core';
import { MediaUploadService } from '../../../core/services/media-upload.service';
import { CloudinaryUploadResult } from '../../models';

/**
 * Zone d'upload réutilisable (image ou vidéo) vers Cloudinary : clic ou glisser-déposer,
 * aperçu, barre de progression. Émet l'URL Cloudinary une fois l'upload terminé.
 *
 * Exemple :
 *   <app-media-uploader
 *     folder="oas/temp"
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
  @Input() multiple = false;

  @Output() uploaded = new EventEmitter<CloudinaryUploadResult>();
  @Output() removed = new EventEmitter<void>();

  private mediaUploadService = inject(MediaUploadService);

  uploading = false;
  progress = 0;
  errorMessage = '';
  dragOver = false;

  private uploadQueue: File[] = [];
  private uploadQueueIndex = 0;
  private uploadErrors: string[] = [];

  get isVideo(): boolean {
    return /\.(mp4|mov|webm|avi)$/i.test(this.previewUrl ?? '');
  }

  onFileSelected(e: Event): void {
    const input = e.target as HTMLInputElement;
    const files = Array.from(input.files ?? []);
    if (this.multiple) this.startUploadQueue(files);
    else if (files[0]) this.startUpload(files[0]);
    input.value = '';
  }

  onDrop(e: DragEvent): void {
    e.preventDefault();
    this.dragOver = false;
    const files = Array.from(e.dataTransfer?.files ?? []);
    if (this.multiple) this.startUploadQueue(files);
    else if (files[0]) this.startUpload(files[0]);
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

  private startUploadQueue(files: File[]): void {
    if (this.uploading || files.length === 0) return;
    this.uploadQueue = files;
    this.uploadQueueIndex = 0;
    this.uploadErrors = [];
    this.errorMessage = '';
    this.uploading = true;
    this.uploadNext();
  }

  private uploadNext(): void {
    if (this.uploadQueueIndex >= this.uploadQueue.length) {
      this.uploading = false;
      this.progress = 0;
      this.errorMessage = this.uploadErrors.length > 0
        ? `Échec de l'upload pour : ${this.uploadErrors.join(', ')}`
        : '';
      this.uploadQueue = [];
      return;
    }

    const file = this.uploadQueue[this.uploadQueueIndex];
    this.progress = 0;
    this.mediaUploadService.upload(file, this.folder).subscribe({
      next: event => {
        if (event.status === 'progress') {
          this.progress = event.progress;
        } else {
          this.uploaded.emit(event.result);
          this.uploadQueueIndex++;
          this.uploadNext();
        }
      },
      error: () => {
        this.uploadErrors.push(file.name);
        this.uploadQueueIndex++;
        this.uploadNext();
      },
    });
  }

  clear(): void {
    this.previewUrl = null;
    this.errorMessage = '';
    this.removed.emit();
  }
}
