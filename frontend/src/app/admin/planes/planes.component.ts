import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Plan, PlansService } from '../../core/services/plans.service';
import { AppSelectComponent, SelectOption } from '../../shared/components/app-select/app-select.component';

type SortField = 'displayOrder' | 'price' | 'title' | 'createdAt';
type SortDir = 'asc' | 'desc';

@Component({
  selector: 'app-planes-admin',
  standalone: true,
  imports: [RouterLink, DecimalPipe, FormsModule, AppSelectComponent],
  templateUrl: './planes.component.html',
})
export class PlanesAdminComponent implements OnInit {
  private readonly svc = inject(PlansService);

  protected readonly plans = signal<Plan[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal('');

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
}
