import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { map, catchError, of } from 'rxjs';
import { ScrollRevealDirective } from '../../shared/directives/scroll-reveal.directive';
import { PlansService } from '../../core/services/plans.service';
import { LeadsService } from '../../core/services/leads.service';

type FormState = 'idle' | 'sending' | 'success' | 'error';

const GENERAL_INQUIRY_PLAN_ID = 'general';

@Component({
  selector: 'app-contacto',
  standalone: true,
  imports: [FormsModule, ScrollRevealDirective],
  templateUrl: './contacto.component.html',
  styleUrl: './contacto.component.scss',
})
export class ContactoComponent {
  private plansService = inject(PlansService);
  private leadsService = inject(LeadsService);

  protected nombre = signal('');
  protected email = signal('');
  protected telefono = signal('');
  protected planId = signal('');
  protected mensaje = signal('');
  protected formState = signal<FormState>('idle');

  protected readonly plans = toSignal(
    this.plansService.getPlans({ active: true, limit: 100 }).pipe(
      map((res) => res.data),
      catchError(() => of([])),
    ),
    { initialValue: [] },
  );

  protected enviarMensaje(): void {
    if (!this.nombre() || !this.email() || !this.mensaje() || this.formState() === 'sending') return;

    this.formState.set('sending');

    this.leadsService
      .createLead({
        name: this.nombre().trim(),
        email: this.email().trim(),
        phone: this.telefono().trim() || undefined,
        interestedPlanId: this.planId() || GENERAL_INQUIRY_PLAN_ID,
        source: 'web',
        message: this.mensaje().trim(),
      })
      .subscribe({
        next: () => {
          this.formState.set('success');
          setTimeout(() => {
            this.nombre.set('');
            this.email.set('');
            this.telefono.set('');
            this.planId.set('');
            this.mensaje.set('');
            this.formState.set('idle');
          }, 3000);
        },
        error: () => this.formState.set('error'),
      });
  }
}
