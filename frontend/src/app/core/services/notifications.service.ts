import { computed, inject, Injectable, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { timer } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { Lead, LeadsService } from './leads.service';

const LAST_SEEN_KEY = 'tvt_leads_last_seen';
const POLL_INTERVAL_MS = 60_000;
const MAX_RECENT = 10;

@Injectable({ providedIn: 'root' })
export class NotificationsService {
  private readonly leadsSvc = inject(LeadsService);

  private readonly lastSeenAt = signal<string>(
    localStorage.getItem(LAST_SEEN_KEY) ?? new Date().toISOString(),
  );

  private readonly leads = toSignal(
    timer(0, POLL_INTERVAL_MS).pipe(switchMap(() => this.leadsSvc.getLeads())),
    { initialValue: [] as Lead[] },
  );

  readonly newLeads = computed(() =>
    this.leads()
      .filter((l) => new Date(l.createdAt) > new Date(this.lastSeenAt()))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
  );

  readonly unseenCount = computed(() => this.newLeads().length);
  readonly recentLeads = computed(() => this.newLeads().slice(0, MAX_RECENT));

  markAllSeen(): void {
    const now = new Date().toISOString();
    this.lastSeenAt.set(now);
    localStorage.setItem(LAST_SEEN_KEY, now);
  }
}
