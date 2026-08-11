import { Routes } from '@angular/router';
import { clientGuard } from './guards/client.guard';
import { clientNoAuthGuard } from './guards/client-no-auth.guard';

export const CLIENT_PORTAL_ROUTES: Routes = [
  {
    path: 'connexion',
    loadComponent: () => import('./auth/client-login/client-login.component').then(m => m.ClientLoginComponent),
    canActivate: [clientNoAuthGuard],
  },
  {
    path: 'inscription',
    loadComponent: () => import('./auth/client-register/client-register.component').then(m => m.ClientRegisterComponent),
    canActivate: [clientNoAuthGuard],
  },
  {
    path: '',
    loadComponent: () => import('./layout/client-layout.component').then(m => m.ClientLayoutComponent),
    canActivate: [clientGuard],
    children: [
      { path: '', redirectTo: 'tableau-de-bord', pathMatch: 'full' },
      {
        path: 'tableau-de-bord',
        loadComponent: () => import('./dashboard-home/dashboard-home.component').then(m => m.DashboardHomeComponent),
      },
      {
        path: 'vehicules',
        loadComponent: () => import('./vehicules/client-vehicules.component').then(m => m.ClientVehiculesComponent),
      },
      {
        path: 'rendez-vous',
        loadComponent: () => import('./rendezvous/client-rendezvous.component').then(m => m.ClientRendezVousComponent),
      },
      {
        path: 'marketplace',
        loadComponent: () => import('./marketplace/client-marketplace.component').then(m => m.ClientMarketplaceComponent),
      },
      {
        path: 'proformas',
        loadComponent: () => import('./proformas/client-proformas.component').then(m => m.ClientProformasComponent),
      },
      {
        path: 'devis',
        loadComponent: () => import('./devis/client-devis.component').then(m => m.ClientDevisComponent),
      },
      {
        path: 'factures',
        loadComponent: () => import('./factures/client-factures.component').then(m => m.ClientFacturesComponent),
      },
      {
        path: 'interventions',
        loadComponent: () => import('./interventions/client-interventions.component').then(m => m.ClientInterventionsComponent),
      },
      {
        path: 'notifications',
        loadComponent: () => import('./notifications/client-notifications.component').then(m => m.ClientNotificationsComponent),
      },
      {
        path: 'profil',
        loadComponent: () => import('./profile/client-profile.component').then(m => m.ClientProfileComponent),
      },
      {
        path: 'parametres',
        loadComponent: () => import('./settings/client-settings.component').then(m => m.ClientSettingsComponent),
      },
    ],
  },
];
