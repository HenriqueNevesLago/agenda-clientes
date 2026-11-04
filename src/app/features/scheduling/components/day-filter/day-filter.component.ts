import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-day-filter',
  templateUrl: './day-filter.component.html',
  styleUrl: './day-filter.component.css'
})
export class DayFilterComponent {
  @Input() public availableDays: string[] = [];
  @Input() public selectedDate = '';
  @Input() public dayCounts: Partial<Record<string, number>> = {};

  @Output() public selectDay = new EventEmitter<string>();
  @Output() public clearFilter = new EventEmitter<void>();

  protected formatDay(day: string): string {
    return new Intl.DateTimeFormat('pt-BR', {
      weekday: 'short',
      day: '2-digit',
      month: '2-digit'
    }).format(new Date(`${day}T00:00:00`));
  }
}
