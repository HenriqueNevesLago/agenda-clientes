import { FirebaseOptions } from 'firebase/app';

export const FIREBASE_CONFIG: FirebaseOptions = {
  apiKey: "AIzaSyAQvLXywffpyXlCNAvLd3013coPpRuCduM",
  authDomain: "rsl-agendamento.firebaseapp.com",
  projectId: "rsl-agendamento",
  storageBucket: "rsl-agendamento.firebasestorage.app",
  messagingSenderId: "848492874261",
  appId: "1:848492874261:web:931dea3c454a85e5275c1c"
};

export function hasFirebaseConfig(config: FirebaseOptions): boolean {
  return (
    !!config.apiKey &&
    !!config.authDomain &&
    !!config.projectId &&
    !!config.storageBucket &&
    !!config.messagingSenderId &&
    !!config.appId
  );
}