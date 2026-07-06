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
  private auth = inject(AuthService);
  private router = inject(Router);

  protected email = signal('');
  protected password = signal('');
  protected showPassword = signal(false);
  protected loading = signal(false);
  protected error = signal('');

  protected togglePassword(): void {
    this.showPassword.update(v => !v);
  }

  protected async onSubmit(event: Event): Promise<void> {
    event.preventDefault();
    this.error.set('');
    this.loading.set(true);

    try {
      await this.auth.signIn(this.email(), this.password());
      this.router.navigate(['/admin']);
    } catch (err: unknown) {
      this.error.set(err instanceof Error ? err.message : 'Error al iniciar sesión');
    } finally {
      this.loading.set(false);
    }
  }
}
