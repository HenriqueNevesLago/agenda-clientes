export interface Appointment {
  id: string;
  name: string;
  phone: string;
  car: string;
  serviceType: string;
  dateTime: string;
}

export interface AppointmentDraft {
  name: string;
  phone: string;
  car: string;
  serviceType: string;
  dateTime: string;
}

export const SERVICE_OPTIONS: string[] = [
  'Colocacao de taximetro',
  'Retirada de taximetro',
  'Marcador combustivel',
  'Marcador temperatura'
];
