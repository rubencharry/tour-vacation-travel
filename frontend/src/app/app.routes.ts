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
    path: 'nosotros',
    loadComponent: () =>
      import('./sections/nosotros/nosotros.component').then((m) => m.NosotrosComponent),
  },
  {
    path: 'contacto',
    loadComponent: () =>
      import('./sections/contacto/contacto.component').then((m) => m.ContactoComponent),
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
