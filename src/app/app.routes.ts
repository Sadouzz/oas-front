import { Routes } from '@angular/router';
import { LoginComponent } from './auth/login/login.component';
import { RegisterComponent } from './auth/register/register.component';
import { ForbiddenComponent } from './auth/forbidden/forbidden.component';
import { LayoutComponent } from './layout/layout.component';
import { authGuard } from './core/guards/auth.guard';
import { roleGuard } from './core/guards/role.guard';
import { multiRoleGuard } from './core/guards/multi-role.guard';
import { noAuthGuard } from './core/guards/no-auth.guard';

export const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: 'login', component: LoginComponent, canActivate: [noAuthGuard] },
  { path: 'register', component: RegisterComponent, canActivate: [noAuthGuard] },
  { path: 'forbidden', component: ForbiddenComponent },

  {
    path: '',
    component: LayoutComponent,
    canActivate: [authGuard],
    children: [
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./dashboard/dashboard.component').then(m => m.DashboardComponent),
      },
      {
        path: 'clients',
        loadComponent: () =>
          import('./clients/clients.component').then(m => m.ClientsComponent),
      },
      {
        path: 'vehicules',
        loadComponent: () =>
          import('./vehicules/vehicules.component').then(m => m.VehiculesComponent),
      },
      {
        path: 'pieces-detachees',
        loadComponent: () =>
          import('./pieces-detachees/pieces-detachees.component').then(m => m.PiecesDetacheesComponent),
      },
      {
        path: 'bons-de-sortie',
        loadComponent: () =>
          import('./bons-de-sortie/bons-de-sortie.component').then(m => m.BonsDeSortieComponent),
      },
      {
        path: 'stock',
        canActivate: [multiRoleGuard(['ROLE_SUPER_AGENT', 'ROLE_AGENT_MAGASIN'])],
        loadComponent: () =>
          import('./stock/stock.component').then(m => m.StockComponent),
      },
      {
        path: 'inventaire',
        canActivate: [multiRoleGuard(['ROLE_SUPER_AGENT', 'ROLE_AGENT_MAGASIN'])],
        loadComponent: () =>
          import('./inventaire/inventaire.component').then(m => m.InventaireComponent),
      },
      {
        path: 'fournisseurs',
        canActivate: [multiRoleGuard(['ROLE_SUPER_AGENT', 'ROLE_AGENT_MAGASIN'])],
        loadComponent: () =>
          import('./fournisseurs/fournisseurs.component').then(m => m.FournisseursComponent),
      },
      {
        path: 'fiches-atelier',
        canActivate: [multiRoleGuard(['ROLE_SUPER_AGENT', 'ROLE_CHEF_ATELIER'])],
        loadComponent: () =>
          import('./fiches-atelier/fiches-atelier.component').then(m => m.FichesAtelierComponent),
      },
      {
        path: 'mecaniciens',
        canActivate: [multiRoleGuard(['ROLE_SUPER_AGENT', 'ROLE_CHEF_ATELIER'])],
        loadComponent: () =>
          import('./mecaniciens/mecaniciens.component').then(m => m.MecaniciensComponent),
      },
      {
        path: 'devis-previsionnels',
        canActivate: [multiRoleGuard(['ROLE_SUPER_AGENT', 'ROLE_CHEF_ATELIER'])],
        loadComponent: () =>
          import('./devis-previsionnels/devis-previsionnels.component').then(m => m.DevisPrevisionnelsComponent),
      },
      {
        path: 'admin',
        canActivate: [roleGuard('ROLE_SUPER_AGENT')],
        children: [
          {
            path: 'users',
            loadComponent: () =>
              import('./admin/users/users.component').then(m => m.UsersComponent),
          },
          {
            path: 'history',
            loadComponent: () =>
              import('./admin/history/history.component').then(m => m.HistoryComponent),
          },
          {
            path: 'main-doeuvre',
            loadComponent: () =>
              import('./main-doeuvre/main-doeuvre.component').then(m => m.MainDoeuvreComponent),
          },
          {
            path: 'garages',
            loadComponent: () =>
              import('./admin/garages/garages.component').then(m => m.GaragesComponent),
          },
        ],
      },
    ],
  },

  { path: '**', redirectTo: 'login' },
];
