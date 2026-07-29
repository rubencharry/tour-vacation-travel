import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import {
  CreateLeadActivityPayload,
  Lead,
  LEAD_SOURCES,
  LEAD_STATUSES,
  LeadsService,
  LeadSource,
  LeadStatus,
  leadSourceLabel,
  leadStatusColorClass,
  leadStatusLabel,
} from '../../core/services/leads.service';
import { Plan, PlansService } from '../../core/services/plans.service';
import { ToastService } from '../../core/services/toast.service';
import { AppSelectComponent, SelectOption } from '../../shared/components/app-select/app-select.component';
import { LeadDetailComponent } from './lead-detail.component';

type DateRangeFilter = 'all' | '7d' | '30d' | 'custom';
type StatusFilter = 'all' | LeadStatus;
type SourceFilter = 'all' | LeadSource;
type ModalMode = 'create' | 'edit' | 'duplicate';
type SortField = 'name' | 'email' | 'plan' | 'status' | 'createdAt';
type SortDirection = 'asc' | 'desc';

@Component({
  selector: 'app-leads-admin',
  standalone: true,
  imports: [FormsModule, ReactiveFormsModule, AppSelectComponent, LeadDetailComponent],
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
  protected readonly filterDateFrom = signal('');
  protected readonly filterDateTo = signal('');
  protected readonly filterStatus = signal<StatusFilter>('all');
  protected readonly filterSource = signal<SourceFilter>('all');

  protected readonly sortField = signal<SortField>('createdAt');
  protected readonly sortDirection = signal<SortDirection>('desc');

  protected readonly selectedIds = signal<Set<string>>(new Set());
  protected readonly selectedLead = signal<Lead | null>(null);
  protected readonly loadingActivities = signal(false);
  protected readonly page = signal(1);
  protected readonly pageSize = 20;

  protected readonly showModal = signal(false);
  protected readonly modalMode = signal<ModalMode>('create');
  protected readonly editingLeadId = signal<string | null>(null);
  protected readonly saving = signal(false);
  protected readonly saveError = signal('');

  protected readonly showCampaignModal = signal(false);
  protected readonly campaignLeadIds = signal<string[]>([]);
  protected readonly campaignPlanId = signal('');
  protected readonly campaignSending = signal(false);
  protected readonly campaignError = signal('');

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
    source: ['manual'],
    message: [''],
  });

  protected readonly dateRangeOptions: SelectOption[] = [
    { value: 'all', label: 'Todas las fechas' },
    { value: '7d', label: 'Últimos 7 días' },
    { value: '30d', label: 'Últimos 30 días' },
    { value: 'custom', label: 'Personalizado...' },
  ];

  protected readonly sourceOptions: SelectOption[] = LEAD_SOURCES;

  protected readonly statusFilterOptions: SelectOption[] = [
    { value: 'all', label: 'Estado: Todos' },
    ...LEAD_STATUSES,
  ];

  protected readonly sourceFilterOptions: SelectOption[] = [
    { value: 'all', label: 'Origen: Todos' },
    ...LEAD_SOURCES,
  ];

  protected readonly leadStatusLabel = leadStatusLabel;
  protected readonly leadSourceLabel = leadSourceLabel;

  protected readonly planOptions = computed<SelectOption[]>(() => [
    { value: 'all', label: 'Todos los planes' },
    ...Object.values(this.plansById()).map((p) => ({ value: p.planId, label: p.title })),
  ]);

  protected readonly campaignLeadCount = computed(() => this.campaignLeadIds().length);

  protected readonly campaignPlan = computed(() => {
    const id = this.campaignPlanId();
    return id ? this.plansById()[id] : undefined;
  });

  protected readonly campaignPlanPromoExpiry = computed(() => {
    const exp = this.campaignPlan()?.promotion?.expiresAt;
    if (!exp) return null;
    return new Date(exp).toLocaleDateString('es-CO', { day: '2-digit', month: 'long', year: 'numeric' });
  });

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

    const status = this.filterStatus();
    if (status !== 'all') result = result.filter((l) => (l.status ?? 'nuevo') === status);

    const source = this.filterSource();
    if (source !== 'all') result = result.filter((l) => l.source === source);

    const range = this.filterDateRange();
    if (range === 'custom') {
      const from = this.filterDateFrom();
      const to = this.filterDateTo();
      if (from) {
        const fromTime = new Date(`${from}T00:00:00`).getTime();
        result = result.filter((l) => new Date(l.createdAt).getTime() >= fromTime);
      }
      if (to) {
        const toTime = new Date(`${to}T23:59:59.999`).getTime();
        result = result.filter((l) => new Date(l.createdAt).getTime() <= toTime);
      }
    } else if (range !== 'all') {
      const days = range === '7d' ? 7 : 30;
      const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
      result = result.filter((l) => new Date(l.createdAt).getTime() >= cutoff);
    }

    const field = this.sortField();
    const dir = this.sortDirection() === 'asc' ? 1 : -1;
    return result.sort((a, b) => {
      let cmp = 0;
      switch (field) {
        case 'name': cmp = a.name.localeCompare(b.name); break;
        case 'email': cmp = a.email.localeCompare(b.email); break;
        case 'plan':
          cmp = (this.planFor(a)?.title ?? a.interestedPlanId).localeCompare(
            this.planFor(b)?.title ?? b.interestedPlanId,
          );
          break;
        case 'status': cmp = leadStatusLabel(a.status).localeCompare(leadStatusLabel(b.status)); break;
        case 'createdAt': cmp = a.createdAt.localeCompare(b.createdAt); break;
      }
      return cmp * dir;
    });
  });

  protected readonly hasActiveFilters = computed(
    () =>
      this.filterSearch() !== '' ||
      this.filterPlanId() !== 'all' ||
      this.filterDateRange() !== 'all' ||
      this.filterStatus() !== 'all' ||
      this.filterSource() !== 'all',
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

  protected toggleSort(field: SortField): void {
    if (this.sortField() === field) {
      this.sortDirection.update((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      this.sortField.set(field);
      this.sortDirection.set(field === 'createdAt' ? 'desc' : 'asc');
    }
  }

  protected sortIcon(field: SortField): string {
    if (this.sortField() !== field) return 'unfold_more';
    return this.sortDirection() === 'asc' ? 'arrow_upward' : 'arrow_downward';
  }

  protected readonly statusBadgeClass = leadStatusColorClass;

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
    this.filterDateFrom.set('');
    this.filterDateTo.set('');
    this.filterStatus.set('all');
    this.filterSource.set('all');
  }

  protected toggleDetail(lead: Lead): void {
    if (this.selectedLead()?.leadId === lead.leadId) {
      this.selectedLead.set(null);
      return;
    }

    this.selectedLead.set(lead);
    this.loadingActivities.set(true);
    this.leadsSvc.getLead(lead.leadId).subscribe({
      next: (full) => {
        this.selectedLead.set(full);
        this.loadingActivities.set(false);
      },
      error: () => {
        this.loadingActivities.set(false);
        this.toast.error('Error al cargar el detalle del lead.');
      },
    });
  }

  protected onStatusChange(status: LeadStatus): void {
    const lead = this.selectedLead();
    if (lead) this.submitActivity(lead.leadId, { type: 'status_changed', status });
  }

  protected onAddNote(note: string): void {
    const lead = this.selectedLead();
    if (lead) this.submitActivity(lead.leadId, { type: 'note', note });
  }

  protected contactWhatsapp(lead: Lead): void {
    if (!lead.phone) return;
    const message = this.buildWhatsappMessage(lead);

    navigator.clipboard?.writeText(message).then(
      () => this.toast.success('Texto copiado al portapapeles.'),
      () => this.toast.error('No se pudo copiar el mensaje al portapapeles.'),
    );
    this.submitActivity(lead.leadId, { type: 'contacted', channel: 'whatsapp' }, false);
  }

  private buildWhatsappMessage(lead: Lead): string {
    const firstName = lead.name.trim().split(' ')[0];
    const planTitle = this.planFor(lead)?.title;
    const planLine = planTitle ? ` en el plan *${planTitle}*` : '';
    return `¡Hola ${firstName}! Te escribo de Tour Vacation Travel 👋. Vi tu interés${planLine} y me encantaría ayudarte a armar el viaje perfecto. ¿Charlamos los detalles?`;
  }

  private submitActivity(leadId: string, payload: CreateLeadActivityPayload, showToast = true): void {
    this.leadsSvc.addActivity(leadId, payload).subscribe({
      next: (updated) => this.applyLeadUpdate(updated, showToast ? 'Traza actualizada.' : undefined),
      error: () => this.toast.error('Error al registrar la actividad.'),
    });
  }

  private applyLeadUpdate(updated: Lead, successMessage?: string): void {
    if (this.selectedLead()?.leadId === updated.leadId) this.selectedLead.set(updated);
    this.leads.update((list) =>
      list.map((l) => (l.leadId === updated.leadId ? { ...l, status: updated.status } : l)),
    );
    if (successMessage) this.toast.success(successMessage);
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
    this.addForm.reset({ name: '', email: '', phone: '', interestedPlanId: '', source: 'manual', message: '' });
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
      source: lead.source ?? 'manual',
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
      source: lead.source ?? 'manual',
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
      source: (value.source || undefined) as LeadSource | undefined,
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

  protected openCampaignModal(): void {
    if (this.selectedCount() === 0) return;
    this.campaignLeadIds.set([...this.selectedIds()]);
    this.campaignPlanId.set('');
    this.campaignError.set('');
    this.showCampaignModal.set(true);
  }

  protected openCampaignModalForLead(lead: Lead): void {
    this.campaignLeadIds.set([lead.leadId]);
    this.campaignPlanId.set('');
    this.campaignError.set('');
    this.showCampaignModal.set(true);
  }

  protected closeCampaignModal(): void {
    this.showCampaignModal.set(false);
  }

  protected sendCampaign(): void {
    const planId = this.campaignPlanId();
    if (!planId) {
      this.campaignError.set('Selecciona un plan para la campaña.');
      return;
    }
    const leadIds = this.campaignLeadIds();
    if (leadIds.length === 0) return;

    this.campaignSending.set(true);
    this.campaignError.set('');

    this.leadsSvc.sendCampaign(leadIds, planId).subscribe({
      next: (result) => {
        this.campaignSending.set(false);
        this.showCampaignModal.set(false);
        this.selectedIds.set(new Set());
        this.campaignLeadIds.set([]);
        const msg = `Campaña enviada: ${result.sent} de ${result.total}${result.failed ? ` (${result.failed} fallaron)` : ''}.`;
        this.toast.success(msg);
      },
      error: () => {
        this.campaignSending.set(false);
        this.campaignError.set('Error al enviar la campaña. Inténtalo de nuevo.');
      },
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

    const headers = ['Nombre', 'Email', 'Teléfono', 'Plan de interés', 'Origen', 'Estado', 'Mensaje', 'Fecha', 'Email enviado'];
    const rows = source.map((l) => [
      l.name,
      l.email,
      l.phone ?? '',
      this.planFor(l)?.title ?? l.interestedPlanId,
      leadSourceLabel(l.source),
      leadStatusLabel(l.status),
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
