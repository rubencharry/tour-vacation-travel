import { Component, computed, inject, signal } from '@angular/core';
import { catchError, map, of, startWith } from 'rxjs';
import { toSignal } from '@angular/core/rxjs-interop';
import { Plan, PlanType, PlansService } from '../../core/services/plans.service';
import { PlanCardComponent } from '../../shared/components/plan-card/plan-card.component';
import { PlanModalComponent } from '../../shared/components/plan-modal/plan-modal.component';

@Component({
  selector: 'app-planes',
  standalone: true,
  imports: [PlanCardComponent, PlanModalComponent],
  templateUrl: './planes.component.html',
  styleUrl: './planes.component.scss',
})
export class PlanesComponent {
  private plansService = inject(PlansService);

  protected activeFilter = signal<PlanType>('internacional');
  protected searchQuery = signal('');
  protected visibleCount = signal(9);
  protected selectedPlan = signal<Plan | null>(null);
  protected sortBy = signal<'default' | 'price-asc' | 'price-desc'>('default');

  protected readonly allPlansState = toSignal(
    this.plansService.getPlans({ active: true, limit: 100 }).pipe(
      map((res) => ({ loading: false, plans: res.data, error: false })),
      startWith({ loading: true, plans: [] as Plan[], error: false }),
      catchError(() => of({ loading: false, plans: [] as Plan[], error: true })),
    ),
    { initialValue: { loading: true, plans: [] as Plan[], error: false } },
  );

  protected readonly filteredPlans = computed(() => {
    const { plans } = this.allPlansState();
    const type = this.activeFilter();
    const q = this.searchQuery().toLowerCase().trim();
    const sort = this.sortBy();

    const filtered = plans.filter((p) => {
      const matchesType = p.planType === type;
      const matchesSearch =
        !q ||
        p.title.toLowerCase().includes(q) ||
        (p.departureCity ?? '').toLowerCase().includes(q) ||
        (p.description ?? '').toLowerCase().includes(q);
      return matchesType && matchesSearch;
    });

    if (sort === 'price-asc') return [...filtered].sort((a, b) => a.price - b.price);
    if (sort === 'price-desc') return [...filtered].sort((a, b) => b.price - a.price);
    return filtered;
  });

  protected readonly visiblePlans = computed(() =>
    this.filteredPlans().slice(0, this.visibleCount()),
  );

  protected readonly hasMore = computed(
    () => this.visibleCount() < this.filteredPlans().length,
  );

  protected setFilter(type: PlanType): void {
    this.activeFilter.set(type);
    this.visibleCount.set(9);
  }

  protected setSortBy(sort: 'default' | 'price-asc' | 'price-desc'): void {
    this.sortBy.set(sort);
    this.visibleCount.set(9);
  }

  protected loadMore(): void {
    this.visibleCount.update((n) => n + 9);
  }
}
