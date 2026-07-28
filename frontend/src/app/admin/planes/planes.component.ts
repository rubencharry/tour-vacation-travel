import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { CdkDragDrop, CdkDropList, CdkDrag, CdkDragHandle, moveItemInArray } from '@angular/cdk/drag-drop';
import { Plan, PlansService, PromotionType } from '../../core/services/plans.service';
import { AppSelectComponent, SelectOption } from '../../shared/components/app-select/app-select.component';

type SortField = 'displayOrder' | 'price' | 'title' | 'createdAt';
type SortDir = 'asc' | 'desc';

@Component({
  selector: 'app-planes-admin',
  standalone: true,
  imports: [RouterLink, DecimalPipe, FormsModule, AppSelectComponent, CdkDropList, CdkDrag, CdkDragHandle],
  templateUrl: './planes.component.html',
})
export class PlanesAdminComponent implements OnInit {
  private readonly svc = inject(PlansService);

  protected readonly plans = signal<Plan[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal('');
  protected readonly savingOrder = signal(false);

  protected readonly filterSearch = signal('');
  protected readonly filterStatus = signal<'all' | 'active' | 'inactive'>('all');
  protected readonly filterType = signal<'all' | 'internacional' | 'nacional'>('all');

  protected readonly statusOptions: SelectOption[] = [
    { value: 'all', label: 'Todos los estados' },
    { value: 'active', label: 'Activos' },
    { value: 'inactive', label: 'Inactivos' },
  ];

  protected readonly typeOptions: SelectOption[] = [
    { value: 'all', label: 'Todos los tipos' },
    { value: 'internacional', label: 'Internacional' },
    { value: 'nacional', label: 'Nacional' },
  ];
  protected readonly sortBy = signal<SortField>('displayOrder');
  protected readonly sortDir = signal<SortDir>('asc');

  protected readonly filteredPlans = computed(() => {
    let result = [...this.plans()];

    const search = this.filterSearch().toLowerCase().trim();
    if (search) result = result.filter((p) => p.title.toLowerCase().includes(search));

    const status = this.filterStatus();
    if (status === 'active') result = result.filter((p) => p.active);
    else if (status === 'inactive') result = result.filter((p) => !p.active);

    const type = this.filterType();
    if (type !== 'all') result = result.filter((p) => p.planType === type);

    const field = this.sortBy();
    const dir = this.sortDir() === 'asc' ? 1 : -1;
    result.sort((a, b) => {
      switch (field) {
        case 'title':       return dir * a.title.localeCompare(b.title, 'es');
        case 'price':       return dir * (a.price - b.price);
        case 'createdAt':   return dir * a.createdAt.localeCompare(b.createdAt);
        default:            return dir * (a.displayOrder - b.displayOrder);
      }
    });

    return result;
  });

  protected readonly hasActiveFilters = computed(
    () => this.filterSearch() !== '' || this.filterStatus() !== 'all' || this.filterType() !== 'all',
  );

  // El drag solo está activo cuando se muestra el orden natural (sin filtros de texto ni sort alternativo)
  protected readonly dragEnabled = computed(
    () => this.sortBy() === 'displayOrder' && this.sortDir() === 'asc' && !this.filterSearch(),
  );

  ngOnInit(): void {
    this.load();
  }

  private load(): void {
    this.loading.set(true);
    this.svc.getPlans({ limit: 100 }).subscribe({
      next: (res) => { this.plans.set(res.data); this.loading.set(false); },
      error: () => { this.error.set('Error al cargar los planes.'); this.loading.set(false); },
    });
  }

  protected toggleSort(field: SortField): void {
    if (this.sortBy() === field) this.sortDir.update((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { this.sortBy.set(field); this.sortDir.set('asc'); }
  }

  protected clearFilters(): void {
    this.filterSearch.set('');
    this.filterStatus.set('all');
    this.filterType.set('all');
  }

  protected toggleActive(plan: Plan): void {
    this.svc.updatePlan(plan.planId, { active: !plan.active }).subscribe({
      next: (updated) => {
        this.plans.update((list) => list.map((p) => (p.planId === updated.planId ? updated : p)));
      },
      error: () => this.error.set('Error al actualizar el plan.'),
    });
  }

  protected deletePlan(plan: Plan): void {
    if (!confirm(`¿Eliminar el plan "${plan.title}"? Esta acción no se puede deshacer.`)) return;
    this.svc.deletePlan(plan.planId).subscribe({
      next: () => this.plans.update((list) => list.filter((p) => p.planId !== plan.planId)),
      error: () => this.error.set('Error al eliminar el plan.'),
    });
  }

  protected onDrop(event: CdkDragDrop<Plan[]>): void {
    if (event.previousIndex === event.currentIndex) return;

    const reordered = [...this.filteredPlans()];
    moveItemInArray(reordered, event.previousIndex, event.currentIndex);

    // Asigna displayOrder consecutivo (1-based) según la nueva posición
    const updated = reordered.map((p, i) => ({ ...p, displayOrder: i + 1 }));

    // Aplica el nuevo orden a la lista maestra
    this.plans.update((all) => {
      const orderMap = new Map(updated.map((p) => [p.planId, p.displayOrder]));
      return all.map((p) => orderMap.has(p.planId) ? { ...p, displayOrder: orderMap.get(p.planId)! } : p);
    });

    this.persistOrder(updated);
  }

  private persistOrder(plans: Plan[]): void {
    this.savingOrder.set(true);
    this.error.set('');

    let pending = plans.length;
    let hasError = false;

    plans.forEach((p) => {
      this.svc.updatePlan(p.planId, { displayOrder: p.displayOrder }).subscribe({
        next: () => {
          pending--;
          if (pending === 0 && !hasError) this.savingOrder.set(false);
        },
        error: () => {
          hasError = true;
          this.savingOrder.set(false);
          this.error.set('Error al guardar el orden. Recarga la página para ver el estado real.');
        },
      });
    });
  }

  protected promoDisplay(plan: Plan): { label: string; icon: string; color: string; bg: string } | null {
    if (!plan.promotion?.active) return null;
    const { type, label } = plan.promotion;
    const shortLabel = label.length > 14 ? `${label.slice(0, 13)}…` : label;
    const map: Record<PromotionType, { label: string; icon: string; color: string; bg: string }> = {
      dos_x_uno:       { label: '2 × 1',       icon: '🎯', color: '#92400e', bg: '#fef3c7' },
      precio_especial: { label: 'Precio esp.',  icon: '💰', color: '#065f46', bg: '#d1fae5' },
      cupos_limitados: { label: 'Cupos lim.',   icon: '🔥', color: '#991b1b', bg: '#fee2e2' },
      texto_libre:     { label: shortLabel,     icon: '✨', color: '#9a3412', bg: '#fef0eb' },
    };
    return map[type as PromotionType] ?? map.texto_libre;
  }
}
