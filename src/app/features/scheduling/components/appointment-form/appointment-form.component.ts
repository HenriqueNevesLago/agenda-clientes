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
  @Input() public isSaving = false;
  @Input() public formError = '';

  @Output() public save = new EventEmitter<void>();
  @Output() public reset = new EventEmitter<void>();
  @Output() public addServiceType = new EventEmitter<string>();
  @Output() public phoneChange = new EventEmitter<string>();

  protected isAddingServiceType = false;
  protected newServiceTypeName = '';
  protected readonly timeSlots = this.buildTimeSlots();

  protected get datePart(): string {
    return this.model.dateTime?.split('T')[0] ?? '';
  }

  protected get timePart(): string {
    return this.model.dateTime?.split('T')[1] ?? '';
  }

  protected openServiceTypeEditor(): void {
    this.isAddingServiceType = true;
  }

  protected cancelServiceTypeEditor(): void {
    this.isAddingServiceType = false;
    this.newServiceTypeName = '';
  }

  protected confirmServiceType(): void {
    const normalized = this.newServiceTypeName.trim();
    if (!normalized) {
      return;
    }

    this.addServiceType.emit(normalized);
    this.cancelServiceTypeEditor();
  }

  protected onPhoneInput(value: string): void {
    this.phoneChange.emit(value);
  }

  protected onDatePartChange(datePart: string): void {
    this.composeDateTime(datePart, this.timePart);
  }

  protected onTimePartChange(timePart: string): void {
    this.composeDateTime(this.datePart, timePart);
  }

  private composeDateTime(datePart: string, timePart: string): void {
    if (!datePart || !timePart) {
      this.model.dateTime = '';
      return;
    }

    this.model.dateTime = `${datePart}T${timePart}`;
  }

  private buildTimeSlots(): string[] {
    const slots: string[] = [];

    for (let hour = 8; hour <= 17; hour += 1) {
      const hourLabel = String(hour).padStart(2, '0');
      slots.push(`${hourLabel}:00`);

      if (hour < 17) {
        slots.push(`${hourLabel}:30`);
      }
    }

    return slots;
  }
}
