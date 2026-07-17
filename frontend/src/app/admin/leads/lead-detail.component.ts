import { Component, EventEmitter, Input, Output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Lead, LeadStatus, LEAD_STATUSES, leadSourceLabel, leadStatusColorClass } from '../../core/services/leads.service';
import { Plan } from '../../core/services/plans.service';
import { AppSelectComponent } from '../../shared/components/app-select/app-select.component';
import { WhatsappIconComponent } from '../../shared/components/whatsapp-icon/whatsapp-icon.component';

@Component({
  selector: 'app-lead-detail',
  standalone: true,
  imports: [FormsModule, AppSelectComponent, WhatsappIconComponent],
  templateUrl: './lead-detail.component.html',
})
export class LeadDetailComponent {
  @Input({ required: true }) lead!: Lead;
  @Input() plan?: Plan;
  @Input() loadingActivities = false;

  @Output() statusChange = new EventEmitter<LeadStatus>();
  @Output() addNote = new EventEmitter<string>();

  protected readonly noteText = signal('');
  protected readonly statusOptions = LEAD_STATUSES;
  protected readonly leadSourceLabel = leadSourceLabel;

  protected onStatusChange(value: string): void {
    this.statusChange.emit(value as LeadStatus);
  }

  protected get sortedActivities() {
    return [...(this.lead.activities ?? [])].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  protected submitNote(): void {
    const text = this.noteText().trim();
    if (!text) return;
    this.addNote.emit(text);
    this.noteText.set('');
  }

  protected formatDateTime(iso: string): string {
    return new Date(iso).toLocaleDateString('es-CO', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  protected activityIcon(type: string, channel?: string): string {
    switch (type) {
      case 'created': return 'person_add';
      case 'status_changed': return 'sync_alt';
      case 'contacted': return 'mail';
      case 'note': return 'sticky_note_2';
      default: return 'circle';
    }
  }

  protected activityColorClass(a: { type: string; status?: LeadStatus; channel?: string }): string {
    switch (a.type) {
      case 'created':
        return 'bg-primary-container/10 text-primary-container';
      case 'status_changed':
        return leadStatusColorClass(a.status);
      case 'contacted':
        return a.channel === 'whatsapp'
          ? 'bg-brand-teal/10 text-secondary'
          : 'bg-brand-terracotta/10 text-brand-terracotta';
      case 'note':
        return 'bg-tertiary-container/10 text-on-tertiary-container';
      default:
        return 'bg-surface-container text-on-surface-variant';
    }
  }

  protected activityTitle(a: { type: string; status?: LeadStatus; channel?: string }): string {
    switch (a.type) {
      case 'created':
        return 'Lead creado';
      case 'status_changed':
        return `Estado actualizado a "${this.statusOptions.find((s) => s.value === a.status)?.label ?? a.status}"`;
      case 'contacted':
        return `Contactado por ${a.channel === 'whatsapp' ? 'WhatsApp' : 'correo'}`;
      case 'note':
        return 'Nota agregada';
      default:
        return 'Actividad';
    }
  }
}
