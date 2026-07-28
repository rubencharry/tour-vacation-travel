import { Component, inject } from '@angular/core';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-toast',
  standalone: true,
  template: `
    @if (svc.current(); as t) {
      <div
        class="fixed bottom-20 right-6 z-50 flex items-center gap-3 px-4 py-3.5 rounded-card shadow-coastal-hover max-w-sm"
        [class]="styles[t.type]"
      >
        <span
          class="material-symbols-outlined text-[22px] shrink-0"
          style="font-variation-settings:'FILL' 1"
        >{{ icons[t.type] }}</span>
        <p class="text-sm font-semibold flex-1">{{ t.message }}</p>
        <button
          (click)="svc.dismiss()"
          class="ml-2 opacity-70 hover:opacity-100 transition-opacity shrink-0"
        >
          <span class="material-symbols-outlined text-[18px]">close</span>
        </button>
      </div>
    }
  `,
})
export class ToastComponent {
  protected readonly svc = inject(ToastService);

  protected readonly icons = {
    success: 'check_circle',
    error: 'error',
    info: 'info',
  };

  protected readonly styles = {
    success: 'bg-brand-teal text-white',
    error:   'bg-error text-on-error',
    info:    'bg-primary-container text-white',
  };
}
