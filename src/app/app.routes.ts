import { Routes } from '@angular/router';
import { LoginComponent } from './auth/login/login.component';
import { RegisterComponent } from './auth/register/register.component';
import { ForbiddenComponent } from './auth/forbidden/forbidden.component';
import { LayoutComponent } from './agent/layout/layout.component';
import { roleGuard } from './core/guards/role.guard';
import { multiRoleGuard } from './core/guards/multi-role.guard';
import { noAuthGuard } from './core/guards/no-auth.guard';
import { staffGuard } from './core/guards/staff.guard';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./public/layout/public-layout/public-layout').then(m => m.PublicLayout),
    children: [
      { path: '', loadComponent: () => import('./public/home/home').then(m => m.Home) },
      { path: 'services', loadComponent: () => import('./public/services/services').then(m => m.Services) },
      { path: 'services/:slug', loadComponent: () => import('./public/services/service-detail').then(m => m.ServiceDetail) },
      { path: 'realisations', loadComponent: () => import('./public/realisations/realisations').then(m => m.Realisations) },
      { path: 'blog', loadComponent: () => import('./public/blog/blog').then(m => m.Blog) },
      { path: 'blog/:id', loadComponent: () => import('./public/blog/blog-detail').then(m => m.BlogDetailComponent) },
      { path: 'a-propos', loadComponent: () => import('./public/about/about').then(m => m.About) },
      // { path: 'devis', loadComponent: () => import('. /public/devis/devis').then(m => m.Devis) },
      { path: 'marketplace', loadComponent: () => import('./public/marketplace/marketplace').then(m => m.Marketplace) },
      {
        path: 'contact',
        loadComponent: () =>
          import('./public/contact/contact').then(m => m.ContactComponent),
      },
      {
        path: 'rdv',
        loadComponent: () =>
          import('./public/rdv/rdv').then(m => m.RdvComponent),
      },
      { path: 'partenaires', loadComponent: () => import('./public/partenaires/partenaires').then(m => m.Partenaires) },
      { path: 'mentions-legales', loadComponent: () => import('./public/legal/mentions-legales').then(m => m.MentionsLegalesComponent) },
      { path: 'confidentialite', loadComponent: () => import('./public/legal/confidentialite').then(m => m.ConfidentialiteComponent) },
      { path: 'cookies', loadComponent: () => import('./public/legal/cookies').then(m => m.CookiesComponent) },
    ]
  },
  {
    path: 'pourajouterlesimages',
    loadComponent: () =>
      import('./temp-media-upload/temp-media-upload.component').then(m => m.TempMediaUploadComponent),
  },

  { path: 'login', component: LoginComponent, canActivate: [noAuthGuard] },
  { path: 'register', component: RegisterComponent, canActivate: [noAuthGuard] },
  { path: 'forbidden', component: ForbiddenComponent },

  {
    path: 'client',
    loadChildren: () => import('./client/client-portal.routes').then(m => m.CLIENT_PORTAL_ROUTES),
  },

  {
    path: 'technicien',
    loadChildren: () => import('./technicien/technicien-portal.routes').then(m => m.TECHNICIEN_PORTAL_ROUTES),
  },

  {
    path: 'agent',
    component: LayoutComponent,
    canActivate: [staffGuard],
    children: [
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./agent/dashboard/dashboard.component').then(m => m.DashboardComponent),
      },
      {
        path: 'clients',
        loadComponent: () =>
          import('./agent/clients/clients.component').then(m => m.ClientsComponent),
      },
      {
        path: 'vehicules',
        loadComponent: () =>
          import('./agent/vehicules/vehicules.component').then(m => m.VehiculesComponent),
      },
      {
        path: 'pieces-detachees',
        loadComponent: () =>
          import('./agent/pieces-detachees/pieces-detachees.component').then(m => m.PiecesDetacheesComponent),
      },
      {
        path: 'seuil-alertes',
        loadComponent: () =>
          import('./agent/pieces-detachees/seuil-alertes/seuil-alertes').then(m => m.SeuilAlertes),
      },
      {
        path: 'bons-de-sortie',
        loadComponent: () =>
          import('./agent/bons-de-sortie/bons-de-sortie.component').then(m => m.BonsDeSortieComponent),
      },
      {
        path: 'historique-bs',
        loadComponent: () =>
          import('./agent/bons-de-sortie/historique-bs/historique-bs.component').then(m => m.HistoriqueBsComponent),
      },
      {
        path: 'stock',
        canActivate: [multiRoleGuard(['ROLE_SUPER_AGENT', 'ROLE_MASTER', 'ROLE_AGENT_MAGASIN'])],
        loadComponent: () =>
          import('./agent/pieces-detachees/historique/historique.component').then(m => m.HistoriqueComponent),
      },
      {
        path: 'inventaire',
        canActivate: [multiRoleGuard(['ROLE_SUPER_AGENT', 'ROLE_MASTER', 'ROLE_AGENT_MAGASIN'])],
        loadComponent: () =>
          import('./agent/inventaire/inventaire.component').then(m => m.InventaireComponent),
      },
      {
        path: 'fournisseurs',
        canActivate: [multiRoleGuard(['ROLE_SUPER_AGENT', 'ROLE_MASTER', 'ROLE_AGENT_MAGASIN'])],
        loadComponent: () =>
          import('./agent/fournisseurs/fournisseurs.component').then(m => m.FournisseursComponent),
      },
      {
        path: 'ordres-reparation',
        canActivate: [multiRoleGuard(['ROLE_SUPER_AGENT', 'ROLE_MASTER', 'ROLE_CHEF_ATELIER'])],
        loadComponent: () =>
          import('./agent/ordres-reparation/ordres-reparation.component').then(m => m.OrdresReparationComponent),
      },
      {
        path: 'techniciens',
        canActivate: [multiRoleGuard(['ROLE_SUPER_AGENT', 'ROLE_MASTER', 'ROLE_CHEF_ATELIER'])],
        loadComponent: () =>
          import('./agent/techniciens/techniciens.component').then(m => m.TechniciensComponent),
      },
      {
        path: 'rendezvous',
        canActivate: [multiRoleGuard(['ROLE_SUPER_AGENT', 'ROLE_MASTER', 'ROLE_CHEF_ATELIER', 'ROLE_AGENT'])],
        loadComponent: () =>
          import('./agent/rendezvous/rendezvous.component').then(m => m.RendezVousComponent),
      },
      {
        path: 'notes-prix',
        canActivate: [multiRoleGuard(['ROLE_SUPER_AGENT', 'ROLE_MASTER', 'ROLE_CHEF_ATELIER', 'ROLE_AGENT'])],
        loadComponent: () =>
          import('./agent/notes-prix/notes-prix.component').then(m => m.NotesPrixComponent),
      },
      {
        path: 'notes-de-prix',
        redirectTo: 'notes-prix',
        pathMatch: 'full',
      },
      {
        path: 'devis-previsionnels',
        canActivate: [multiRoleGuard(['ROLE_SUPER_AGENT', 'ROLE_MASTER', 'ROLE_CHEF_ATELIER'])],
        loadComponent: () =>
          import('./agent/devis-previsionnels/devis-previsionnels.component').then(m => m.DevisPrevisionnelsComponent),
      },
      {
        path: 'devis',
        canActivate: [multiRoleGuard(['ROLE_SUPER_AGENT', 'ROLE_MASTER', 'ROLE_CHEF_ATELIER', 'ROLE_AGENT'])],
        loadComponent: () =>
          import('./agent/devis-previsionnels/devis-previsionnels.component').then(m => m.DevisPrevisionnelsComponent),
      },
      {
        path: 'bons-commande',
        loadComponent: () =>
          import('./agent/bons-commande/bons-commande.component').then(m => m.BonsCommandeComponent),
      },
      {
        path: 'bons-reception',
        loadComponent: () =>
          import('./agent/bons-reception/bons-reception.component').then(m => m.BonsReceptionComponent),
      },
      {
        path: 'proformas',
        loadComponent: () =>
          import('./agent/proforma/proforma.component').then(m => m.ProformaComponent),
      },
      {
        path: 'factures',
        loadComponent: () =>
          import('./agent/factures/factures.component').then(m => m.FacturesComponent),
      },
      {
        path: 'avoirs-ttc',
        loadComponent: () =>
          import('./agent/avoirs-ttc/avoirs-ttc').then(m => m.AvoirsTtc),
      },
      {
        path: 'avoirs-ht',
        loadComponent: () =>
          import('./agent/avoirs-ht/avoirs-ht').then(m => m.AvoirsHt),
      },
      {
        path: 'notes-prix',
        loadComponent: () =>
          import('./agent/notes-prix/notes-prix.component').then(m => m.NotesPrixComponent),
      },
      {
        path: 'gestion-tva',
        loadComponent: () =>
          import('./agent/gestion-tva/gestion-tva.component').then(m => m.GestionTvaComponent),
      },
      {
        path: 'gestion-recu',
        loadComponent: () =>
          import('./agent/gestion-recu/gestion-recu.component').then(m => m.GestionRecuComponent),
      },
      {
        path: 'admin',
        canActivate: [multiRoleGuard(['ROLE_SUPER_AGENT', 'ROLE_MASTER'])],
        children: [
          {
            path: 'users',
            loadComponent: () =>
              import('./agent/admin/users/users.component').then(m => m.UsersComponent),
          },
          {
            path: 'garages',
            loadComponent: () =>
              import('./agent/admin/garages/garages.component').then(m => m.GaragesComponent),
          },
          {
            path: 'history',
            loadComponent: () =>
              import('./agent/admin/history/history.component').then(m => m.HistoryComponent),
          },
          {
            path: 'main-doeuvre',
            loadComponent: () =>
              import('./agent/main-doeuvre/main-doeuvre.component').then(m => m.MainDoeuvreComponent),
          },
          {
            path: 'parametres',
            loadComponent: () =>
              import('./agent/parametres/parametres.component').then(m => m.ParametresComponent),
          },
        ],
      },
      {
        path: 'fiches-atelier',
        canActivate: [multiRoleGuard(['ROLE_SUPER_AGENT', 'ROLE_MASTER', 'ROLE_CHEF_ATELIER', 'ROLE_AGENT'])],
        loadComponent: () =>
          import('./agent/fiches-atelier/fiches-atelier-list/fiches-atelier-list').then(m => m.FichesAtelierList),
      },
      {
        path: 'fiches-atelier/:id',
        canActivate: [multiRoleGuard(['ROLE_SUPER_AGENT', 'ROLE_MASTER', 'ROLE_CHEF_ATELIER', 'ROLE_AGENT'])],
        loadComponent: () =>
          import('./agent/fiches-atelier/fiche-atelier-details/fiche-atelier-details').then(m => m.FicheAtelierDetails),
      },
      {
        path: 'admin/fiches-atelier/new/:rendezVousId',
        canActivate: [multiRoleGuard(['ROLE_SUPER_AGENT', 'ROLE_MASTER', 'ROLE_CHEF_ATELIER', 'ROLE_AGENT'])],
        loadComponent: () =>
          import('./agent/admin/fiches-atelier/fiches-atelier').then(m => m.FichesAtelier),
      },
    ],
  },

  { path: '**', redirectTo: '' },
];
