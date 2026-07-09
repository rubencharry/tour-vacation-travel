import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ScrollRevealDirective } from '../../shared/directives/scroll-reveal.directive';

type FormState = 'idle' | 'sending' | 'success' | 'error';

@Component({
  selector: 'app-contacto',
  standalone: true,
  imports: [FormsModule, ScrollRevealDirective],
  templateUrl: './contacto.component.html',
  styleUrl: './contacto.component.scss',
})
export class ContactoComponent {
  protected nombre = signal('');
  protected email = signal('');
  protected telefono = signal('');
  protected mensaje = signal('');
  protected formState = signal<FormState>('idle');

  protected async enviarMensaje(): Promise<void> {
    if (!this.nombre() || !this.email() || !this.mensaje()) return;

    this.formState.set('sending');

    await new Promise((r) => setTimeout(r, 1200));
    this.formState.set('success');

    setTimeout(() => {
      this.nombre.set('');
      this.email.set('');
      this.telefono.set('');
      this.mensaje.set('');
      this.formState.set('idle');
    }, 3000);
  }
}
