import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { User, UsersService } from '../../core/services/users.service';
import { ToastService } from '../../core/services/toast.service';
import { UserRole } from '../../core/services/auth.service';

const ROLE_LABELS: Record<UserRole, string> = {
  admin: 'Administrador',
  gerente: 'Gerente',
  asesor: 'Asesor',
};

@Component({
  selector: 'app-perfil',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './perfil.component.html',
})
export class PerfilComponent implements OnInit {
  private readonly usersSvc = inject(UsersService);
  private readonly toast = inject(ToastService);
  private readonly fb = inject(FormBuilder);

  protected readonly roleLabels = ROLE_LABELS;
  protected readonly profile = signal<User | null>(null);
  protected readonly loading = signal(true);
  protected readonly error = signal('');
  protected readonly saving = signal(false);

  protected readonly form = this.fb.group({
    name: ['', [Validators.required]],
    phone: [''],
  });

  protected readonly initials = computed(() => {
    const name = this.profile()?.name ?? '';
    return name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2);
  });

  ngOnInit(): void {
    this.usersSvc.getMe().subscribe({
      next: (user) => {
        this.profile.set(user);
        this.form.reset({ name: user.name, phone: user.phone ?? '' });
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Error al cargar tu perfil.');
        this.loading.set(false);
      },
    });
  }

  protected submitForm(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const value = this.form.getRawValue();
    this.saving.set(true);

    this.usersSvc
      .updateMe({ name: value.name!, phone: value.phone || undefined })
      .subscribe({
        next: (user) => {
          this.profile.set(user);
          this.saving.set(false);
          this.toast.success('Perfil actualizado correctamente.');
        },
        error: () => {
          this.saving.set(false);
          this.toast.error('Error al actualizar tu perfil.');
        },
      });
  }
}
