import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Lead, LeadsService } from '../../core/services/leads.service';
import { Plan, PlansService } from '../../core/services/plans.service';
import { ToastService } from '../../core/services/toast.service';
import { AppSelectComponent, SelectOption } from '../../shared/components/app-select/app-select.component';

type EmailStatusFilter = 'all' | 'sent' | 'pending';
type DateRangeFilter = 'all' | '7d' | '30d';
type ModalMode = 'create' | 'edit' | 'duplicate';

@Component({
  selector: 'app-leads-admin',
  standalone: true,
  imports: [FormsModule, ReactiveFormsModule, AppSelectComponent],
  templateUrl: './leads.component.html',
})
export class LeadsAdminComponent implements OnInit {
  private readonly leadsSvc = inject(LeadsService);
  private readonly plansSvc = inject(PlansService);
  private readonly toast = inject(ToastService);
  private readonly fb = inject(FormBuilder);

  protected readonly leads = signal<Lead[]>([]);
  protected readonly plansById = signal<Record<string, Plan>>({});
  protected readonly loading = signal(true);
  protected readonly error = signal('');

  protected readonly filterSearch = signal('');
  protected readonly filterPlanId = signal('all');
  protected readonly filterDateRange = signal<DateRangeFilter>('all');
  protected readonly filterEmailStatus = signal<EmailStatusFilter>('all');

  protected readonly selectedIds = signal<Set<string>>(new Set());
  protected readonly expandedId = signal<string | null>(null);
  protected readonly page = signal(1);
  protected readonly pageSize = 20;

  protected readonly showModal = signal(false);
  protected readonly modalMode = signal<ModalMode>('create');
  protected readonly editingLeadId = signal<string | null>(null);
  protected readonly saving = signal(false);
  protected readonly saveError = signal('');

  protected readonly modalTitle = computed(() => {
    switch (this.modalMode()) {
      case 'edit': return 'Editar Lead';
      case 'duplicate': return 'Duplicar Lead';
      default: return 'Agregar Lead';
    }
  });

  protected readonly addForm = this.fb.group({
    name: ['', [Validators.required]],
    email: ['', [Validators.required, Validators.email]],
    phone: [''],
    interestedPlanId: ['', [Validators.required]],
    source: ['Alta manual'],
    message: [''],
  });

  protected readonly dateRangeOptions: SelectOption[] = [
    { value: 'all', label: 'Todas las fechas' },
    { value: '7d', label: 'Últimos 7 días' },
    { value: '30d', label: 'Últimos 30 días' },
  ];

  protected readonly emailStatusOptions: SelectOption[] = [
    { value: 'all', label: 'Email: Todos' },
    { value: 'sent', label: 'Email: Enviado' },
    { value: 'pending', label: 'Email: Pendiente' },
  ];

  protected readonly planOptions = computed<SelectOption[]>(() => [
    { value: 'all', label: 'Todos los planes' },
    ...Object.values(this.plansById()).map((p) => ({ value: p.planId, label: p.title })),
  ]);

  protected readonly totalCount = computed(() => this.leads().length);
  protected readonly sentCount = computed(() => this.leads().filter((l) => l.emailSent).length);
  protected readonly pendingCount = computed(() => this.totalCount() - this.sentCount());

  protected readonly filteredLeads = computed(() => {
    let result = [...this.leads()];

    const search = this.filterSearch().toLowerCase().trim();
    if (search) {
      result = result.filter(
        (l) => l.name.toLowerCase().includes(search) || l.email.toLowerCase().includes(search),
      );
    }

    const planId = this.filterPlanId();
    if (planId !== 'all') result = result.filter((l) => l.interestedPlanId === planId);

    const status = this.filterEmailStatus();
    if (status === 'sent') result = result.filter((l) => l.emailSent);
    else if (status === 'pending') result = result.filter((l) => !l.emailSent);

    const range = this.filterDateRange();
    if (range !== 'all') {
      const days = range === '7d' ? 7 : 30;
      const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
      result = result.filter((l) => new Date(l.createdAt).getTime() >= cutoff);
    }

    return result.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  });

  protected readonly hasActiveFilters = computed(
    () =>
      this.filterSearch() !== '' ||
      this.filterPlanId() !== 'all' ||
      this.filterDateRange() !== 'all' ||
      this.filterEmailStatus() !== 'all',
  );

  protected readonly totalPages = computed(() => Math.max(1, Math.ceil(this.filteredLeads().length / this.pageSize)));

  protected readonly pageNumbers = computed(() => Array.from({ length: this.totalPages() }, (_, i) => i + 1));

  protected readonly pagedLeads = computed(() => {
    const start = (this.page() - 1) * this.pageSize;
    return this.filteredLeads().slice(start, start + this.pageSize);
  });

  protected readonly rangeEnd = computed(() => Math.min(this.page() * this.pageSize, this.filteredLeads().length));

  protected readonly selectedCount = computed(() => this.selectedIds().size);

  protected readonly allOnPageSelected = computed(() => {
    const page = this.pagedLeads();
    return page.length > 0 && page.every((l) => this.selectedIds().has(l.leadId));
  });

  ngOnInit(): void {
    this.load();
  }

  private load(): void {
    this.loading.set(true);
    this.plansSvc.getPlans({ limit: 100 }).subscribe({
      next: (res) => this.plansById.set(Object.fromEntries(res.data.map((p) => [p.planId, p]))),
    });
    this.leadsSvc.getLeads().subscribe({
      next: (data) => { this.leads.set(data); this.loading.set(false); },
      error: () => { this.error.set('Error al cargar los leads.'); this.loading.set(false); },
    });
  }

  protected planFor(lead: Lead): Plan | undefined {
    return this.plansById()[lead.interestedPlanId];
  }

  protected initialsFor(name: string): string {
    return name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2);
  }

  protected formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString('es-CO', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  protected clearFilters(): void {
    this.filterSearch.set('');
    this.filterPlanId.set('all');
    this.filterDateRange.set('all');
    this.filterEmailStatus.set('all');
  }

  protected toggleExpand(lead: Lead): void {
    this.expandedId.update((id) => (id === lead.leadId ? null : lead.leadId));
  }

  protected toggleSelect(lead: Lead): void {
    this.selectedIds.update((set) => {
      const next = new Set(set);
      if (next.has(lead.leadId)) next.delete(lead.leadId);
      else next.add(lead.leadId);
      return next;
    });
  }

  protected toggleSelectAllOnPage(): void {
    const page = this.pagedLeads();
    const allSelected = this.allOnPageSelected();
    this.selectedIds.update((set) => {
      const next = new Set(set);
      for (const l of page) {
        if (allSelected) next.delete(l.leadId);
        else next.add(l.leadId);
      }
      return next;
    });
  }

  protected goToPage(p: number): void {
    if (p < 1 || p > this.totalPages()) return;
    this.page.set(p);
  }

  protected openAddModal(): void {
    this.modalMode.set('create');
    this.editingLeadId.set(null);
    this.addForm.reset({ name: '', email: '', phone: '', interestedPlanId: '', source: 'Alta manual', message: '' });
    this.saveError.set('');
    this.showModal.set(true);
  }

  protected openEditModal(lead: Lead): void {
    this.modalMode.set('edit');
    this.editingLeadId.set(lead.leadId);
    this.addForm.reset({
      name: lead.name,
      email: lead.email,
      phone: lead.phone ?? '',
      interestedPlanId: lead.interestedPlanId,
      source: lead.source ?? '',
      message: lead.message ?? '',
    });
    this.saveError.set('');
    this.showModal.set(true);
  }

  protected openDuplicateModal(lead: Lead): void {
    this.modalMode.set('duplicate');
    this.editingLeadId.set(null);
    this.addForm.reset({
      name: lead.name,
      email: '',
      phone: lead.phone ?? '',
      interestedPlanId: lead.interestedPlanId,
      source: lead.source ?? '',
      message: lead.message ?? '',
    });
    this.saveError.set('');
    this.showModal.set(true);
  }

  protected closeModal(): void {
    this.showModal.set(false);
  }

  protected isInvalid(field: string): boolean {
    const control = this.addForm.get(field);
    return !!control && control.invalid && (control.dirty || control.touched);
  }

  protected submitLeadForm(): void {
    if (this.addForm.invalid) {
      this.addForm.markAllAsTouched();
      return;
    }
    const value = this.addForm.getRawValue();
    const payload = {
      name: value.name!,
      email: value.email!,
      phone: value.phone || undefined,
      interestedPlanId: value.interestedPlanId!,
      source: value.source || undefined,
      message: value.message || undefined,
    };

    this.saving.set(true);
    this.saveError.set('');

    const editingId = this.editingLeadId();
    const request = editingId
      ? this.leadsSvc.updateLead(editingId, payload)
      : this.leadsSvc.createLead(payload);

    request.subscribe({
      next: (lead) => {
        const alreadyInList = this.leads().some((l) => l.leadId === lead.leadId);
        this.leads.update((list) =>
          alreadyInList
            ? list.map((l) => (l.leadId === lead.leadId ? lead : l))
            : [lead, ...list],
        );
        this.saving.set(false);
        this.showModal.set(false);

        if (!editingId && alreadyInList) {
          this.toast.info('Ya existía un lead con ese email y plan (dentro de la última hora); no se creó uno nuevo.');
        } else {
          this.toast.success(editingId ? 'Lead actualizado correctamente.' : 'Lead agregado correctamente.');
        }
      },
      error: () => {
        this.saving.set(false);
        this.saveError.set('Error al guardar el lead.');
      },
    });
  }

  protected deleteLead(lead: Lead): void {
    if (!confirm(`¿Eliminar el lead de "${lead.name}"? Esta acción no se puede deshacer.`)) return;
    this.leadsSvc.deleteLead(lead.leadId).subscribe({
      next: () => {
        this.leads.update((list) => list.filter((l) => l.leadId !== lead.leadId));
        this.selectedIds.update((set) => {
          const next = new Set(set);
          next.delete(lead.leadId);
          return next;
        });
        this.toast.success('Lead eliminado.');
      },
      error: () => this.toast.error('Error al eliminar el lead.'),
    });
  }

  protected exportCsv(onlySelected = false): void {
    const source = onlySelected
      ? this.leads().filter((l) => this.selectedIds().has(l.leadId))
      : this.filteredLeads();
    if (source.length === 0) {
      this.toast.error(onlySelected ? 'Los leads seleccionados ya no están disponibles para exportar.' : 'No hay leads para exportar.');
      return;
    }

    const headers = ['Nombre', 'Email', 'Teléfono', 'Plan de interés', 'Origen', 'Mensaje', 'Fecha', 'Email enviado'];
    const rows = source.map((l) => [
      l.name,
      l.email,
      l.phone ?? '',
      this.planFor(l)?.title ?? l.interestedPlanId,
      l.source ?? '',
      l.message ?? '',
      l.createdAt,
      l.emailSent ? 'Sí' : 'No',
    ]);

    // Neutraliza CSV/formula injection: un campo que empiece con estos caracteres
    // puede ser interpretado como fórmula por Excel/Sheets al abrir el archivo.
    const RISKY_LEADING_CHARS = ['=', '+', '-', '@', '\t', '\r'];
    const sanitize = (v: string) => (RISKY_LEADING_CHARS.includes(v[0]) ? `'${v}` : v);
    const escape = (v: string) => `"${sanitize(v).replace(/"/g, '""')}"`;
    const csv = [headers, ...rows].map((row) => row.map((c) => escape(String(c))).join(',')).join('\r\n');

    const blob = new Blob([`﻿${csv}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `leads-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }
}
