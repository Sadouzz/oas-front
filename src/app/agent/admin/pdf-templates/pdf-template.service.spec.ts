import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { environment } from '../../../../environments/environment';
import { PdfTemplateService } from './pdf-template.service';

describe('PdfTemplateService', () => {
  let service: PdfTemplateService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(PdfTemplateService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('filters the global template list by document type', () => {
    service.list('FACTURE').subscribe(templates => expect(templates).toEqual([]));
    const request = http.expectOne(`${environment.apiUrl}/api/pdf-templates?documentType=FACTURE`);
    expect(request.request.method).toBe('GET');
    request.flush([]);
  });

  it('creates a global template with its editable blocks', () => {
    const payload = { name: 'Modèle', documentType: 'FACTURE', documentTypes: ['FACTURE'], layoutKey: 'AVEC_ENTETE', active: false, blocks: [] };
    service.create(payload).subscribe();
    const request = http.expectOne(`${environment.apiUrl}/api/pdf-templates`);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual(payload);
    request.flush({ id: 1, ...payload, version: 1 });
  });
});
