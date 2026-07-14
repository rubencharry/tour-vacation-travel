import { Component, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { map, catchError, of, startWith } from 'rxjs';
import { Plan, PlansService } from '../../core/services/plans.service';
import { ScrollRevealDirective } from '../../shared/directives/scroll-reveal.directive';
import { RouterLink } from '@angular/router';
import { PlanCardComponent } from '../../shared/components/plan-card/plan-card.component';
import { PlanModalComponent } from '../../shared/components/plan-modal/plan-modal.component';

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [ScrollRevealDirective, RouterLink, PlanCardComponent, PlanModalComponent],
  templateUrl: './landing.component.html',
  styleUrl: './landing.component.scss',
})
export class LandingComponent {
  private plansService = inject(PlansService);

  protected formName = signal('');
  protected formEmail = signal('');
  protected formPhone = signal('');
  protected selectedPlan = signal<Plan | null>(null);

  protected readonly plansState = toSignal(
    this.plansService.getPlans({ active: true, limit: 3 }).pipe(
      map((res) => ({ loading: false, plans: res.data, error: false })),
      startWith({ loading: true, plans: [] as Plan[], error: false }),
      catchError(() => of({ loading: false, plans: [] as Plan[], error: true })),
    ),
    { initialValue: { loading: true, plans: [] as Plan[], error: false } },
  );

  protected readonly stats = [
    { value: '11+', label: 'Años de Experiencia' },
    { value: '50k', label: 'Viajeros Felices' },
    { value: '120', label: 'Destinos' },
    { value: '4.9', label: 'Calificación Promedio' },
  ];

  protected readonly services = [
    { icon: 'flight_takeoff', title: 'Reserva de Vuelos', description: 'Ticketing sin complicaciones y planificación de rutas hacia destinos globales.' },
    { icon: 'hotel', title: 'Alojamientos de Lujo', description: 'Acceso exclusivo a resorts premium y hoteles boutique seleccionados.' },
    { icon: 'map', title: 'Itinerarios a Medida', description: 'Viajes personalizados diseñados según tus preferencias y sueños.' },
    { icon: 'support_agent', title: 'Soporte 24/7', description: 'Asistencia de conserjería dedicada durante todo tu viaje.' },
  ];

  protected readonly benefits = [
    'Asesores de viaje certificados con expertise en destinos específicos.',
    'Alianzas exclusivas que ofrecen beneficios y upgrades VIP.',
    'Precios transparentes sin cargos ocultos.',
    'Seguro de viaje integral y protocolos de seguridad completos.',
  ];

  protected readonly testimonials = [
    {
      quote: 'El nivel de servicio fue extraordinario. Cada detalle de nuestro viaje fue perfectamente diseñado. No tuvimos que preocuparnos por absolutamente nada.',
      name: 'Sarah Jenkins',
      initials: 'SJ',
      package: 'Paquete Explorer Italia',
    },
    {
      quote: 'Nuestras vacaciones familiares fueron un sueño hecho realidad. Los guías privados eran increíblemente conocedores y amables. ¡Totalmente recomendado!',
      name: 'Michael Ross',
      initials: 'MR',
      package: 'Tour Cultural Japón',
    },
    {
      quote: 'Usé muchas agencias de viaje, pero Tour Vacation Travel se destaca por sus beneficios exclusivos en hoteles y su trato genuinamente personal.',
      name: 'Elena Lowe',
      initials: 'EL',
      package: 'Retiro en Maldivas',
    },
  ];

  protected readonly stars = [1, 2, 3, 4, 5];

  protected formatPrice(price: number, currency: string): string {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }).format(price);
  }

  protected formatDuration(days: number, nights: number): string {
    return `${days} días / ${nights} noches`;
  }

  submitForm(event: Event) {
    event.preventDefault();
    // TODO Fase 5: conectar a POST /api/leads
    console.log('Lead:', { name: this.formName(), email: this.formEmail(), phone: this.formPhone() });
  }
}
