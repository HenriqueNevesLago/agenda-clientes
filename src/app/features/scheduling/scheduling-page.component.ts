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
  protected readonly serviceOptions = SERVICE_OPTIONS;

  protected readonly form: AppointmentDraft = {
    name: '',
    car: '',
    serviceType: this.serviceOptions[0],
    dateTime: ''
  };

  protected selectedDate = '';
  protected editingId: string | null = null;
  protected formError = '';

  private readonly store = inject(AppointmentStoreService);

  protected get isEditing(): boolean {
    return this.editingId !== null;
  }

  protected get sortedAppointments(): Appointment[] {
    return this.store.listSorted();
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

  protected async saveAppointment(): Promise<void> {
    this.formError = '';

    if (!this.form.name || !this.form.car || !this.form.serviceType || !this.form.dateTime) {
      this.formError = 'Preencha todos os campos antes de salvar.';
      return;
    }

    const normalizedDateTime = this.form.dateTime;
    if (this.store.hasConflict(normalizedDateTime, this.editingId)) {
      this.formError = 'Ja existe um agendamento para esse horario.';
      return;
    }

    try {
      if (this.editingId !== null) {
        const updated = await this.store.update(this.editingId, {
          ...this.form,
          dateTime: normalizedDateTime
        });

        if (!updated) {
          this.formError = 'Nao foi possivel atualizar o agendamento.';
          return;
        }
      } else {
        await this.store.create({
          ...this.form,
          dateTime: normalizedDateTime
        });
      }

      this.selectedDate = this.toDateKey(normalizedDateTime);
      this.resetForm();
    } catch {
      this.formError =
        'Nao foi possivel salvar no Firestore. Verifique as regras de permissao da colecao appointments.';
    }
  }

  protected editAppointment(item: Appointment): void {
    this.editingId = item.id;
    this.form.name = item.name;
    this.form.car = item.car;
    this.form.serviceType = item.serviceType;
    this.form.dateTime = item.dateTime;
    this.formError = '';
  }

  protected async deleteAppointment(id: string): Promise<void> {
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
    this.form.car = '';
    this.form.serviceType = this.serviceOptions[0];
    this.form.dateTime = '';
    this.formError = '';
  }

  private toDateKey(dateTime: string): string {
    return dateTime.split('T')[0];
  }
}
