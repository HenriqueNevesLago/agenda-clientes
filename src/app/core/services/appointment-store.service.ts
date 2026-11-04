import { Injectable, signal } from '@angular/core';
import { getApp, getApps, initializeApp } from 'firebase/app';
import {
  Firestore,
  addDoc,
  collection,
  deleteDoc,
  doc,
  getFirestore,
  onSnapshot,
  orderBy,
  query,
  setDoc
} from 'firebase/firestore';
import { FIREBASE_CONFIG, hasFirebaseConfig } from '../config/firebase.config';
import { Appointment, AppointmentDraft } from '../models/appointment.model';

@Injectable({
  providedIn: 'root'
})
export class AppointmentStoreService {
  private readonly appointmentsSignal = signal<Appointment[]>([]);
  private readonly syncErrorSignal = signal('');
  private readonly firestore: Firestore | null = null;

  constructor() {
    if (!hasFirebaseConfig(FIREBASE_CONFIG)) {
      return;
    }

    const app = getApps().length > 0 ? getApp() : initializeApp(FIREBASE_CONFIG);
    this.firestore = getFirestore(app);
    this.bindAppointments();
  }

  public listSorted(): Appointment[] {
    return [...this.appointmentsSignal()].sort(
      (a, b) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime()
    );
  }

  public getSyncError(): string {
    return this.syncErrorSignal();
  }

  public hasConflict(dateTime: string, ignoredId: string | null = null): boolean {
    return this.appointmentsSignal().some(
      (item) => item.dateTime === dateTime && item.id !== ignoredId
    );
  }

  public async create(payload: AppointmentDraft): Promise<void> {
    this.assertFirestoreConfigured();
    const collectionRef = collection(this.firestore!, 'appointments');
    this.syncErrorSignal.set('');
    await addDoc(collectionRef, this.toDocument(payload));
  }

  public async update(id: string, payload: AppointmentDraft): Promise<boolean> {
    this.assertFirestoreConfigured();
    this.syncErrorSignal.set('');

    const exists = this.appointmentsSignal().some((item) => item.id === id);
    if (!exists) {
      return false;
    }

    const appointmentRef = doc(this.firestore!, 'appointments', id);
    await setDoc(appointmentRef, this.toDocument(payload), { merge: true });
    return true;
  }

  public async remove(id: string): Promise<void> {
    this.assertFirestoreConfigured();
    this.syncErrorSignal.set('');
    const appointmentRef = doc(this.firestore!, 'appointments', id);
    await deleteDoc(appointmentRef);
  }

  private bindAppointments(): void {
    const collectionRef = collection(this.firestore!, 'appointments');
    const appointmentsQuery = query(collectionRef, orderBy('dateTime', 'asc'));

    onSnapshot(
      appointmentsQuery,
      (snapshot) => {
        this.syncErrorSignal.set('');

        const nextState: Appointment[] = [];

        for (const snapshotDoc of snapshot.docs) {
          const data = snapshotDoc.data();
          if (!this.isValidAppointmentDocument(data)) {
            continue;
          }

          nextState.push({
            id: snapshotDoc.id,
            name: data.name,
            car: data.car,
            serviceType: data.serviceType,
            dateTime: data.dateTime
          });
        }

        this.appointmentsSignal.set(nextState);
      },
      (error) => {
        this.syncErrorSignal.set(this.getFirestoreErrorMessage(error));
      }
    );
  }

  private assertFirestoreConfigured(): void {
    if (!this.firestore) {
      throw new Error('Firebase nao configurado. Preencha src/app/core/config/firebase.config.ts');
    }
  }

  private getFirestoreErrorMessage(error: unknown): string {
    if (typeof error === 'object' && error && 'code' in error) {
      const code = String(error.code);

      if (code.includes('permission-denied')) {
        return 'Firestore bloqueou o acesso. Ajuste as regras de leitura/escrita da colecao appointments.';
      }
    }

    return 'Falha ao sincronizar com o Firestore.';
  }

  private toDocument(payload: AppointmentDraft): AppointmentDraft {
    return {
      name: payload.name.trim(),
      car: payload.car.trim(),
      serviceType: payload.serviceType,
      dateTime: payload.dateTime
    };
  }

  private isValidAppointmentDocument(value: unknown): value is AppointmentDraft {
    if (!value || typeof value !== 'object') {
      return false;
    }

    const candidate = value as AppointmentDraft;

    return (
      typeof candidate.name === 'string' &&
      typeof candidate.car === 'string' &&
      typeof candidate.serviceType === 'string' &&
      typeof candidate.dateTime === 'string'
    );
  }
}
