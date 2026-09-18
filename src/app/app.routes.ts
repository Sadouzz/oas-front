import { Routes } from '@angular/router';
import { LoginComponent } from './auth/login/login.component';
import { RegisterComponent } from './auth/register/register.component';
import { ForbiddenComponent } from './auth/forbidden/forbidden.component';
import { noAuthGuard } from './core/guards/no-auth.guard';

export const routes: Routes = [
  {
    path: 'agent',
    redirectTo: 'app',
    pathMatch: 'prefix',
  },

  {
    path: 'client',
    redirectTo: 'mon-compte',
    pathMatch: 'prefix',
  },

  {
    path: '',
    loadComponent: () => import('./public/layout/public-layout/public-layout').then(m => m.PublicLayout),
    children: [
      { 
        path: '', 
        loadComponent: () => import('./public/home/home').then(m => m.Home) 
      },
      { 
        path: 'services', 
        loadComponent: () => import('./public/services/services').then(m => m.Services) 
      },
      { 
        path: 'services/:slug', 
        loadComponent: () => import('./public/services/service-detail').then(m => m.ServiceDetail) 
      },
      { 
        path: 'realisations', 
        loadComponent: () => import('./public/realisations/realisations').then(m => m.Realisations) 
      },
      { 
        path: 'blog', 
        loadComponent: () => import('./public/blog/blog').then(m => m.Blog) 
      },
      { 
        path: 'blog/:id', 
        loadComponent: () => import('./public/blog/blog-detail').then(m => m.BlogDetailComponent) 
      },
      { 
        path: 'a-propos', 
        loadComponent: () => import('./public/about/about').then(m => m.About) 
      },
      // { path: 'devis', loadComponent: () => import('. /public/devis/devis').then(m => m.Devis) },
      { 
        path: 'marketplace', 
        loadComponent: () => import('./public/marketplace/marketplace').then(m => m.Marketplace) 
      },
      {
        path: 'contact',
        loadComponent: () =>
          import('./public/contact/contact').then(m => m.Contact),
      },
      {
        path: 'prendre-rdv',
        loadComponent: () =>
          import('./public/rdv/rdv').then(m => m.Rdv),
      },
      {
        path: 'simulateur-devis',
        loadComponent: () =>
          import('./public/devis/devis').then(m => m.Devis),
      },
      {
        path: 'nos-partenaires',
        loadComponent: () =>
          import('./public/partenaires/partenaires').then(m => m.Partenaires),
      },
      {
        path: 'mentions-legales',
        loadComponent: () =>
          import('./public/mentions-legales/mentions-legales').then(m => m.MentionsLegales),
      },
    ],
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
    path: 'mon-compte',
    loadChildren: () => import('./client/client-portal.routes').then(m => m.CLIENT_PORTAL_ROUTES),
  },
  
  {
    path: 'technicien',
    loadChildren: () => import('./technicien/technicien-portal.routes').then(m => m.TECHNICIEN_PORTAL_ROUTES),
  },

  {
    path: 'app',
    loadChildren: () => import('./agent/agent-portal.routes').then(m => m.AGENT_PORTAL_ROUTES),
  },

  { path: '**', redirectTo: '' },
];
