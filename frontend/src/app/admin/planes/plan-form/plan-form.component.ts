import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom, switchMap, of } from 'rxjs';
import { CreatePlanPayload, Promotion, PromotionType, PlansService } from '../../../core/services/plans.service';
import { PlanServicesService, PlanService } from '../../../core/services/plan-services.service';
import { ToastService } from '../../../core/services/toast.service';

const DEPARTURE_CITIES = [
  'Armenia', 'Barranquilla', 'Bogotá', 'Bucaramanga', 'Cali',
  'Cartagena', 'Cúcuta', 'Ibagué', 'Manizales', 'Medellín',
  'Montería', 'Neiva', 'Pasto', 'Pereira', 'Popayán',
  'Santa Marta', 'Sincelejo', 'Tunja', 'Valledupar', 'Villavicencio',
];

interface ImageItem {
  id: string;
  url: string;       // HTTP URL; empty while uploading
  preview: string;   // data: URL for preview, same as url once uploaded
  uploading: boolean;
  error: string;
}

@Component({
  selector: 'app-plan-form',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './plan-form.component.html',
})
export class PlanFormComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly svc = inject(PlansService);
  private readonly servicesSvc = inject(PlanServicesService);
  private readonly http = inject(HttpClient);
  private readonly toast = inject(ToastService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  protected readonly isEdit = signal(false);

  protected readonly currencyOptions: { value: string; label: string }[] = [
    { value: 'USD', label: 'USD ($)' },
    { value: 'COP', label: 'COP ($)' },
    { value: 'EUR', label: 'EUR (€)' },
  ];

  protected readonly planTypeOptions: { value: string; label: string }[] = [
    { value: 'internacional', label: 'Internacional' },
    { value: 'nacional', label: 'Nacional' },
  ];
  protected readonly isDuplicate = signal(false);
  protected readonly loading = signal(false);
  protected readonly saving = signal(false);
  protected readonly error = signal('');
  protected readonly catalog = signal<PlanService[]>([]);

  protected readonly departureCities = DEPARTURE_CITIES;
  protected readonly imageItems = signal<ImageItem[]>([]);
  protected readonly principalIndex = signal(0);
  protected readonly isDragging = signal(false);

  protected readonly cityQuery = signal('');
  protected readonly citySuggestions = signal<string[]>([]);
  protected readonly showCitySuggestions = signal(false);

  private planId: string | null = null;
  private nextImageId = 0;
  private newImageId(): string { return `img-${++this.nextImageId}`; }

  protected readonly form = this.fb.group({
    title:          ['', [Validators.required]],
    description:    ['', [Validators.required]],
    priceDetails:   ['', [Validators.required]],
    price:          [0, [Validators.required, Validators.min(0)]],
    currency:       ['USD', [Validators.required]],
    planType:       ['internacional', [Validators.required]],
    active:         [true],
    durationDays:   [0, [Validators.required, Validators.min(0)]],
    durationNights: [0, [Validators.required, Validators.min(0)]],
    departureCity:  ['', [Validators.required]],
    validity:       ['', [Validators.required]],
    terms:          ['', [Validators.required]],
  });

  protected selectedInclusions = new Set<string>();
  protected readonly customInclusionInput = signal('');
  protected readonly catalogIds = computed(() => new Set(this.catalog().map((s) => s.id)));
  protected readonly customInclusions = computed(() =>
    [...this.selectedInclusions].filter((id) => !this.catalogIds().has(id)),
  );

  protected readonly promoTypeOptions: { value: PromotionType; label: string }[] = [
    { value: 'dos_x_uno', label: '2 × 1 — Dos personas al precio de una' },
    { value: 'precio_especial', label: 'Precio especial — Con fecha límite' },
    { value: 'cupos_limitados', label: 'Cupos limitados — Genera urgencia' },
    { value: 'texto_libre', label: 'Texto libre — Descripción personalizada' },
  ];

  protected readonly currentPlanPromo = signal<Promotion | undefined>(undefined);
  protected readonly promoActive = signal(false);
  protected readonly promoType = signal<PromotionType>('dos_x_uno');
  protected readonly promoLabel = signal('');
  protected readonly promoExpiresAt = signal('');
  protected readonly promoError = signal('');

  ngOnInit(): void {
    this.servicesSvc.getAll().subscribe({ next: (c) => this.catalog.set(c) });

    this.planId = this.route.snapshot.paramMap.get('id');
    const fromId = this.route.snapshot.queryParamMap.get('from');

    if (this.planId) {
      this.isEdit.set(true);
      this.loadPlan(this.planId, false);
    } else if (fromId) {
      this.isDuplicate.set(true);
      this.loadPlan(fromId, true);
    }
  }

  private loadPlan(id: string, duplicate: boolean): void {
    this.loading.set(true);
    this.svc.getPlan(id).subscribe({
      next: (plan) => {
        this.selectedInclusions = new Set(plan.inclusions);
        this.imageItems.set(
          plan.imageUrls.map((url) => ({
            id: this.newImageId(),
            url,
            preview: url,
            uploading: false,
            error: '',
          })),
        );
        this.cityQuery.set(plan.departureCity ?? '');
        this.form.patchValue({
          title: duplicate ? `${plan.title} (copia)` : plan.title,
          description: plan.description,
          priceDetails: plan.priceDetails,
          price: plan.price,
          currency: plan.currency,
          planType: plan.planType,
          active: duplicate ? false : plan.active,
          durationDays: plan.durationDays,
          durationNights: plan.durationNights,
          departureCity: plan.departureCity,
          validity: plan.validity,
          terms: plan.terms,
        });
        if (!duplicate && plan.promotion) {
          this.currentPlanPromo.set(plan.promotion);
          this.promoActive.set(plan.promotion.active);
          this.promoType.set(plan.promotion.type);
          this.promoLabel.set(plan.promotion.label);
          this.promoExpiresAt.set(plan.promotion.expiresAt ? plan.promotion.expiresAt.slice(0, 10) : '');
        }
        this.loading.set(false);
      },
      error: () => { this.error.set('Error al cargar el plan.'); this.loading.set(false); },
    });
  }

  protected onCityInput(event: Event): void {
    const q = (event.target as HTMLInputElement).value;
    this.cityQuery.set(q);
    this.form.get('departureCity')?.setValue('');
    const lower = q.toLowerCase();
    this.citySuggestions.set(
      q ? DEPARTURE_CITIES.filter((c) => c.toLowerCase().includes(lower)) : DEPARTURE_CITIES,
    );
    this.showCitySuggestions.set(true);
  }

  protected onCityFocus(): void {
    const lower = this.cityQuery().toLowerCase();
    this.citySuggestions.set(
      lower ? DEPARTURE_CITIES.filter((c) => c.toLowerCase().includes(lower)) : DEPARTURE_CITIES,
    );
    this.showCitySuggestions.set(true);
  }

  protected onCityBlur(): void {
    setTimeout(() => this.showCitySuggestions.set(false), 150);
  }

  protected selectCity(city: string): void {
    this.cityQuery.set(city);
    this.form.get('departureCity')?.setValue(city);
    this.showCitySuggestions.set(false);
  }

  protected toggleInclusion(id: string): void {
    if (this.selectedInclusions.has(id)) this.selectedInclusions.delete(id);
    else this.selectedInclusions.add(id);
  }

  protected addCustomInclusion(): void {
    const value = this.customInclusionInput().trim();
    if (!value || this.selectedInclusions.has(value)) return;
    this.selectedInclusions.add(value);
    this.customInclusionInput.set('');
  }

  protected removeInclusion(id: string): void {
    this.selectedInclusions.delete(id);
  }

  protected onCustomInclusionKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter') {
      event.preventDefault();
      this.addCustomInclusion();
    }
  }

  private addImagesFromFiles(files: FileList | null): void {
    if (!files) return;
    Array.from(files).forEach((file) => {
      if (!file.type.startsWith('image/')) return;
      const id = this.newImageId();
      const reader = new FileReader();
      reader.onload = async (e) => {
        const dataUrl = (e.target?.result as string) ?? '';
        const base64 = dataUrl.split(',')[1];
        const extension = file.name.split('.').pop()?.toLowerCase() ?? 'jpg';

        this.imageItems.update((items) => [
          ...items,
          { id, url: '', preview: dataUrl, uploading: true, error: '' },
        ]);
        try {
          const { publicUrl } = await firstValueFrom(
            this.http.post<{ key: string; publicUrl: string }>(
              '/api/plans/upload-image',
              { file: base64, extension },
            ),
          );
          this.imageItems.update((items) =>
            items.map((i) =>
              i.id === id ? { ...i, url: publicUrl, preview: publicUrl, uploading: false } : i,
            ),
          );
        } catch (err: unknown) {
          const msg =
            (err as { error?: { message?: string } })?.error?.message ??
            (err as Error)?.message ??
            'Error al subir la imagen.';
          this.imageItems.update((items) =>
            items.map((i) => (i.id === id ? { ...i, uploading: false, error: msg } : i)),
          );
        }
      };
      reader.readAsDataURL(file);
    });
  }

  protected removeImage(id: string): void {
    const items = this.imageItems();
    const idx = items.findIndex((i) => i.id === id);
    const newItems = items.filter((i) => i.id !== id);
    this.imageItems.set(newItems);
    const pi = this.principalIndex();
    if (pi >= newItems.length) this.principalIndex.set(Math.max(0, newItems.length - 1));
    else if (idx < pi) this.principalIndex.update((p) => p - 1);
  }

  protected setPrincipal(idx: number): void {
    this.principalIndex.set(idx);
  }

  protected onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.isDragging.set(true);
  }

  protected onDragLeave(event: DragEvent): void {
    const target = event.currentTarget as HTMLElement;
    if (!target.contains(event.relatedTarget as Node)) {
      this.isDragging.set(false);
    }
  }

  protected onDrop(event: DragEvent): void {
    event.preventDefault();
    this.isDragging.set(false);
    this.addImagesFromFiles(event.dataTransfer?.files ?? null);
  }

  protected onFileInputChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.addImagesFromFiles(input.files);
    input.value = '';
  }

  protected submit(publish: boolean): void {
    this.error.set('');
    this.promoError.set('');
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.error.set('Completá todos los campos obligatorios.');
      return;
    }
    if (this.isEdit() && this.promoActive() && !this.promoLabel().trim()) {
      this.promoError.set('La descripción de la promoción es obligatoria.');
      return;
    }
    const raw = this.form.getRawValue();
    const items = this.imageItems();
    const pending = items.filter((i) => i.uploading);
    if (pending.length > 0) {
      this.error.set('Esperá a que terminen de subir todas las imágenes.');
      return;
    }
    const pi = this.principalIndex();
    const imageUrls: string[] = [];
    if (items[pi]?.url) imageUrls.push(items[pi].url);
    items.forEach((item, i) => { if (i !== pi && item.url) imageUrls.push(item.url); });

    const payload: CreatePlanPayload = {
      title:          raw.title!,
      description:    raw.description!,
      priceDetails:   raw.priceDetails!,
      price:          Number(raw.price),
      currency:       raw.currency!,
      planType:       raw.planType as 'internacional' | 'nacional',
      active:         publish ? true : !!raw.active,
      durationDays:   Number(raw.durationDays),
      durationNights: Number(raw.durationNights),
      departureCity:  raw.departureCity!,
      validity:       raw.validity!,
      terms:          raw.terms!,
      inclusions:     [...this.selectedInclusions],
      imageUrls,
    };

    this.saving.set(true);
    const op = this.isEdit()
      ? this.svc.updatePlan(this.planId!, payload)
      : this.svc.createPlan(payload);

    op.pipe(
      switchMap(() => {
        if (this.isEdit() && this.promoActive() && this.promoLabel().trim()) {
          const expiresAt = this.promoExpiresAt() ? `${this.promoExpiresAt()}T23:59:59.000Z` : undefined;
          return this.svc.setPromotion(this.planId!, {
            type: this.promoType(),
            label: this.promoLabel().trim(),
            expiresAt,
            active: true,
          });
        }
        return of(null);
      }),
    ).subscribe({
      next: () => {
        const msg = this.isDuplicate()
          ? 'Plan duplicado correctamente'
          : this.isEdit()
            ? 'Plan actualizado correctamente'
            : 'Plan creado correctamente';
        this.toast.success(msg);
        this.router.navigate(['/admin/planes']);
      },
      error: (e) => {
        this.error.set(e?.error?.message ?? 'Error al guardar el plan.');
        this.saving.set(false);
      },
    });
  }

  protected isInvalid(field: string): boolean {
    const ctrl = this.form.get(field);
    return !!(ctrl?.invalid && ctrl.touched);
  }

  protected clearPromotionAction(): void {
    if (!this.planId) return;

    this.saving.set(true);
    this.promoError.set('');

    this.svc.clearPromotion(this.planId).subscribe({
      next: () => {
        this.currentPlanPromo.set(undefined);
        this.promoActive.set(false);
        this.promoLabel.set('');
        this.promoExpiresAt.set('');
        this.saving.set(false);
        this.toast.success('Promoción eliminada.');
      },
      error: () => {
        this.promoError.set('Error al quitar la promoción.');
        this.saving.set(false);
      },
    });
  }
}
