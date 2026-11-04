export interface Appointment {
  id: string;
  name: string;
  car: string;
  serviceType: string;
  dateTime: string;
}

export interface AppointmentDraft {
  name: string;
  car: string;
  serviceType: string;
  dateTime: string;
}

export const SERVICE_OPTIONS: string[] = [
  'Troca de oleo',
  'Alinhamento',
  'Balanceamento',
  'Lavagem tecnica',
  'Revisao geral'
];
