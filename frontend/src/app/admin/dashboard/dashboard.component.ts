import {
  AfterViewInit,
  Component,
  ElementRef,
  NgZone,
  OnDestroy,
  OnInit,
  ViewChild,
  inject,
  signal,
} from '@angular/core';
import { NgClass } from '@angular/common';
import { Chart, ChartConfiguration, registerables } from 'chart.js';
import { forkJoin } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';
import { RouterLink } from '@angular/router';
import { LeadsService, Lead } from '../../core/services/leads.service';
import { PlansService, Plan } from '../../core/services/plans.service';

Chart.register(...registerables);

interface KpiCard {
  icon: string;
  value: string;
  label: string;
  badge: string;
  badgeColor: string;
  iconBg: string;
  iconColor: string;
}

interface LeadRow {
  initials: string;
  name: string;
  email: string;
  destination: string;
  date: string;
  sent: boolean;
}

interface ChartData {
  leadGrowthData: number[];
  leadGrowthLabels: string[];
  planLabels: string[];
  planCounts: number[];
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [RouterLink, NgClass],
  templateUrl: './dashboard.component.html',
})
export class DashboardComponent implements OnInit, AfterViewInit, OnDestroy {
  protected readonly auth = inject(AuthService);
  private readonly ngZone = inject(NgZone);
  private readonly leadsService = inject(LeadsService);
  private readonly plansService = inject(PlansService);

  @ViewChild('leadGrowthCanvas') leadGrowthRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('plansCanvas') plansRef!: ElementRef<HTMLCanvasElement>;

  private charts: Chart[] = [];
  private viewReady = false;
  private pendingChartData: ChartData | null = null;

  protected readonly loading = signal(true);
  protected readonly kpiCards = signal<KpiCard[]>([]);
  protected readonly recentLeads = signal<LeadRow[]>([]);
  protected readonly weekGrowth = signal(0);

  ngOnInit(): void {
    forkJoin({
      leads: this.leadsService.getLeads(),
      plans: this.plansService.getPlans({ limit: 1000 }),
    }).subscribe({
      next: ({ leads, plans }) => {
        const chartData = this.computeStats(leads, plans.data);
        this.loading.set(false);
        if (this.viewReady) {
          this.ngZone.runOutsideAngular(() => this.initCharts(chartData));
        } else {
          this.pendingChartData = chartData;
        }
      },
      error: () => this.loading.set(false),
    });
  }

  ngAfterViewInit(): void {
    this.viewReady = true;
    if (this.pendingChartData) {
      this.ngZone.runOutsideAngular(() => this.initCharts(this.pendingChartData!));
      this.pendingChartData = null;
    }
  }

  ngOnDestroy(): void {
    this.charts.forEach((c) => c.destroy());
  }

  protected get greeting(): string {
    const h = new Date().getHours();
    if (h < 12) return 'Buenos días';
    if (h < 19) return 'Buenas tardes';
    return 'Buenas noches';
  }

  protected get greetingEmoji(): string {
    const h = new Date().getHours();
    if (h < 12) return '☀️';
    if (h < 19) return '🌤️';
    return '🌙';
  }

  private computeStats(leads: Lead[], plans: Plan[]): ChartData {
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

    const thisWeekLeads = leads.filter((l) => new Date(l.createdAt) >= weekAgo);
    const lastWeekLeads = leads.filter((l) => {
      const d = new Date(l.createdAt);
      return d >= twoWeeksAgo && d < weekAgo;
    });

    const totalLeads = leads.length;
    const activePlans = plans.filter((p) => p.active).length;
    const emailsSent = leads.filter((l) => l.emailSent).length;
    const newThisWeek = thisWeekLeads.length;
    const emailRate = totalLeads > 0 ? Math.round((emailsSent / totalLeads) * 100) : 0;
    const growth =
      lastWeekLeads.length > 0
        ? Math.round(((newThisWeek - lastWeekLeads.length) / lastWeekLeads.length) * 100)
        : newThisWeek > 0
          ? 100
          : 0;

    const growthText = growth >= 0 ? `+${growth}%` : `${growth}%`;
    const growthColor =
      growth >= 0
        ? 'text-brand-teal bg-brand-teal/10'
        : 'text-brand-terracotta bg-brand-terracotta/10';

    this.weekGrowth.set(growth);

    this.kpiCards.set([
      {
        icon: 'group',
        value: totalLeads.toLocaleString('es-CO'),
        label: 'Total Leads',
        badge: growthText,
        badgeColor: growthColor,
        iconBg: 'bg-brand-teal/10',
        iconColor: 'text-brand-teal',
      },
      {
        icon: 'tour',
        value: activePlans.toString(),
        label: 'Planes Activos',
        badge: `${plans.length} total`,
        badgeColor: 'text-outline',
        iconBg: 'bg-brand-terracotta/10',
        iconColor: 'text-brand-terracotta',
      },
      {
        icon: 'mail',
        value: emailsSent.toLocaleString('es-CO'),
        label: 'Emails Enviados',
        badge: `${emailRate}%`,
        badgeColor:
          emailRate >= 50
            ? 'text-brand-teal bg-brand-teal/10'
            : 'text-brand-terracotta bg-brand-terracotta/10',
        iconBg: 'bg-brand-teal-light/30',
        iconColor: 'text-primary-container',
      },
      {
        icon: 'fiber_new',
        value: newThisWeek.toString(),
        label: 'Nuevos Esta Semana',
        badge: lastWeekLeads.length > 0 ? `vs ${lastWeekLeads.length} ant.` : '--',
        badgeColor: 'text-outline',
        iconBg: 'bg-brand-teal/10',
        iconColor: 'text-brand-teal',
      },
    ]);

    const planMap = new Map(plans.map((p) => [p.planId, p.title]));

    const sorted = [...leads].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
    this.recentLeads.set(
      sorted.slice(0, 5).map((l) => ({
        initials: l.name
          .split(' ')
          .slice(0, 2)
          .map((w) => w[0] ?? '')
          .join('')
          .toUpperCase(),
        name: l.name,
        email: l.email,
        destination: planMap.get(l.interestedPlanId) ?? 'Sin plan',
        date: new Date(l.createdAt).toLocaleDateString('es-CO', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        }),
        sent: l.emailSent,
      })),
    );

    // Lead growth: last 7 days
    const DAY_LABELS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    const days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(now);
      d.setDate(d.getDate() - (6 - i));
      d.setHours(0, 0, 0, 0);
      return d;
    });
    const leadGrowthLabels = days.map((d) => DAY_LABELS[d.getDay()]);
    const leadGrowthData = days.map((d, i) => {
      const next = i < 6 ? days[i + 1] : new Date(now.getTime() + 86_400_000);
      return leads.filter((l) => {
        const ld = new Date(l.createdAt);
        return ld >= d && ld < next;
      }).length;
    });

    // Top 5 plans by lead count
    const planCountMap = new Map<string, number>();
    leads.forEach((l) =>
      planCountMap.set(l.interestedPlanId, (planCountMap.get(l.interestedPlanId) ?? 0) + 1),
    );
    const top5 = Array.from(planCountMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
    const planLabels = top5.map(([id]) => {
      const title = planMap.get(id) ?? id.slice(0, 6);
      return title.length > 12 ? title.slice(0, 12) + '…' : title;
    });
    const planCounts = top5.map(([, c]) => c);

    return { leadGrowthData, leadGrowthLabels, planLabels, planCounts };
  }

  private initCharts(data: ChartData): void {
    this.charts.forEach((c) => c.destroy());
    this.charts = [];

    const lineConfig: ChartConfiguration<'line'> = {
      type: 'line',
      data: {
        labels: data.leadGrowthLabels,
        datasets: [
          {
            data: data.leadGrowthData,
            borderColor: '#2bc7d0',
            backgroundColor: 'rgba(43,199,208,0.08)',
            fill: true,
            tension: 0.4,
            pointBackgroundColor: '#ffffff',
            pointBorderColor: '#2bc7d0',
            pointBorderWidth: 2,
            pointRadius: 4,
            pointHoverRadius: 6,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { grid: { display: false }, ticks: { color: '#74777f', font: { size: 12 } } },
          y: {
            grid: { color: 'rgba(0,0,0,0.04)' },
            ticks: { color: '#74777f', font: { size: 12 }, stepSize: 1 },
            border: { display: false },
          },
        },
      },
    };

    const barConfig: ChartConfiguration<'bar'> = {
      type: 'bar',
      data: {
        labels: data.planLabels,
        datasets: [
          {
            label: 'Leads',
            data: data.planCounts,
            backgroundColor: '#2bc7d0',
            borderRadius: 4,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: { backgroundColor: '#1d3557', titleFont: { size: 12 }, bodyFont: { size: 12 } },
        },
        scales: {
          x: { grid: { display: false }, ticks: { color: '#74777f', font: { size: 12 } } },
          y: {
            grid: { color: 'rgba(0,0,0,0.04)' },
            ticks: { color: '#74777f', font: { size: 12 }, stepSize: 1 },
            border: { display: false },
          },
        },
      },
    };

    this.charts.push(new Chart(this.leadGrowthRef.nativeElement, lineConfig));
    if (data.planCounts.length > 0) {
      this.charts.push(new Chart(this.plansRef.nativeElement, barConfig));
    }
  }
}
