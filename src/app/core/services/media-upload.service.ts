import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, switchMap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { CloudinaryUploadResult, MediaUploadEvent } from '../../shared/models';

interface MediaSignature {
  signature: string;
  timestamp: number;
  apiKey: string;
  cloudName: string;
  folder: string | null;
}

/**
 * Upload de médias (images/vidéos) vers Cloudinary.
 * Le fichier part directement du navigateur vers Cloudinary — jamais par notre serveur — une fois
 * signé par le back (voir MediaController). Utilise XMLHttpRequest plutôt que HttpClient pour cet
 * appel externe : ça évite que l'intercepteur d'auth attache notre JWT interne au domaine Cloudinary,
 * et ça donne la progression d'upload nativement (utile pour les vidéos).
 */
@Injectable({ providedIn: 'root' })
export class MediaUploadService {
  private http = inject(HttpClient);
  private api = `${environment.apiUrl}/api/media`;

  /**
   * @param file   Fichier image ou vidéo à uploader.
   * @param folder Dossier Cloudinary cible, ex: "oas/marketplace", "oas/garage", "oas/demandeRDV/jean-dupont".
   */
  upload(file: File, folder?: string): Observable<MediaUploadEvent> {
    return this.getSignature(folder).pipe(
      switchMap(sig => this.uploadToCloudinary(file, sig)),
    );
  }

  private getSignature(folder?: string): Observable<MediaSignature> {
    const params: Record<string, string> = folder ? { folder } : {};
    return this.http.get<MediaSignature>(`${this.api}/signature`, { params });
  }

  private uploadToCloudinary(file: File, sig: MediaSignature): Observable<MediaUploadEvent> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('api_key', sig.apiKey);
    formData.append('timestamp', String(sig.timestamp));
    formData.append('signature', sig.signature);
    if (sig.folder) formData.append('folder', sig.folder);

    const url = `https://api.cloudinary.com/v1_1/${sig.cloudName}/auto/upload`;

    return new Observable<MediaUploadEvent>(observer => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', url, true);

      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          observer.next({ status: 'progress', progress: Math.round((e.loaded / e.total) * 100) });
        }
      };

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          const body = JSON.parse(xhr.responseText);
          const result: CloudinaryUploadResult = {
            secureUrl: body.secure_url,
            publicId: body.public_id,
            resourceType: body.resource_type,
            format: body.format,
            bytes: body.bytes,
          };
          observer.next({ status: 'done', result });
          observer.complete();
        } else {
          observer.error(new Error(`Échec de l'upload Cloudinary (${xhr.status}) : ${xhr.responseText}`));
        }
      };

      xhr.onerror = () => observer.error(new Error("Échec de l'upload Cloudinary (réseau)."));

      xhr.send(formData);

      return () => xhr.abort();
    });
  }
}
