import { Routes } from '@angular/router';
import { LoginComponent } from './gestion/auth/login/login.component';
import { RegisterComponent } from './gestion/auth/register/register.component';
import { ForbiddenComponent } from './gestion/auth/forbidden/forbidden.component';
import { LayoutComponent } from './gestion/layout/layout.component';
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
    path: 'espace-client',
    loadChildren: () => import('./client-portal/client-portal.routes').then(m => m.CLIENT_PORTAL_ROUTES),
  },

  {
    path: 'espace-technicien',
    loadChildren: () => import('./espace-technicien/technicien-portal.routes').then(m => m.TECHNICIEN_PORTAL_ROUTES),
  },

  {
    path: 'gestion',
    component: LayoutComponent,
    canActivate: [staffGuard],
    children: [
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./gestion/dashboard/dashboard.component').then(m => m.DashboardComponent),
      },
      {
        path: 'clients',
        loadComponent: () =>
          import('./gestion/clients/clients.component').then(m => m.ClientsComponent),
      },
      {
        path: 'vehicules',
        loadComponent: () =>
          import('./gestion/vehicules/vehicules.component').then(m => m.VehiculesComponent),
      },
      {
        path: 'pieces-detachees',
        loadComponent: () =>
          import('./gestion/pieces-detachees/pieces-detachees.component').then(m => m.PiecesDetacheesComponent),
      },
      {
        path: 'seuil-alertes',
        loadComponent: () =>
          import('./gestion/seuil-alertes/seuil-alertes').then(m => m.SeuilAlertes),
      },
      {
        path: 'bons-de-sortie',
        loadComponent: () =>
          import('./gestion/bons-de-sortie/bons-de-sortie.component').then(m => m.BonsDeSortieComponent),
      },
      {
        path: 'historique-bs',
        loadComponent: () =>
          import('./gestion/historique-bs/historique-bs.component').then(m => m.HistoriqueBsComponent),
      },
      {
        path: 'stock',
        canActivate: [multiRoleGuard(['ROLE_SUPER_AGENT', 'ROLE_MASTER', 'ROLE_AGENT_MAGASIN'])],
        loadComponent: () =>
          import('./gestion/stock/stock.component').then(m => m.StockComponent),
      },
      {
        path: 'inventaire',
        canActivate: [multiRoleGuard(['ROLE_SUPER_AGENT', 'ROLE_MASTER', 'ROLE_AGENT_MAGASIN'])],
        loadComponent: () =>
          import('./gestion/inventaire/inventaire.component').then(m => m.InventaireComponent),
      },
      {
        path: 'fournisseurs',
        canActivate: [multiRoleGuard(['ROLE_SUPER_AGENT', 'ROLE_MASTER', 'ROLE_AGENT_MAGASIN'])],
        loadComponent: () =>
          import('./gestion/fournisseurs/fournisseurs.component').then(m => m.FournisseursComponent),
      },
      {
        path: 'ordres-reparation',
        canActivate: [multiRoleGuard(['ROLE_SUPER_AGENT', 'ROLE_MASTER', 'ROLE_CHEF_ATELIER'])],
        loadComponent: () =>
          import('./gestion/ordres-reparation/ordres-reparation.component').then(m => m.OrdresReparationComponent),
      },
      {
        path: 'techniciens',
        canActivate: [multiRoleGuard(['ROLE_SUPER_AGENT', 'ROLE_MASTER', 'ROLE_CHEF_ATELIER'])],
        loadComponent: () =>
          import('./gestion/techniciens/techniciens.component').then(m => m.TechniciensComponent),
      },
      {
        path: 'rendezvous',
        canActivate: [multiRoleGuard(['ROLE_SUPER_AGENT', 'ROLE_MASTER', 'ROLE_CHEF_ATELIER', 'ROLE_AGENT'])],
        loadComponent: () =>
          import('./gestion/rendezvous/rendezvous.component').then(m => m.RendezVousComponent),
      },
      {
        path: 'devis-previsionnels',
        canActivate: [multiRoleGuard(['ROLE_SUPER_AGENT', 'ROLE_MASTER', 'ROLE_CHEF_ATELIER'])],
        loadComponent: () =>
          import('./gestion/devis-previsionnels/devis-previsionnels.component').then(m => m.DevisPrevisionnelsComponent),
      },
      {
        path: 'bons-commande',
        loadComponent: () =>
          import('./gestion/bons-commande/bons-commande.component').then(m => m.BonsCommandeComponent),
      },
      {
        path: 'bons-livraison',
        loadComponent: () =>
          import('./gestion/bons-livraison/bons-livraison.component').then(m => m.BonsLivraisonComponent),
      },
      {
        path: 'proformas',
        loadComponent: () =>
          import('./gestion/proformas/proformas.component').then(m => m.ProformasComponent),
      },
      {
        path: 'factures',
        loadComponent: () =>
          import('./gestion/factures/factures.component').then(m => m.FacturesComponent),
      },
      {
        path: 'avoirs-ttc',
        loadComponent: () =>
          import('./gestion/avoirs-ttc/avoirs-ttc').then(m => m.AvoirsTtc),
      },
      {
        path: 'avoirs-ht',
        loadComponent: () =>
          import('./gestion/avoirs-ht/avoirs-ht').then(m => m.AvoirsHt),
      },
      {
        path: 'notes-prix',
        loadComponent: () =>
          import('./gestion/notes-prix/notes-prix.component').then(m => m.NotesPrixComponent),
      },
      {
        path: 'gestion-tva',
        loadComponent: () =>
          import('./gestion/gestion-tva/gestion-tva.component').then(m => m.GestionTvaComponent),
      },
      {
        path: 'gestion-recu',
        loadComponent: () =>
          import('./gestion/gestion-recu/gestion-recu.component').then(m => m.GestionRecuComponent),
      },
      {
        path: 'admin',
        canActivate: [multiRoleGuard(['ROLE_SUPER_AGENT', 'ROLE_MASTER'])],
        children: [
          {
            path: 'users',
            loadComponent: () =>
              import('./gestion/admin/users/users.component').then(m => m.UsersComponent),
          },
          {
            path: 'garages',
            loadComponent: () =>
              import('./gestion/admin/garages/garages.component').then(m => m.GaragesComponent),
          },
          {
            path: 'history',
            loadComponent: () =>
              import('./gestion/admin/history/history.component').then(m => m.HistoryComponent),
          },
          {
            path: 'main-doeuvre',
            loadComponent: () =>
              import('./gestion/main-doeuvre/main-doeuvre.component').then(m => m.MainDoeuvreComponent),
          },
          {
            path: 'parametres',
            loadComponent: () =>
              import('./gestion/parametres/parametres.component').then(m => m.ParametresComponent),
          },
        ],
      },
      {
        path: 'fiches-atelier',
        canActivate: [multiRoleGuard(['ROLE_SUPER_AGENT', 'ROLE_MASTER', 'ROLE_CHEF_ATELIER', 'ROLE_AGENT'])],
        loadComponent: () =>
          import('./gestion/fiches-atelier-list/fiches-atelier-list').then(m => m.FichesAtelierList),
      },
      {
        path: 'fiches-atelier/:id',
        canActivate: [multiRoleGuard(['ROLE_SUPER_AGENT', 'ROLE_MASTER', 'ROLE_CHEF_ATELIER', 'ROLE_AGENT'])],
        loadComponent: () =>
          import('./gestion/fiche-atelier-details/fiche-atelier-details').then(m => m.FicheAtelierDetails),
      },
      {
        path: 'admin/fiches-atelier/new/:rendezVousId',
        canActivate: [multiRoleGuard(['ROLE_SUPER_AGENT', 'ROLE_MASTER', 'ROLE_CHEF_ATELIER', 'ROLE_AGENT'])],
        loadComponent: () =>
          import('./gestion/admin/fiches-atelier/fiches-atelier').then(m => m.FichesAtelier),
      },
    ],
  },

  { path: '**', redirectTo: '' },
];
