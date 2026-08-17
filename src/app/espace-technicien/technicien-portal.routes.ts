import { Routes } from '@angular/router';
import { technicienGuard } from './guards/technicien.guard';

export const TECHNICIEN_PORTAL_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./layout/technicien-layout.component').then(m => m.TechnicienLayoutComponent),
    canActivate: [technicienGuard],
    children: [
      { path: '', redirectTo: 'ordres-reparation', pathMatch: 'full' },
      {
        path: 'ordres-reparation',
        loadComponent: () => import('./ordres/technicien-ordres-list.component').then(m => m.TechnicienOrdresListComponent),
      },
      {
        path: 'ordres-reparation/:id',
        loadComponent: () => import('./ordres/technicien-ordre-detail.component').then(m => m.TechnicienOrdreDetailComponent),
      },
    ],
  },
];
