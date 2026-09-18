import { Routes } from '@angular/router';
import { clientGuard } from '../core/guards/client.guard';
import { staffGuard } from '../core/guards/staff.guard';
import { multiRoleGuard } from '../core/guards/multi-role.guard';

export const AGENT_PORTAL_ROUTES: Routes = [
  { path: 'connexion', redirectTo: '/login', pathMatch: 'full' },
  { path: 'inscription', redirectTo: '/register', pathMatch: 'full' },
  {
    path: '',
    loadComponent: () => import('./layout/layout.component').then(m => m.LayoutComponent),
    canActivate: [staffGuard],
    children: [
        { 
          path: '', 
          redirectTo: 'tableau-de-bord', 
          pathMatch: 'full' 
        },
        {
          path: 'profil',
          loadComponent: () =>
            import('../agent/profil/profil.component').then(m => m.ProfilComponent),
        },
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
          path: 'seuil-alertes',
          loadComponent: () =>
            import('./pieces-detachees/seuil-alertes/seuil-alertes').then(m => m.SeuilAlertes),
        },
        {
          path: 'bons-de-sortie',
          loadComponent: () =>
            import('./bons-de-sortie/bons-de-sortie.component').then(m => m.BonsDeSortieComponent),
        },
        {
          path: 'historique-bs',
          loadComponent: () =>
            import('./bons-de-sortie/historique-bs/historique-bs.component').then(m => m.HistoriqueBsComponent),
        },
        {
          path: 'stock',
          canActivate: [multiRoleGuard(['ROLE_SUPER_AGENT', 'ROLE_MASTER', 'ROLE_AGENT_MAGASIN'])],
          loadComponent: () =>
            import('./pieces-detachees/historique/historique.component').then(m => m.HistoriqueComponent),
        },
        {
          path: 'inventaire',
          canActivate: [multiRoleGuard(['ROLE_SUPER_AGENT', 'ROLE_MASTER', 'ROLE_AGENT_MAGASIN'])],
          loadComponent: () =>
            import('./inventaire/inventaire.component').then(m => m.InventaireComponent),
        },
        {
          path: 'fournisseurs',
          canActivate: [multiRoleGuard(['ROLE_SUPER_AGENT', 'ROLE_MASTER', 'ROLE_AGENT_MAGASIN'])],
          loadComponent: () =>
            import('./fournisseurs/fournisseurs.component').then(m => m.FournisseursComponent),
        },
        {
          path: 'ordres-reparation',
          canActivate: [multiRoleGuard(['ROLE_SUPER_AGENT', 'ROLE_MASTER', 'ROLE_CHEF_ATELIER'])],
          loadComponent: () =>
            import('./ordres-reparation/ordres-reparation.component').then(m => m.OrdresReparationComponent),
        },
        {
          path: 'techniciens',
          canActivate: [multiRoleGuard(['ROLE_SUPER_AGENT', 'ROLE_MASTER', 'ROLE_CHEF_ATELIER'])],
          loadComponent: () =>
            import('./techniciens/techniciens.component').then(m => m.TechniciensComponent),
        },
        {
          path: 'rendezvous',
          canActivate: [multiRoleGuard(['ROLE_SUPER_AGENT', 'ROLE_MASTER', 'ROLE_CHEF_ATELIER', 'ROLE_AGENT'])],
          loadComponent: () =>
            import('./rendezvous/rendezvous.component').then(m => m.RendezVousComponent),
        },
        {
          path: 'notes-prix',
          canActivate: [multiRoleGuard(['ROLE_SUPER_AGENT', 'ROLE_MASTER', 'ROLE_CHEF_ATELIER', 'ROLE_AGENT'])],
          loadComponent: () =>
            import('./notes-prix/notes-prix.component').then(m => m.NotesPrixComponent),
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
            import('./devis-previsionnels/devis-previsionnels.component').then(m => m.DevisPrevisionnelsComponent),
        },
        {
          path: 'bons-commande',
          loadComponent: () =>
            import('./bons-commande/bons-commande.component').then(m => m.BonsCommandeComponent),
        },
        {
          path: 'bons-reception',
          loadComponent: () =>
            import('./bons-reception/bons-reception.component').then(m => m.BonsReceptionComponent),
        },
        {
          path: 'proformas',
          loadComponent: () =>
            import('./proforma/proforma.component').then(m => m.ProformaComponent),
        },
        {
          path: 'factures',
          loadComponent: () =>
            import('./factures/factures.component').then(m => m.FacturesComponent),
        },
        {
          path: 'avoirs-ttc',
          loadComponent: () =>
            import('./avoirs-ttc/avoirs-ttc').then(m => m.AvoirsTtc),
        },
        {
          path: 'avoirs-ht',
          loadComponent: () =>
            import('./avoirs-ht/avoirs-ht').then(m => m.AvoirsHt),
        },
        {
          path: 'gestion-tva',
          loadComponent: () =>
            import('./gestion-tva/gestion-tva.component').then(m => m.GestionTvaComponent),
        },
        {
          path: 'gestion-recu',
          loadComponent: () =>
            import('./gestion-recu/gestion-recu.component').then(m => m.GestionRecuComponent),
        },
        {
          path: 'admin',
          canActivate: [multiRoleGuard(['ROLE_SUPER_AGENT', 'ROLE_MASTER'])],
          children: [
            {
              path: 'users',
              loadComponent: () =>
                import('./admin/users/users.component').then(m => m.UsersComponent),
            },
            {
              path: 'garages',
              loadComponent: () =>
                import('./admin/garages/garages.component').then(m => m.GaragesComponent),
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
              path: 'parametres',
              children: [
                { path: '', redirectTo: 'depots', pathMatch: 'full' },
                {
                  path: 'depots',
                  loadComponent: () =>
                    import('./parametres/depots/depots.component').then(m => m.DepotsComponent),
                },
                {
                  path: 'categories',
                  loadComponent: () =>
                    import('./parametres/categories/categories.component').then(m => m.CategoriesComponent),
                },
                {
                  path: 'fiche-atelier',
                  loadComponent: () =>
                    import('./parametres/fiche-atelier/fiche-atelier-config.component').then(m => m.FicheAtelierConfigComponent),
                },
              ],
            },
          ],
        },
        {
          path: 'fiches-atelier',
          canActivate: [multiRoleGuard(['ROLE_SUPER_AGENT', 'ROLE_MASTER', 'ROLE_CHEF_ATELIER', 'ROLE_AGENT'])],
          loadComponent: () =>
            import('./fiches-atelier/fiches-atelier-list/fiches-atelier-list').then(m => m.FichesAtelierList),
        },
        {
          path: 'fiches-atelier/:id',
          canActivate: [multiRoleGuard(['ROLE_SUPER_AGENT', 'ROLE_MASTER', 'ROLE_CHEF_ATELIER', 'ROLE_AGENT'])],
          loadComponent: () =>
            import('./fiches-atelier/fiche-atelier-details/fiche-atelier-details').then(m => m.FicheAtelierDetails),
        },
        {
          path: 'admin/fiches-atelier/new/:rendezVousId',
          canActivate: [multiRoleGuard(['ROLE_SUPER_AGENT', 'ROLE_MASTER', 'ROLE_CHEF_ATELIER', 'ROLE_AGENT'])],
          loadComponent: () =>
            import('./admin/fiches-atelier/fiches-atelier').then(m => m.FichesAtelier),
        },
      ],
    },
];
