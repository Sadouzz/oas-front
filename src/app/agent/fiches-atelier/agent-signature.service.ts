import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@env/environment';

export interface AgentSignatureResponse {
  configured: boolean;
  signatureBase64: string;
}

@Injectable({ providedIn: 'root' })
export class AgentSignatureService {
  private http = inject(HttpClient);
  private api = `${environment.apiUrl}/api/users/me/signature-fiche-atelier`;

  getMine(): Observable<AgentSignatureResponse> {
    return this.http.get<AgentSignatureResponse>(this.api);
  }

  saveMine(signatureBase64: string): Observable<{ configured: boolean; message: string }> {
    return this.http.put<{ configured: boolean; message: string }>(this.api, { signatureBase64 });
  }

  deleteMine(): Observable<void> {
    return this.http.delete<void>(this.api);
  }
}
