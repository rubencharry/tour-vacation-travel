import {
  Component,
  ElementRef,
  HostListener,
  Input,
  computed,
  forwardRef,
  inject,
  signal,
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

export interface SelectOption {
  value: string;
  label: string;
}

@Component({
  selector: 'app-select',
  standalone: true,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => AppSelectComponent),
      multi: true,
    },
  ],
  template: `
    <div [class]="block ? 'relative w-full' : 'relative inline-block'">
      <button
        type="button"
        (click)="toggle()"
        [disabled]="disabled()"
        class="px-3 pr-2.5 bg-surface-container-lowest border rounded-btn text-sm font-medium text-on-surface flex items-center gap-2 transition-all whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
        [class]="(block ? 'w-full min-w-0 h-11 ' : 'min-w-max h-9 ') + (open()
          ? 'border-brand-teal ring-2 ring-brand-teal/20'
          : 'border-surface-variant hover:border-brand-teal/50')"
      >
        <span class="flex-1">{{ selectedLabel() }}</span>
        <span
          class="material-symbols-outlined text-[18px] text-on-surface-variant transition-transform duration-150 shrink-0"
          [class.rotate-180]="open()"
        >expand_more</span>
      </button>

      @if (open()) {
        <div class="absolute top-full mt-1.5 left-0 bg-surface-container-lowest border border-surface-variant rounded-card shadow-coastal z-30 min-w-full py-1.5 overflow-hidden">
          @for (opt of options; track opt.value) {
            <button
              type="button"
              (click)="select(opt.value)"
              class="w-full text-left px-4 py-2 text-sm transition-colors flex items-center gap-2"
              [class]="opt.value === value()
                ? 'text-brand-teal font-semibold bg-brand-teal/10'
                : 'text-on-surface hover:bg-surface-container hover:text-primary-container'"
            >
              @if (opt.value === value()) {
                <span class="material-symbols-outlined text-[14px] text-brand-teal shrink-0" style="font-variation-settings:'FILL' 1">check_circle</span>
              } @else {
                <span class="w-[14px] shrink-0"></span>
              }
              {{ opt.label }}
            </button>
          }
        </div>
      }
    </div>
  `,
})
export class AppSelectComponent implements ControlValueAccessor {
  private readonly el = inject(ElementRef);

  @Input() options: SelectOption[] = [];
  @Input() block = false;

  protected readonly value = signal('');
  protected readonly open = signal(false);
  protected readonly disabled = signal(false);

  protected readonly selectedLabel = computed(
    () => this.options.find((o) => o.value === this.value())?.label ?? '',
  );

  private onChange: (v: string) => void = () => {};
  private onTouched: () => void = () => {};

  writeValue(v: string): void {
    this.value.set(v ?? '');
  }

  registerOnChange(fn: (v: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(d: boolean): void {
    this.disabled.set(d);
  }

  protected toggle(): void {
    this.open.update((v) => !v);
    this.onTouched();
  }

  protected select(v: string): void {
    this.value.set(v);
    this.onChange(v);
    this.open.set(false);
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.el.nativeElement.contains(event.target as Node)) {
      this.open.set(false);
    }
  }
}
