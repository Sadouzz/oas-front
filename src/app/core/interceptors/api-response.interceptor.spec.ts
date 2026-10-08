import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { apiResponseInterceptor } from './api-response.interceptor';

describe('apiResponseInterceptor', () => {
  let httpClient: HttpClient;
  let httpTesting: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(withInterceptors([apiResponseInterceptor])), provideHttpClientTesting()]
    });
    httpClient = TestBed.inject(HttpClient);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpTesting.verify());

  it('unwraps the API envelope for the VAPID public key as a string', () => {
    let receivedKey: string | undefined;
    httpClient.get<string>('/api/push/public-key').subscribe(key => receivedKey = key);

    httpTesting.expectOne('/api/push/public-key').flush({
      status: 200,
      success: true,
      message: 'OK',
      data: 'BElongPublicKey'
    });

    expect(receivedKey).toBe('BElongPublicKey');
  });
});
