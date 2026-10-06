import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { environment } from '../../../environments/environment';
import { ClientVehiculeService } from './client-vehicule.service';

describe('ClientVehiculeService transfer request', () => {
  let service: ClientVehiculeService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(ClientVehiculeService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('posts the existing vehicle identity and request note for review', () => {
    const payload = { immatriculation: 'DK-123-AA', numeroChassis: 'CH-123', requestNote: 'Véhicule acheté' };
    service.requestTransfer(payload).subscribe();
    const request = http.expectOne(`${environment.apiUrl}/api/vehicle-transfers`);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual(payload);
    request.flush({ id: 3 });
  });
});
