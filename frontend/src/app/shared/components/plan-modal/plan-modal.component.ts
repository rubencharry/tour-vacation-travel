import { Component, EventEmitter, HostListener, inject, Input, OnDestroy, OnInit, Output } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { catchError, of } from 'rxjs';
import { RouterLink } from '@angular/router';
import { Plan } from '../../../core/services/plans.service';
import { PlanServicesService } from '../../../core/services/plan-services.service';

const INCLUSION_EMOJIS: Record<string, string> = {
  vuelo: '✈️',
  hotel: '🏨',
  desayuno: '🍳',
  pension_completa: '🍽️',
  traslados: '🚌',
  guia: '🗺️',
  seguro: '🛡️',
  excursiones: '🎭',
  buceo: '🤿',
  snorkel: '🐠',
  spa: '💆',
  kayak: '🚣',
};

@Component({
  selector: 'app-plan-modal',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './plan-modal.component.html',
})
export class PlanModalComponent implements OnInit, OnDestroy {
  private planServicesService = inject(PlanServicesService);

  @Input({ required: true }) plan!: Plan;
  @Output() closed = new EventEmitter<void>();

  protected readonly services = toSignal(
    this.planServicesService.getAll().pipe(catchError(() => of([]))),
    { initialValue: [] },
  );

  ngOnInit(): void {
    document.body.style.overflow = 'hidden';
  }

  ngOnDestroy(): void {
    document.body.style.overflow = '';
  }

  protected close(): void {
    this.closed.emit();
  }

  @HostListener('document:keydown.escape')
  protected onEscape(): void {
    this.close();
  }

  protected getLabel(id: string): string {
    const found = this.services().find((s) => s.id === id);
    return found?.label ?? id;
  }

  protected getEmoji(id: string): string {
    return INCLUSION_EMOJIS[id] ?? '✔️';
  }

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
