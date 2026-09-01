import { Component, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MediaUploaderComponent } from '../shared/components/media-uploader/media-uploader.component';
import { CloudinaryUploadResult } from '../shared/models';

interface UploadedItem extends CloudinaryUploadResult {
  copied: boolean;
}

/**
 * Écran temporaire, totalement indépendant du reste de l'app (pas de layout, pas de menu),
 * accessible via /pourajouterlesimages. Sert juste à uploader des images/vidéos vers Cloudinary
 * et récupérer leurs URLs à coller où besoin. À supprimer une fois qu'on aura des écrans dédiés
 * (produits marketplace, photos garage, etc.).
 */
@Component({
  selector: 'app-temp-media-upload',
  standalone: true,
  imports: [CommonModule, FormsModule, MediaUploaderComponent],
  changeDetection: ChangeDetectionStrategy.Eager,
  templateUrl: './temp-media-upload.component.html',
})
export class TempMediaUploadComponent {
  folder = 'oas/temp';
  items: UploadedItem[] = [];

  onUploaded(result: CloudinaryUploadResult, uploader: MediaUploaderComponent): void {
    this.items.unshift({ ...result, copied: false });
    // On remet la zone d'upload à zéro pour pouvoir enchaîner sans devoir cliquer sur la croix.
    setTimeout(() => uploader.clear(), 800);
  }

  copy(item: UploadedItem): void {
    navigator.clipboard.writeText(item.secureUrl);
    item.copied = true;
    setTimeout(() => item.copied = false, 1500);
  }
}
