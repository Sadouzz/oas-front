import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { environment } from '../../../environments/environment';
import { VehicleTransferService } from './vehicle-transfer.service';

describe('VehicleTransferService', () => {
  let service: VehicleTransferService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(VehicleTransferService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('loads pending transfer requests from the review endpoint', () => {
    service.pending().subscribe(requests => expect(requests).toEqual([]));
    const request = http.expectOne(`${environment.apiUrl}/api/vehicle-transfers/pending`);
    expect(request.request.method).toBe('GET');
    request.flush([]);
  });

  it('submits the selected approval decision and note', () => {
    service.decide(17, true, 'Documents vérifiés').subscribe();
    const request = http.expectOne(`${environment.apiUrl}/api/vehicle-transfers/17/decision`);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ approved: true, decisionNote: 'Documents vérifiés' });
    request.flush({ id: 17 });
  });
});
