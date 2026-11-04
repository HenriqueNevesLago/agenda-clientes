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
import { Appointment, AppointmentDraft, SERVICE_OPTIONS } from '../models/appointment.model';

@Injectable({
  providedIn: 'root'
})
export class AppointmentStoreService {
  private readonly appointmentsSignal = signal<Appointment[]>([]);
  private readonly serviceTypesSignal = signal<string[]>([...SERVICE_OPTIONS]);
  private readonly syncErrorSignal = signal('');
  private readonly firestore: Firestore | null = null;

  constructor() {
    if (!hasFirebaseConfig(FIREBASE_CONFIG)) {
      return;
    }

    const app = getApps().length > 0 ? getApp() : initializeApp(FIREBASE_CONFIG);
    this.firestore = getFirestore(app);
    this.bindAppointments();
    this.bindServiceTypes();
    void this.ensureDefaultServiceTypes();
  }

  public listSorted(): Appointment[] {
    return [...this.appointmentsSignal()].sort(
      (a, b) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime()
    );
  }

  public getSyncError(): string {
    return this.syncErrorSignal();
  }

  public listServiceTypes(): string[] {
    return [...this.serviceTypesSignal()];
  }

  public async createServiceType(name: string): Promise<boolean> {
    this.assertFirestoreConfigured();

    const normalized = name.trim();
    if (!normalized) {
      return false;
    }

    const exists = this.serviceTypesSignal().some(
      (serviceType) => serviceType.toLowerCase() === normalized.toLowerCase()
    );
    if (exists) {
      return false;
    }

    const serviceTypeRef = doc(this.firestore!, 'serviceTypes', this.toServiceTypeId(normalized));
    await setDoc(serviceTypeRef, { name: normalized }, { merge: true });
    return true;
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
    await addDoc(collectionRef, {
      ...this.toDocument(payload),
      completed: false
    });
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

  public async conclude(id: string): Promise<boolean> {
    this.assertFirestoreConfigured();
    this.syncErrorSignal.set('');

    const exists = this.appointmentsSignal().some((item) => item.id === id);
    if (!exists) {
      return false;
    }

    const appointmentRef = doc(this.firestore!, 'appointments', id);
    await setDoc(appointmentRef, { completed: true }, { merge: true });
    return true;
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
            completed: (data as { completed?: unknown }).completed === true,
            name: data.name,
            phone: typeof data.phone === 'string' ? data.phone : '',
            note: typeof data.note === 'string' ? data.note : '',
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

  private bindServiceTypes(): void {
    const collectionRef = collection(this.firestore!, 'serviceTypes');

    onSnapshot(
      collectionRef,
      (snapshot) => {
        this.syncErrorSignal.set('');

        const remoteServiceTypes = snapshot.docs
          .map((snapshotDoc) => snapshotDoc.data())
          .map((data) => data['name'])
          .filter((name): name is string => typeof name === 'string')
          .map((name) => name.trim())
          .filter((name) => name.length > 0)
          .sort((a, b) => a.localeCompare(b, 'pt-BR'));

        this.serviceTypesSignal.set(
          remoteServiceTypes.length > 0 ? remoteServiceTypes : [...SERVICE_OPTIONS]
        );
      },
      (error) => {
        this.syncErrorSignal.set(this.getFirestoreErrorMessage(error));
      }
    );
  }

  private async ensureDefaultServiceTypes(): Promise<void> {
    for (const serviceType of SERVICE_OPTIONS) {
      const serviceTypeRef = doc(this.firestore!, 'serviceTypes', this.toServiceTypeId(serviceType));
      await setDoc(serviceTypeRef, { name: serviceType }, { merge: true });
    }
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
        return 'Firestore bloqueou o acesso. Ajuste as regras de leitura e escrita da coleção appointments.';
      }
    }

    return 'Falha ao sincronizar com o Firestore.';
  }

  private toDocument(payload: AppointmentDraft): AppointmentDraft {
    return {
      name: payload.name.trim(),
      phone: payload.phone.trim(),
      note: payload.note.trim(),
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
      (typeof candidate.phone === 'string' || typeof (candidate as { phone?: unknown }).phone === 'undefined') &&
      (typeof candidate.note === 'string' || typeof (candidate as { note?: unknown }).note === 'undefined') &&
      typeof candidate.car === 'string' &&
      typeof candidate.serviceType === 'string' &&
      typeof candidate.dateTime === 'string'
    );
  }

  private toServiceTypeId(name: string): string {
    return name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }
}
