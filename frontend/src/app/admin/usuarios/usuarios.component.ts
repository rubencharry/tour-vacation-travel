import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService, UserRole } from '../../core/services/auth.service';
import {
  CreateUserPayload,
  User,
  UserStatus,
  UsersService,
} from '../../core/services/users.service';
import { ToastService } from '../../core/services/toast.service';
import { AppSelectComponent, SelectOption } from '../../shared/components/app-select/app-select.component';

type RoleFilter = 'all' | UserRole;
type StatusFilter = 'all' | UserStatus;

const ROLE_LABELS: Record<UserRole, string> = {
  admin: 'Administrador',
  gerente: 'Gerente',
  asesor: 'Asesor',
};

@Component({
  selector: 'app-usuarios-admin',
  standalone: true,
  imports: [FormsModule, ReactiveFormsModule, AppSelectComponent],
  templateUrl: './usuarios.component.html',
})
export class UsuariosAdminComponent implements OnInit {
  private readonly usersSvc = inject(UsersService);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);
  private readonly fb = inject(FormBuilder);

  protected readonly roleLabels = ROLE_LABELS;

  protected readonly users = signal<User[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal('');

  protected readonly filterSearch = signal('');
  protected readonly filterRole = signal<RoleFilter>('all');
  protected readonly filterStatus = signal<StatusFilter>('all');

  protected readonly showModal = signal(false);
  protected readonly saving = signal(false);
  protected readonly saveError = signal('');

  protected readonly resetTarget = signal<User | null>(null);
  protected readonly resettingPassword = signal(false);

  protected readonly currentRole = computed(() => this.auth.currentUser().role);
  protected readonly canCreate = computed(() => this.currentRole() === 'admin');

  protected readonly roleOptions: SelectOption[] = [
    { value: 'all', label: 'Todos los roles' },
    { value: 'admin', label: 'Administrador' },
    { value: 'gerente', label: 'Gerente' },
    { value: 'asesor', label: 'Asesor' },
  ];

  protected readonly statusOptions: SelectOption[] = [
    { value: 'all', label: 'Todos los estados' },
    { value: 'active', label: 'Activo' },
    { value: 'inactive', label: 'Inactivo' },
  ];

  protected readonly form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    name: ['', [Validators.required]],
    phone: [''],
    area: [''],
    notes: [''],
  });

  protected readonly filteredUsers = computed(() => {
    let result = [...this.users()];

    const search = this.filterSearch().toLowerCase().trim();
    if (search) {
      result = result.filter(
        (u) =>
          u.name.toLowerCase().includes(search) ||
          u.email.toLowerCase().includes(search),
      );
    }

    const role = this.filterRole();
    if (role !== 'all') result = result.filter((u) => u.role === role);

    const status = this.filterStatus();
    if (status !== 'all') result = result.filter((u) => u.status === status);

    return result.sort((a, b) => a.name.localeCompare(b.name, 'es'));
  });

  protected readonly totalCount = computed(() => this.users().length);
  protected readonly asesoresCount = computed(
    () => this.users().filter((u) => u.role === 'asesor').length,
  );
  protected readonly activeCount = computed(
    () => this.users().filter((u) => u.status === 'active').length,
  );

  ngOnInit(): void {
    this.load();
  }

  private load(): void {
    this.loading.set(true);
    this.usersSvc.getUsers().subscribe({
      next: (data) => {
        this.users.set(data);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Error al cargar los usuarios.');
        this.loading.set(false);
      },
    });
  }

  protected canManage(user: User): boolean {
    const role = this.currentRole();
    if (role === 'admin') return true;
    return role === 'gerente' && user.role === 'asesor';
  }

  protected openAddModal(): void {
    this.saveError.set('');
    this.form.reset({ email: '', name: '', phone: '', area: '', notes: '' });
    this.showModal.set(true);
  }

  protected closeModal(): void {
    this.showModal.set(false);
  }

  protected submitForm(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const value = this.form.getRawValue();
    const payload: CreateUserPayload = {
      email: value.email!,
      name: value.name!,
      phone: value.phone || undefined,
      area: value.area || undefined,
      notes: value.notes || undefined,
    };

    this.saving.set(true);
    this.saveError.set('');

    this.usersSvc.createUser(payload).subscribe({
      next: (user) => {
        this.users.update((list) => [user, ...list]);
        this.saving.set(false);
        this.showModal.set(false);
        this.toast.success(`Asesor creado. Le enviamos las credenciales a ${user.email}.`);
      },
      error: (err) => {
        this.saving.set(false);
        this.saveError.set(
          err?.error?.message ?? 'Error al crear el usuario. Verificá los datos e intentá de nuevo.',
        );
      },
    });
  }

  protected openResetPasswordModal(user: User): void {
    this.resetTarget.set(user);
  }

  protected closeResetPasswordModal(): void {
    if (this.resettingPassword()) return;
    this.resetTarget.set(null);
  }

  protected confirmResetPassword(): void {
    const user = this.resetTarget();
    if (!user) return;

    this.resettingPassword.set(true);
    this.usersSvc.resetPassword(user.userId).subscribe({
      next: () => {
        this.resettingPassword.set(false);
        this.resetTarget.set(null);
        this.toast.success(`Le enviamos una nueva clave temporal a ${user.email}.`);
      },
      error: () => {
        this.resettingPassword.set(false);
        this.toast.error('Error al resetear la contraseña.');
      },
    });
  }

  protected toggleActive(user: User): void {
    const request = user.status === 'active'
      ? this.usersSvc.deactivateUser(user.userId)
      : this.usersSvc.activateUser(user.userId);

    request.subscribe({
      next: (updated) => {
        this.users.update((list) => list.map((u) => (u.userId === updated.userId ? updated : u)));
        this.toast.success(`Usuario ${updated.status === 'active' ? 'activado' : 'desactivado'}.`);
      },
      error: () => this.toast.error('Error al cambiar el estado del usuario.'),
    });
  }

  protected initialsFor(name: string): string {
    return name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2);
  }

  protected formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' });
  }
}
