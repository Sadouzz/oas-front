import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class GarageContextService {
  private readonly STORAGE_KEY = 'oas_active_garage_id';
  
  private activeGarageIdSubject = new BehaviorSubject<number | null>(this.getStoredGarageId());
  public activeGarageId$ = this.activeGarageIdSubject.asObservable();

  constructor() {}

  private getStoredGarageId(): number | null {
    const stored = localStorage.getItem(this.STORAGE_KEY);
    return stored ? parseInt(stored, 10) : null;
  }

  public getActiveGarageId(): number | null {
    return this.activeGarageIdSubject.value;
  }

  public enterGarage(garageId: number, garageName?: string): void {
    localStorage.setItem(this.STORAGE_KEY, garageId.toString());
    if (garageName) {
      localStorage.setItem(this.STORAGE_KEY + '_name', garageName);
    }
    this.activeGarageIdSubject.next(garageId);
  }

  public leaveGarage(): void {
    localStorage.removeItem(this.STORAGE_KEY);
    localStorage.removeItem(this.STORAGE_KEY + '_name');
    this.activeGarageIdSubject.next(null);
  }

  public getActiveGarageName(): string | null {
    return localStorage.getItem(this.STORAGE_KEY + '_name');
  }
}

