import { Component, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet, NavigationEnd } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { filter, map, startWith } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';
import { ToastComponent } from '../../shared/components/toast/toast.component';

interface NavItem {
  path: string;
  label: string;
  icon: string;
  exact?: boolean;
}

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, ToastComponent],
  templateUrl: './layout.component.html',
})
export class AdminLayoutComponent {
  protected readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly mainNavItems: NavItem[] = [
    { path: '/admin', label: 'Dashboard', icon: 'dashboard', exact: true },
    { path: '/admin/planes', label: 'Planes', icon: 'map' },
    { path: '/admin/leads', label: 'Leads', icon: 'group' },
  ];

  protected readonly settingsNavItems: NavItem[] = [
    { path: '/admin/proveedores', label: 'Proveedores', icon: 'handshake' },
    { path: '/admin/configuracion', label: 'Configuración', icon: 'settings' },
  ];

  private readonly allNavItems = [...this.mainNavItems, ...this.settingsNavItems];

  protected readonly pageTitle = toSignal(
    this.router.events.pipe(
      filter((e) => e instanceof NavigationEnd),
      map(() => this.resolveTitle()),
      startWith(this.resolveTitle()),
    ),
    { initialValue: 'Dashboard' },
  );

  protected get initials(): string {
    return this.auth.currentUser().name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2);
  }

  protected get today(): string {
    return new Date().toLocaleDateString('es-CO', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }

  private resolveTitle(): string {
    const url = this.router.url.split('?')[0];
    const item = this.allNavItems.find((n) => url === n.path || (!n.exact && url.startsWith(n.path)));
    return item?.label ?? 'Dashboard';
  }
}
