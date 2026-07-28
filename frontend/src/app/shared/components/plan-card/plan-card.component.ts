import { Component, EventEmitter, Input, Output } from '@angular/core';
import { Plan } from '../../../core/services/plans.service';

@Component({
  selector: 'app-plan-card',
  standalone: true,
  templateUrl: './plan-card.component.html',
})
export class PlanCardComponent {
  @Input({ required: true }) plan!: Plan;
  @Input() showTypeBadge = false;
  @Input() editorial = false;
  @Output() selected = new EventEmitter<void>();

  protected imgError = false;

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

  protected ribbonLabel(): string {
    const map: Record<string, string> = {
      dos_x_uno:       '2 × 1',
      precio_especial: 'OFERTA',
      cupos_limitados: 'LIMITADO',
      texto_libre:     'PROMO',
    };
    return map[this.plan.promotion?.type ?? ''] ?? 'PROMO';
  }

  protected ribbonBg(): string {
    const map: Record<string, string> = {
      dos_x_uno:       '#f59e0b',
      precio_especial: '#059669',
      cupos_limitados: '#dc2626',
      texto_libre:     '#c46b48',
    };
    return map[this.plan.promotion?.type ?? ''] ?? '#c46b48';
  }

  protected ribbonTextColor(): string {
    return this.plan.promotion?.type === 'dos_x_uno' ? '#1a1200' : '#ffffff';
  }
}
