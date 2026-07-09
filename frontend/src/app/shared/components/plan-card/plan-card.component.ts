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
}
