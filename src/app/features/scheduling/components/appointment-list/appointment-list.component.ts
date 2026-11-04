import { Component, EventEmitter, Input, Output } from '@angular/core';
import { Appointment } from '../../../../core/models/appointment.model';

@Component({
  selector: 'app-appointment-list',
  templateUrl: './appointment-list.component.html',
  styleUrl: './appointment-list.component.css'
})
export class AppointmentListComponent {
  @Input() public appointments: Appointment[] = [];

  @Output() public edit = new EventEmitter<Appointment>();
  @Output() public remove = new EventEmitter<string>();

  protected trackById(_: number, item: Appointment): string {
    return item.id;
  }

  protected formatTime(dateTime: string): string {
    return new Intl.DateTimeFormat('pt-BR', {
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(dateTime));
  }

  protected formatDateTime(dateTime: string): string {
    return new Intl.DateTimeFormat('pt-BR', {
      weekday: 'long',
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(dateTime));
  }
}
