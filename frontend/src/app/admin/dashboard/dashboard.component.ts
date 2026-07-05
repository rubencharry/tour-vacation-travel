import { AfterViewInit, Component, ElementRef, NgZone, OnDestroy, ViewChild, inject } from '@angular/core';
import { NgClass } from '@angular/common';
import { Chart, ChartConfiguration, registerables } from 'chart.js';
import { AuthService } from '../../core/services/auth.service';
import { RouterLink } from '@angular/router';

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

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [RouterLink, NgClass],
  templateUrl: './dashboard.component.html',
})
export class DashboardComponent implements AfterViewInit, OnDestroy {
  protected readonly auth = inject(AuthService);
  private readonly ngZone = inject(NgZone);

  @ViewChild('leadGrowthCanvas') leadGrowthRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('plansCanvas') plansRef!: ElementRef<HTMLCanvasElement>;

  private charts: Chart[] = [];

  protected readonly kpiCards: KpiCard[] = [
    { icon: 'group', value: '1.284', label: 'Total Leads', badge: '+12%', badgeColor: 'text-brand-teal bg-brand-teal/10', iconBg: 'bg-brand-teal/10', iconColor: 'text-brand-teal' },
    { icon: 'tour', value: '42', label: 'Planes Activos', badge: '+5%', badgeColor: 'text-brand-teal bg-brand-teal/10', iconBg: 'bg-brand-terracotta/10', iconColor: 'text-brand-terracotta' },
    { icon: 'mail', value: '8.5k', label: 'Emails Enviados', badge: '-2%', badgeColor: 'text-brand-terracotta bg-brand-terracotta/10', iconBg: 'bg-brand-teal-light/30', iconColor: 'text-primary-container' },
    { icon: 'fiber_new', value: '156', label: 'Nuevos Esta Semana', badge: '--', badgeColor: 'text-outline', iconBg: 'bg-brand-teal/10', iconColor: 'text-brand-teal' },
  ];

  protected readonly recentLeads: LeadRow[] = [
    { initials: 'MR', name: 'Marcos Rodríguez', email: 'marcos@ejemplo.com', destination: 'Bali Retreat', date: '24 oct 2024', sent: true },
    { initials: 'EK', name: 'Elena Kovar', email: 'elena.k@ejemplo.com', destination: 'Maldivas Honeymoon', date: '24 oct 2024', sent: false },
    { initials: 'JW', name: 'James Wilson', email: 'jwilson@ejemplo.com', destination: 'Costa Rica Aventura', date: '23 oct 2024', sent: true },
  ];

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

  ngAfterViewInit(): void {
    this.ngZone.runOutsideAngular(() => {
      this.initLeadGrowthChart();
      this.initPlansChart();
    });
  }

  ngOnDestroy(): void {
    this.charts.forEach((c) => c.destroy());
  }

  private initLeadGrowthChart(): void {
    const config: ChartConfiguration<'line'> = {
      type: 'line',
      data: {
        labels: ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'],
        datasets: [{
          data: [42, 68, 55, 90, 78, 112, 145],
          borderColor: '#2bc7d0',
          backgroundColor: 'rgba(43,199,208,0.08)',
          fill: true,
          tension: 0.4,
          pointBackgroundColor: '#ffffff',
          pointBorderColor: '#2bc7d0',
          pointBorderWidth: 2,
          pointRadius: 4,
          pointHoverRadius: 6,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { grid: { display: false }, ticks: { color: '#74777f', font: { size: 12 } } },
          y: { grid: { color: 'rgba(0,0,0,0.04)' }, ticks: { color: '#74777f', font: { size: 12 } }, border: { display: false } },
        },
      },
    };
    const chart = new Chart(this.leadGrowthRef.nativeElement, config);
    this.charts.push(chart);
  }

  private initPlansChart(): void {
    const config: ChartConfiguration<'bar'> = {
      type: 'bar',
      data: {
        labels: ['Bali', 'PVR', 'MLE', 'CUN', 'PUJ'],
        datasets: [
          {
            label: 'Estándar',
            data: [24, 40, 18, 35, 20],
            backgroundColor: '#1d3557',
            borderRadius: 4,
          },
          {
            label: 'Premium',
            data: [12, 22, 55, 18, 10],
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
          y: { grid: { color: 'rgba(0,0,0,0.04)' }, ticks: { color: '#74777f', font: { size: 12 } }, border: { display: false } },
        },
      },
    };
    const chart = new Chart(this.plansRef.nativeElement, config);
    this.charts.push(chart);
  }
}
