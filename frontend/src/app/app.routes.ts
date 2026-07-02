import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    loadComponent: () =>
      import('./sections/landing/landing.component').then((m) => m.LandingComponent),
  },
  {
    path: 'planes',
    loadComponent: () =>
      import('./sections/planes/planes.component').then((m) => m.PlanesComponent),
  },
  {
    path: 'admin',
    loadChildren: () =>
      import('./admin/admin.routes').then((m) => m.adminRoutes),
  },
  {
    path: '**',
    redirectTo: '',
  },
];
