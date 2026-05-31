import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface FicheAtelier {
  id: number;
  numero: string;
  descriptionTravaux: string;
  listeReception: string | null;
  listeDefauts: string | null;
  dateCreation: string;
  dateSortie: string | null;
  vehicule: { id: number; immatriculation: string; marque: string; modele: string } | null;
  mecaniciens: { id: number; nom: string }[];
}

export interface FicheAtelierRequest {
  numero: string;
  descriptionTravaux: string;
  listeReception?: string;
  listeDefauts?: string;
  dateSortie?: string;
  vehiculeId: number;
}

@Injectable({ providedIn: 'root' })
export class FicheAtelierService {
  private api = 'http://localhost:9090/api/fiches-atelier';

  constructor(private http: HttpClient) {}

  getAll(): Observable<FicheAtelier[]> {
    return this.http.get<FicheAtelier[]>(this.api);
  }

  getById(id: number): Observable<FicheAtelier> {
    return this.http.get<FicheAtelier>(`${this.api}/${id}`);
  }

  create(data: FicheAtelierRequest): Observable<FicheAtelier> {
    return this.http.post<FicheAtelier>(`${this.api}/create`, data);
  }

  update(id: number, data: FicheAtelierRequest): Observable<FicheAtelier> {
    return this.http.put<FicheAtelier>(`${this.api}/${id}`, data);
  }

  delete(id: number): Observable<string> {
    return this.http.delete<string>(`${this.api}/${id}`);
  }
}
