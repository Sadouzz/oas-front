import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../../../environments/environment';

export type PdfBlockKind = 'heading' | 'text' | 'image' | 'divider' | 'table';
export interface PdfBlock { id: string; kind: PdfBlockKind; content: string; align: 'left' | 'center' | 'right'; width: string; fontSize?: number; color?: string; backgroundColor?: string; columnWidths?: string; tableStyle?: string; verticalAlign?: string; padding?: number; headerRow?: boolean; dataSource?: string; positionMode?: 'flow' | 'absolute'; offsetX?: number; offsetY?: number; }
export interface PdfTemplate { id: number; name: string; documentType: string; documentTypes?: string[]; layoutKey: string; version: number; active: boolean; blocks: PdfBlock[]; createdAt: string; }
export interface PdfTemplatePayload { name: string; documentType: string; documentTypes: string[]; layoutKey: string; active: boolean; blocks: PdfBlock[]; }

@Injectable({ providedIn: 'root' })
export class PdfTemplateService {
  private http = inject(HttpClient);
  private api = `${environment.apiUrl}/api/pdf-templates`;
  list(documentType?: string) {
    let params = new HttpParams();
    if (documentType) params = params.set('documentType', documentType);
    return this.http.get<PdfTemplate[]>(this.api, { params });
  }
  create(payload: PdfTemplatePayload) { return this.http.post<PdfTemplate>(this.api, payload); }
  revise(id: number, payload: PdfTemplatePayload) { return this.http.put<PdfTemplate>(`${this.api}/${id}`, payload); }
  activate(id: number) { return this.http.post<PdfTemplate>(`${this.api}/${id}/activate`, {}); }
  deactivate(id: number) { return this.http.post<PdfTemplate>(`${this.api}/${id}/deactivate`, {}); }
  preview(payload: PdfTemplatePayload) { return this.http.post(`${this.api}/preview`, payload, { responseType: 'blob' }); }
  activeInvoiceTemplates(layoutKey: string) { return this.http.get<PdfTemplate[]>(`${this.api}/active-invoice`, { params: { layoutKey } }); }
}
