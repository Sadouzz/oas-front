import { inject, Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { CookieService } from './cookie.service';

@Injectable({
  providedIn: 'root'
})
export class GarageContextService {
  private cookieService = inject(CookieService);
  private readonly STORAGE_KEY = 'oas_active_garage_id';
  
  private activeGarageIdSubject = new BehaviorSubject<number | null>(this.getStoredGarageId());
  public activeGarageId$ = this.activeGarageIdSubject.asObservable();

  constructor() {}

  private getStoredGarageId(): number | null {
    const stored = this.cookieService.get(this.STORAGE_KEY) ?? localStorage.getItem(this.STORAGE_KEY);
    return stored ? parseInt(stored, 10) : null;
  }

  public getActiveGarageId(): number | null {
    return this.activeGarageIdSubject.value;
  }

  public enterGarage(garageId: number, garageName?: string): void {
    this.cookieService.set(this.STORAGE_KEY, garageId.toString(), 7);
    localStorage.removeItem(this.STORAGE_KEY);
    if (garageName) {
      this.cookieService.set(this.STORAGE_KEY + '_name', garageName, 7);
      localStorage.removeItem(this.STORAGE_KEY + '_name');
    }
    this.activeGarageIdSubject.next(garageId);
  }

  public leaveGarage(): void {
    this.cookieService.delete(this.STORAGE_KEY);
    this.cookieService.delete(this.STORAGE_KEY + '_name');
    localStorage.removeItem(this.STORAGE_KEY);
    localStorage.removeItem(this.STORAGE_KEY + '_name');
    this.activeGarageIdSubject.next(null);
  }

  public getActiveGarageName(): string | null {
    return this.cookieService.get(this.STORAGE_KEY + '_name') ?? localStorage.getItem(this.STORAGE_KEY + '_name');
  }
}


