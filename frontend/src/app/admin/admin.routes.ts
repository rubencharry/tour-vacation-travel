import { Routes } from '@angular/router';
import { authGuard } from '../core/guards/auth.guard';

export const adminRoutes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./login/login.component').then((m) => m.LoginComponent),
  },
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () => import('./layout/layout.component').then((m) => m.AdminLayoutComponent),
    children: [
      {
        path: '',
        loadComponent: () => import('./dashboard/dashboard.component').then((m) => m.DashboardComponent),
      },
      {
        path: 'planes',
        loadComponent: () => import('./planes/planes.component').then((m) => m.PlanesAdminComponent),
      },
      {
        path: 'planes/nuevo',
        loadComponent: () => import('./planes/plan-form/plan-form.component').then((m) => m.PlanFormComponent),
      },
      {
        path: 'planes/:id/editar',
        loadComponent: () => import('./planes/plan-form/plan-form.component').then((m) => m.PlanFormComponent),
      },
      {
        path: 'leads',
        loadComponent: () => import('./leads/leads.component').then((m) => m.LeadsAdminComponent),
      },
      {
        path: 'proveedores',
        loadComponent: () => import('./proveedores/proveedores.component').then((m) => m.ProveedoresAdminComponent),
      },
    ],
  },
  {
    path: '**',
    redirectTo: 'login',
  },
];
