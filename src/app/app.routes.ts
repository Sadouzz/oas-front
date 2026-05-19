import { Routes } from '@angular/router';
import { LoginComponent } from './auth/login/login.component';
import { RegisterComponent } from './auth/register/register.component';
import { ForbiddenComponent } from './auth/forbidden/forbidden.component';
import { LayoutComponent } from './layout/layout.component';
import { authGuard } from './auth/guards/auth.guard';
import { roleGuard } from './auth/guards/role.guard';

export const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },
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
        ],
      },
    ],
  },

  { path: '**', redirectTo: 'login' },
];
