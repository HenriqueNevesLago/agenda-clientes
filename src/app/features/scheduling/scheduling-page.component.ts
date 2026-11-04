import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import {
  Appointment,
  AppointmentDraft,
  SERVICE_OPTIONS
} from '../../core/models/appointment.model';
import { AppointmentStoreService } from '../../core/services/appointment-store.service';
import { AppointmentFormComponent } from './components/appointment-form/appointment-form.component';
import { AppointmentListComponent } from './components/appointment-list/appointment-list.component';
import { DayFilterComponent } from './components/day-filter/day-filter.component';

@Component({
  selector: 'app-scheduling-page',
  imports: [CommonModule, AppointmentFormComponent, DayFilterComponent, AppointmentListComponent],
  templateUrl: './scheduling-page.component.html',
  styleUrl: './scheduling-page.component.css'
})
export class SchedulingPageComponent {
  protected readonly form: AppointmentDraft = {
    name: '',
    phone: '',
    note: '',
    car: '',
    serviceType: SERVICE_OPTIONS[0],
    dateTime: this.buildDefaultDateTime()
  };

  protected selectedDate = '';
  protected editingId: string | null = null;
  protected formError = '';
  protected isSaving = false;

  private readonly store = inject(AppointmentStoreService);

  protected get isEditing(): boolean {
    return this.editingId !== null;
  }

  protected get sortedAppointments(): Appointment[] {
    return this.store.listSorted();
  }

  protected get serviceOptions(): string[] {
    return this.store.listServiceTypes();
  }

  protected get availableDays(): string[] {
    const uniqueDays = new Set(this.sortedAppointments.map((item) => this.toDateKey(item.dateTime)));
    return [...uniqueDays].sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
  }

  protected get selectedDayAppointments(): Appointment[] {
    if (!this.selectedDate) {
      return this.sortedAppointments;
    }

    return this.sortedAppointments.filter(
      (item) => this.toDateKey(item.dateTime) === this.selectedDate
    );
  }

  protected get dayCounts(): Record<string, number> {
    const counts: Record<string, number> = {};

    for (const item of this.sortedAppointments) {
      const key = this.toDateKey(item.dateTime);
      counts[key] = (counts[key] ?? 0) + 1;
    }

    return counts;
  }

  protected get backendError(): string {
    return this.store.getSyncError();
  }

  protected async addServiceType(serviceTypeName: string): Promise<void> {
    const normalized = serviceTypeName.trim();
    if (!normalized) {
      return;
    }

    const hasExisting = this.serviceOptions.some(
      (service) => service.toLowerCase() === normalized.toLowerCase()
    );

    if (hasExisting) {
      this.formError = 'Esse tipo de servico ja existe.';
      return;
    }

    try {
      const created = await this.store.createServiceType(normalized);
      if (!created) {
        this.formError = 'Esse tipo de servico ja existe.';
        return;
      }

      this.form.serviceType = normalized;
      this.formError = '';
    } catch {
      this.formError = 'Nao foi possivel salvar o tipo de servico no Firestore.';
    }
  }

  protected async saveAppointment(): Promise<void> {
    if (this.isSaving) {
      return;
    }

    this.formError = '';
    const normalizedPhone = this.onlyDigits(this.form.phone);

    if (!this.form.car || !this.form.serviceType || !this.form.dateTime) {
      this.formError = 'Preencha carro, servico e data antes de salvar.';
      return;
    }

    if (normalizedPhone.length > 0 && normalizedPhone.length < 10) {
      this.formError = 'Se informar celular, preencha um numero valido.';
      return;
    }

    if (!this.isValidTimeSlot(this.form.dateTime)) {
      this.formError =
        'Use horarios de 30 em 30 minutos entre 08:00 e 17:00 (ex.: 14:00, 14:30).';
      return;
    }

    const normalizedDateTime = this.form.dateTime;
    if (this.store.hasConflict(normalizedDateTime, this.editingId)) {
      this.formError = 'Ja existe um agendamento para esse horario.';
      return;
    }

    try {
      this.isSaving = true;

      if (this.editingId !== null) {
        const updated = await this.store.update(this.editingId, {
          ...this.form,
          phone: this.formatPhone(normalizedPhone),
          dateTime: normalizedDateTime
        });

        if (!updated) {
          this.formError = 'Nao foi possivel atualizar o agendamento.';
          return;
        }
      } else {
        await this.store.create({
          ...this.form,
          phone: this.formatPhone(normalizedPhone),
          dateTime: normalizedDateTime
        });
      }

      this.selectedDate = this.toDateKey(normalizedDateTime);
      this.resetForm();
    } catch {
      this.formError =
        'Nao foi possivel salvar no Firestore. Verifique as regras de permissao da colecao appointments.';
    } finally {
      this.isSaving = false;
    }
  }

  protected editAppointment(item: Appointment): void {
    this.editingId = item.id;
    this.form.name = item.name;
    this.form.phone = item.phone || '';
    this.form.note = item.note || '';
    this.form.car = item.car;
    this.form.serviceType = item.serviceType;
    this.form.dateTime = item.dateTime;
    this.formError = '';
  }

  protected async deleteAppointment(id: string): Promise<void> {
    const confirmed = window.confirm('Deseja realmente excluir este agendamento?');
    if (!confirmed) {
      return;
    }

    try {
      await this.store.remove(id);

      if (
        this.selectedDate &&
        !this.sortedAppointments.some((item) => this.toDateKey(item.dateTime) === this.selectedDate)
      ) {
        this.selectedDate = '';
      }

      if (this.editingId === id) {
        this.resetForm();
      }
    } catch {
      this.formError =
        'Nao foi possivel excluir no Firestore. Verifique as regras de permissao da colecao appointments.';
    }
  }

  protected selectDay(day: string): void {
    this.selectedDate = day;
  }

  protected clearDayFilter(): void {
    this.selectedDate = '';
  }

  protected resetForm(): void {
    this.editingId = null;
    this.form.name = '';
    this.form.phone = '';
    this.form.note = '';
    this.form.car = '';
    this.form.serviceType = this.serviceOptions[0] ?? SERVICE_OPTIONS[0];
    this.form.dateTime = this.buildDefaultDateTime();
    this.formError = '';
    this.isSaving = false;
  }

  protected updatePhone(maskedPhone: string): void {
    this.form.phone = this.formatPhone(this.onlyDigits(maskedPhone));
  }

  private onlyDigits(value: string): string {
    return value.replace(/\D/g, '');
  }

  private formatPhone(digits: string): string {
    const normalizedDigits = digits.slice(0, 11);

    if (!normalizedDigits) {
      return '';
    }

    const ddd = normalizedDigits.slice(0, 2);
    const remaining = normalizedDigits.slice(2);

    if (normalizedDigits.length <= 2) {
      return `(${ddd}`;
    }

    if (remaining.length <= 4) {
      return `(${ddd}) ${remaining}`;
    }

    if (remaining.length <= 8) {
      return `(${ddd}) ${remaining.slice(0, 4)}-${remaining.slice(4)}`;
    }

    return `(${ddd}) ${remaining.slice(0, 5)}-${remaining.slice(5)}`;
  }

  private isValidTimeSlot(dateTime: string): boolean {
    const match = dateTime.match(/T(\d{2}):(\d{2})/);
    if (!match) {
      return false;
    }

    const hours = Number(match[1]);
    const minutes = Number(match[2]);

    if (!Number.isInteger(hours) || !Number.isInteger(minutes)) {
      return false;
    }

    if (hours < 8 || hours > 17) {
      return false;
    }

    if (hours === 17) {
      return minutes === 0;
    }

    return minutes === 0 || minutes === 30;
  }

  private buildDefaultDateTime(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');

    const totalMinutes = now.getHours() * 60 + now.getMinutes();

    const openingMinutes = 8 * 60;
    const closingMinutes = 17 * 60;

    let slotMinutes: number;

    if (totalMinutes <= openingMinutes) {
      slotMinutes = openingMinutes;
    } else if (totalMinutes >= closingMinutes) {
      slotMinutes = closingMinutes;
    } else {
      slotMinutes = Math.ceil(totalMinutes / 30) * 30;
      if (slotMinutes > closingMinutes) {
        slotMinutes = closingMinutes;
      }
    }

    const hour = String(Math.floor(slotMinutes / 60)).padStart(2, '0');
    const minute = String(slotMinutes % 60).padStart(2, '0');

    return `${year}-${month}-${day}T${hour}:${minute}`;
  }

  private toDateKey(dateTime: string): string {
    return dateTime.split('T')[0];
  }
}
