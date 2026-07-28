import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import {
  CreateProviderPayload,
  OperatorType,
  Provider,
  ProviderStatus,
  ProvidersService,
} from '../../core/services/providers.service';
import { ToastService } from '../../core/services/toast.service';
import { AppSelectComponent, SelectOption } from '../../shared/components/app-select/app-select.component';

type StatusFilter = 'all' | 'activo' | 'inactivo';
type TypeFilter = 'all' | 'mayorista' | 'operador';
type ModalMode = 'create' | 'edit';

const AVAILABLE_SERVICES = [
  'Vuelos internacionales',
  'Vuelos nacionales',
  'Hoteles',
  'Paquetes turísticos',
  'Cruceros',
  'Traslados',
  'Seguros de viaje',
  'Visas',
  'Tours y excursiones',
  'Alquiler de vehículos',
  'Turismo de aventura',
  'Turismo de lujo',
];

@Component({
  selector: 'app-proveedores-admin',
  standalone: true,
  imports: [FormsModule, ReactiveFormsModule, AppSelectComponent],
  templateUrl: './proveedores.component.html',
})
export class ProveedoresAdminComponent implements OnInit {
  private readonly providersSvc = inject(ProvidersService);
  private readonly toast = inject(ToastService);
  private readonly fb = inject(FormBuilder);

  protected readonly availableServices = AVAILABLE_SERVICES;

  protected readonly providers = signal<Provider[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal('');

  protected readonly filterSearch = signal('');
  protected readonly filterType = signal<TypeFilter>('all');
  protected readonly filterStatus = signal<StatusFilter>('all');
  protected readonly page = signal(1);
  protected readonly pageSize = 20;

  protected readonly showDetailModal = signal(false);
  protected readonly detailProvider = signal<Provider | null>(null);

  protected readonly showModal = signal(false);
  protected readonly modalMode = signal<ModalMode>('create');
  protected readonly editingId = signal<string | null>(null);
  protected readonly saving = signal(false);
  protected readonly saveError = signal('');
  protected readonly selectedServices = signal<string[]>([]);
  protected readonly customServiceInput = signal('');
  protected readonly customServices = computed(() =>
    this.selectedServices().filter((s) => !this.availableServices.includes(s)),
  );

  protected readonly form = this.fb.group({
    operatorType: ['mayorista', [Validators.required]],
    businessName: ['', [Validators.required]],
    nit: ['', [Validators.required]],
    mainContact: ['', [Validators.required]],
    contactRole: ['', [Validators.required]],
    phone: ['', [Validators.required]],
    whatsapp: [''],
    email: ['', [Validators.required, Validators.email]],
    city: [''],
    country: ['Colombia'],
    website: [''],
    paymentMethod: [''],
    commissionPct: [null as number | null],
    status: ['activo', [Validators.required]],
    notes: [''],
  });

  protected readonly typeOptions: SelectOption[] = [
    { value: 'all', label: 'Todos los tipos' },
    { value: 'mayorista', label: 'Mayorista' },
    { value: 'operador', label: 'Operador' },
  ];

  protected readonly statusOptions: SelectOption[] = [
    { value: 'all', label: 'Todos los estados' },
    { value: 'activo', label: 'Activo' },
    { value: 'inactivo', label: 'Inactivo' },
  ];

  protected readonly totalCount = computed(() => this.providers().length);
  protected readonly mayoristaCount = computed(() => this.providers().filter((p) => p.operatorType === 'mayorista').length);
  protected readonly operadorCount = computed(() => this.providers().filter((p) => p.operatorType === 'operador').length);
  protected readonly activeCount = computed(() => this.providers().filter((p) => p.status === 'activo').length);

  protected readonly filteredProviders = computed(() => {
    let result = [...this.providers()];

    const search = this.filterSearch().toLowerCase().trim();
    if (search) {
      result = result.filter(
        (p) =>
          p.businessName.toLowerCase().includes(search) ||
          p.mainContact.toLowerCase().includes(search) ||
          p.email.toLowerCase().includes(search) ||
          p.nit.includes(search),
      );
    }

    const type = this.filterType();
    if (type !== 'all') result = result.filter((p) => p.operatorType === type);

    const status = this.filterStatus();
    if (status !== 'all') result = result.filter((p) => p.status === status);

    return result.sort((a, b) => a.businessName.localeCompare(b.businessName, 'es'));
  });

  protected readonly hasActiveFilters = computed(
    () => this.filterSearch() !== '' || this.filterType() !== 'all' || this.filterStatus() !== 'all',
  );

  protected readonly totalPages = computed(() => Math.max(1, Math.ceil(this.filteredProviders().length / this.pageSize)));
  protected readonly pageNumbers = computed(() => Array.from({ length: this.totalPages() }, (_, i) => i + 1));
  protected readonly pagedProviders = computed(() => {
    const start = (this.page() - 1) * this.pageSize;
    return this.filteredProviders().slice(start, start + this.pageSize);
  });
  protected readonly rangeEnd = computed(() => Math.min(this.page() * this.pageSize, this.filteredProviders().length));

  protected readonly modalTitle = computed(() => (this.modalMode() === 'edit' ? 'Editar Proveedor' : 'Nuevo Proveedor'));

  ngOnInit(): void {
    this.load();
  }

  private load(): void {
    this.loading.set(true);
    this.providersSvc.getProviders().subscribe({
      next: (data) => {
        this.providers.set(data);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Error al cargar los proveedores.');
        this.loading.set(false);
      },
    });
  }

  protected clearFilters(): void {
    this.filterSearch.set('');
    this.filterType.set('all');
    this.filterStatus.set('all');
    this.page.set(1);
  }

  protected goToPage(p: number): void {
    if (p < 1 || p > this.totalPages()) return;
    this.page.set(p);
  }

  protected isInvalid(field: string): boolean {
    const control = this.form.get(field);
    return !!control && control.invalid && (control.dirty || control.touched);
  }

  protected toggleService(service: string): void {
    this.selectedServices.update((list) =>
      list.includes(service) ? list.filter((s) => s !== service) : [...list, service],
    );
  }

  protected addCustomService(): void {
    const value = this.customServiceInput().trim();
    if (!value || this.selectedServices().includes(value)) return;
    this.selectedServices.update((list) => [...list, value]);
    this.customServiceInput.set('');
  }

  protected removeCustomService(service: string): void {
    this.selectedServices.update((list) => list.filter((s) => s !== service));
  }

  protected onCustomServiceKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter') {
      event.preventDefault();
      this.addCustomService();
    }
  }

  protected openDetailModal(provider: Provider): void {
    this.detailProvider.set(provider);
    this.showDetailModal.set(true);
  }

  protected closeDetailModal(): void {
    this.showDetailModal.set(false);
  }

  protected openAddModal(): void {
    this.modalMode.set('create');
    this.editingId.set(null);
    this.selectedServices.set([]);
    this.saveError.set('');
    this.form.reset({
      operatorType: 'mayorista',
      businessName: '',
      nit: '',
      mainContact: '',
      contactRole: '',
      phone: '',
      whatsapp: '',
      email: '',
      city: '',
      country: 'Colombia',
      website: '',
      paymentMethod: '',
      commissionPct: null,
      status: 'activo',
      notes: '',
    });
    this.showModal.set(true);
  }

  protected openEditModal(provider: Provider): void {
    this.modalMode.set('edit');
    this.editingId.set(provider.providerId);
    this.selectedServices.set([...provider.services]);
    this.saveError.set('');
    this.form.reset({
      operatorType: provider.operatorType,
      businessName: provider.businessName,
      nit: provider.nit,
      mainContact: provider.mainContact,
      contactRole: provider.contactRole,
      phone: provider.phone,
      whatsapp: provider.whatsapp ?? '',
      email: provider.email,
      city: provider.city ?? '',
      country: provider.country ?? 'Colombia',
      website: provider.website ?? '',
      paymentMethod: provider.paymentMethod ?? '',
      commissionPct: provider.commissionPct ?? null,
      status: provider.status,
      notes: provider.notes ?? '',
    });
    this.showModal.set(true);
  }

  protected closeModal(): void {
    this.showModal.set(false);
  }

  protected submitForm(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const value = this.form.getRawValue();
    const payload: CreateProviderPayload = {
      operatorType: value.operatorType as OperatorType,
      businessName: value.businessName!,
      nit: value.nit!,
      mainContact: value.mainContact!,
      contactRole: value.contactRole!,
      phone: value.phone!,
      email: value.email!,
      status: value.status as ProviderStatus,
      services: this.selectedServices(),
      whatsapp: value.whatsapp || undefined,
      city: value.city || undefined,
      country: value.country || undefined,
      website: value.website || undefined,
      paymentMethod: value.paymentMethod || undefined,
      commissionPct: value.commissionPct != null ? Number(value.commissionPct) : undefined,
      notes: value.notes || undefined,
    };

    this.saving.set(true);
    this.saveError.set('');

    const editingId = this.editingId();
    const request = editingId
      ? this.providersSvc.updateProvider(editingId, payload)
      : this.providersSvc.createProvider(payload);

    request.subscribe({
      next: (provider) => {
        const exists = this.providers().some((p) => p.providerId === provider.providerId);
        this.providers.update((list) =>
          exists ? list.map((p) => (p.providerId === provider.providerId ? provider : p)) : [provider, ...list],
        );
        this.saving.set(false);
        this.showModal.set(false);
        this.toast.success(editingId ? 'Proveedor actualizado correctamente.' : 'Proveedor creado correctamente.');
      },
      error: () => {
        this.saving.set(false);
        this.saveError.set('Error al guardar el proveedor. Verificá los datos e intentá de nuevo.');
      },
    });
  }

  protected toggleStatus(provider: Provider): void {
    const newStatus: ProviderStatus = provider.status === 'activo' ? 'inactivo' : 'activo';
    this.providersSvc.updateProvider(provider.providerId, { status: newStatus }).subscribe({
      next: (updated) => {
        this.providers.update((list) => list.map((p) => (p.providerId === updated.providerId ? updated : p)));
        this.toast.success(`Proveedor ${newStatus === 'activo' ? 'activado' : 'desactivado'}.`);
      },
      error: () => this.toast.error('Error al cambiar el estado del proveedor.'),
    });
  }

  protected deleteProvider(provider: Provider): void {
    if (!confirm(`¿Eliminar a "${provider.businessName}"? Esta acción no se puede deshacer.`)) return;
    this.providersSvc.deleteProvider(provider.providerId).subscribe({
      next: () => {
        this.providers.update((list) => list.filter((p) => p.providerId !== provider.providerId));
        this.toast.success('Proveedor eliminado.');
      },
      error: () => this.toast.error('Error al eliminar el proveedor.'),
    });
  }

  protected exportCsv(): void {
    const source = this.filteredProviders();
    if (source.length === 0) {
      this.toast.error('No hay proveedores para exportar.');
      return;
    }

    const headers = [
      'Razón Social', 'NIT', 'Tipo', 'Estado', 'Contacto', 'Cargo',
      'Teléfono', 'WhatsApp', 'Email', 'Ciudad', 'País',
      'Sitio web', 'Método de pago', 'Comisión %', 'Servicios', 'Notas', 'Fecha de registro',
    ];
    const rows = source.map((p) => [
      p.businessName, p.nit, p.operatorType, p.status,
      p.mainContact, p.contactRole, p.phone, p.whatsapp ?? '',
      p.email, p.city ?? '', p.country ?? '',
      p.website ?? '', p.paymentMethod ?? '',
      p.commissionPct != null ? String(p.commissionPct) : '',
      p.services.join('; '), p.notes ?? '', p.registrationDate,
    ]);

    const RISKY = ['=', '+', '-', '@', '\t', '\r'];
    const sanitize = (v: string) => (RISKY.includes(v[0]) ? `'${v}` : v);
    const escape = (v: string) => `"${sanitize(v).replace(/"/g, '""')}"`;
    const csv = [headers, ...rows].map((row) => row.map((c) => escape(String(c))).join(',')).join('\r\n');

    const blob = new Blob([`﻿${csv}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `proveedores-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  protected formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  protected initialsFor(name: string): string {
    return name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2);
  }

  protected locationFor(provider: Provider): string {
    return [provider.city, provider.country].filter((v) => !!v).join(', ');
  }
}
