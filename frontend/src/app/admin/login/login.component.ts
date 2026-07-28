import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
})
export class LoginComponent {
  protected auth = inject(AuthService);
  private router = inject(Router);

  protected email = signal('');
  protected password = signal('');
  protected showPassword = signal(false);
  protected loading = signal(false);
  protected error = signal('');

  protected newPassword = signal('');
  protected confirmPassword = signal('');
  protected newPasswordError = signal('');
  protected newPasswordLoading = signal(false);

  protected togglePassword(): void {
    this.showPassword.update(v => !v);
  }

  protected async onSubmit(event: Event): Promise<void> {
    event.preventDefault();
    this.error.set('');
    this.loading.set(true);

    try {
      await this.auth.signIn(this.email(), this.password());
      if (!this.auth.pendingNewPasswordChallenge()) {
        this.router.navigate(['/admin']);
      }
    } catch (err: unknown) {
      this.error.set(err instanceof Error ? err.message : 'Error al iniciar sesión');
    } finally {
      this.loading.set(false);
    }
  }

  protected async onSubmitNewPassword(event: Event): Promise<void> {
    event.preventDefault();
    this.newPasswordError.set('');

    if (this.newPassword() !== this.confirmPassword()) {
      this.newPasswordError.set('Las contraseñas no coinciden.');
      return;
    }
    if (this.newPassword().length < 8) {
      this.newPasswordError.set('La contraseña debe tener al menos 8 caracteres.');
      return;
    }

    this.newPasswordLoading.set(true);
    try {
      await this.auth.completeNewPassword(this.newPassword());
      this.router.navigate(['/admin']);
    } catch (err: unknown) {
      this.newPasswordError.set(
        err instanceof Error ? err.message : 'No se pudo cambiar la contraseña',
      );
    } finally {
      this.newPasswordLoading.set(false);
    }
  }
}
