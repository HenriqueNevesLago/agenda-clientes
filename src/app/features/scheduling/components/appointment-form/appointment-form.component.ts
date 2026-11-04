import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AppointmentDraft } from '../../../../core/models/appointment.model';

@Component({
  selector: 'app-appointment-form',
  imports: [FormsModule],
  templateUrl: './appointment-form.component.html',
  styleUrl: './appointment-form.component.css'
})
export class AppointmentFormComponent {
  @Input({ required: true }) public model!: AppointmentDraft;
  @Input({ required: true }) public serviceOptions: string[] = [];
  @Input() public isEditing = false;
  @Input() public formError = '';

  @Output() public save = new EventEmitter<void>();
  @Output() public reset = new EventEmitter<void>();
}
