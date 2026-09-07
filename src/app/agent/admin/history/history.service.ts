import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { ConnectionHistoryModel } from '../../../shared/models';

export type { ConnectionHistoryModel };

@Injectable({ providedIn: 'root' })
export class HistoryService {
  private http = inject(HttpClient);
  private api = `${environment.apiUrl}/api/connection-history`;

  getAll(params?: import('../../../shared/models').PageParams | string): Observable<any> {
    const queryParams: Record<string, string> = {};
    if (typeof params === 'string') {
      if (params) queryParams['keyword'] = params;
    } else if (params) {
      if (params.page !== undefined) queryParams['page'] = params.page.toString();
      if (params.size !== undefined) queryParams['size'] = params.size.toString();
      if (params.keyword) queryParams['keyword'] = params.keyword;
    }
    return this.http.get<any>(this.api, { params: queryParams });
  }
}
