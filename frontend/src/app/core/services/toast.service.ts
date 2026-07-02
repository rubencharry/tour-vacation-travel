import { Injectable, signal } from '@angular/core';

export type ToastType = 'success' | 'error' | 'info';

export interface Toast {
  message: string;
  type: ToastType;
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  readonly current = signal<Toast | null>(null);

  private timer: ReturnType<typeof setTimeout> | null = null;

  success(message: string, ms = 3500): void { this.show(message, 'success', ms); }
  error(message: string, ms = 4000): void { this.show(message, 'error', ms); }
  info(message: string, ms = 3500): void { this.show(message, 'info', ms); }

  dismiss(): void {
    if (this.timer) clearTimeout(this.timer);
    this.current.set(null);
  }

  private show(message: string, type: ToastType, ms: number): void {
    if (this.timer) clearTimeout(this.timer);
    this.current.set({ message, type });
    this.timer = setTimeout(() => this.current.set(null), ms);
  }
}
