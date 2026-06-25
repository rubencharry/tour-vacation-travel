import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./sections/landing/landing.component').then((m) => m.LandingComponent),
  },
  {
    path: '**',
    redirectTo: '',
  },
];
