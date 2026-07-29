import { Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet, NavigationEnd, NavigationStart, NavigationCancel, NavigationError } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { filter, map, startWith } from 'rxjs';
import { AuthService, UserRole } from '../../core/services/auth.service';
import { NotificationsService } from '../../core/services/notifications.service';
import { ToastComponent } from '../../shared/components/toast/toast.component';

interface NavItem {
  path: string;
  label: string;
  icon: string;
  exact?: boolean;
  roles?: UserRole[];
}

const ROLE_LABELS: Record<UserRole, string> = {
  admin: 'Administrador',
  gerente: 'Gerente',
  asesor: 'Asesor',
};

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, ToastComponent],
  templateUrl: './layout.component.html',
})
export class AdminLayoutComponent {
  protected readonly auth = inject(AuthService);
  protected readonly notifications = inject(NotificationsService);
  private readonly router = inject(Router);

  protected readonly showNotifications = signal(false);

  private readonly allMainNavItems: NavItem[] = [
    { path: '/admin', label: 'Dashboard', icon: 'dashboard', exact: true },
    { path: '/admin/planes', label: 'Planes', icon: 'map' },
    { path: '/admin/leads', label: 'Leads', icon: 'group' },
  ];

  private readonly allSettingsNavItems: NavItem[] = [
    { path: '/admin/proveedores', label: 'Proveedores', icon: 'handshake' },
    { path: '/admin/usuarios', label: 'Usuarios', icon: 'manage_accounts', roles: ['admin', 'gerente'] },
    { path: '/admin/perfil', label: 'Mi perfil', icon: 'person' },
  ];

  protected readonly mainNavItems = computed(() =>
    this.allMainNavItems.filter((item) => this.isVisible(item)),
  );

  protected readonly settingsNavItems = computed(() =>
    this.allSettingsNavItems.filter((item) => this.isVisible(item)),
  );

  private readonly allNavItems = [...this.allMainNavItems, ...this.allSettingsNavItems];

  protected readonly pageTitle = toSignal(
    this.router.events.pipe(
      filter((e) => e instanceof NavigationEnd),
      map(() => this.resolveTitle()),
      startWith(this.resolveTitle()),
    ),
    { initialValue: 'Dashboard' },
  );

  protected readonly navigating = toSignal(
    this.router.events.pipe(
      filter((e) => e instanceof NavigationStart || e instanceof NavigationEnd || e instanceof NavigationCancel || e instanceof NavigationError),
      map((e) => e instanceof NavigationStart),
    ),
    { initialValue: false },
  );

  protected get initials(): string {
    return this.auth.currentUser().name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2);
  }

  protected get roleLabel(): string {
    const role = this.auth.currentUser().role;
    return role ? ROLE_LABELS[role] : 'Usuario';
  }

  protected toggleNotifications(): void {
    this.showNotifications.update((v) => !v);
  }

  protected closeNotifications(): void {
    this.showNotifications.set(false);
  }

  protected markNotificationsSeen(): void {
    this.notifications.markAllSeen();
    this.closeNotifications();
  }

  protected timeAgo(iso: string): string {
    const minutes = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
    if (minutes < 1) return 'recién';
    if (minutes < 60) return `hace ${minutes} min`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `hace ${hours} h`;
    return `hace ${Math.floor(hours / 24)} d`;
  }

  protected get today(): string {
    return new Date().toLocaleDateString('es-CO', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }

  private isVisible(item: NavItem): boolean {
    if (!item.roles) return true;
    const role = this.auth.currentUser().role;
    return !!role && item.roles.includes(role);
  }

  private resolveTitle(): string {
    const url = this.router.url.split('?')[0];
    const item = this.allNavItems.find((n) => url === n.path || (!n.exact && url.startsWith(n.path)));
    return item?.label ?? 'Dashboard';
  }
}
