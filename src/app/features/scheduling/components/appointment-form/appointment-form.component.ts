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
  @Output() public addServiceType = new EventEmitter<string>();

  protected isAddingServiceType = false;
  protected newServiceTypeName = '';

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
}
