export interface Appointment {
  id: string;
  completed: boolean;
  name: string;
  phone: string;
  note: string;
  car: string;
  serviceType: string;
  dateTime: string;
}

export interface AppointmentDraft {
  name: string;
  phone: string;
  note: string;
  car: string;
  serviceType: string;
  dateTime: string;
}

export const SERVICE_OPTIONS: string[] = [
  'Colocação de taxímetro',
  'Retirada de taxímetro',
  'Marcador de combustível',
  'Marcador de temperatura'
];
