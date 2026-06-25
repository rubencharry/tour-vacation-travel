import { Component, inject } from '@angular/core';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  template: `
    <div class="flex flex-col items-center justify-center h-screen gap-4">
      <h1 class="font-headline-lg text-headline-lg text-primary">Panel de Administración</h1>
      <p class="text-on-surface-variant">En construcción — Fase 5</p>
      <button
        (click)="auth.signOut()"
        class="px-4 py-2 bg-primary text-on-primary rounded-btn font-label-md text-label-md"
      >
        Cerrar sesión
      </button>
    </div>
  `,
})
export class DashboardComponent {
  protected auth = inject(AuthService);
}
