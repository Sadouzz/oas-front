import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { FiscalConfiguration } from './fiscal-configuration.model';

@Injectable({ providedIn: 'root' })
export class FiscalConfigurationService {
  private http = inject(HttpClient);
  private api = `${environment.apiUrl}/api/fiscal-configuration`;

  getCurrent() { return this.http.get<FiscalConfiguration>(this.api); }
  update(config: FiscalConfiguration) { return this.http.put<FiscalConfiguration>(this.api, config); }
}
