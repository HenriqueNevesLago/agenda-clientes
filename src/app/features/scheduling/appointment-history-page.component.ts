import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Appointment } from '../../core/models/appointment.model';
import { AppointmentStoreService } from '../../core/services/appointment-store.service';

@Component({
  selector: 'app-appointment-history-page',
  imports: [CommonModule, RouterLink],
  templateUrl: './appointment-history-page.component.html',
  styleUrl: './appointment-history-page.component.css'
})
export class AppointmentHistoryPageComponent {
  private readonly store = inject(AppointmentStoreService);

  protected get appointments(): Appointment[] {
    const today = this.getTodayDateKey();
    return this.store.listSorted().filter(
      (item) => item.completed || item.dateTime.split('T')[0] < today
    );
  }

  protected formatDateTime(dateTime: string): string {
    return new Date(dateTime).toLocaleString('pt-BR', {
      dateStyle: 'short',
      timeStyle: 'short'
    });
  }

  private getTodayDateKey(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}