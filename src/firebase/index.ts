
'use client';

import { auth, db, app } from './config';
export { FirebaseProvider } from './provider';
export { FirebaseClientProvider } from './client-provider';
export { useCollection } from './firestore/use-collection';
export { useDoc } from './firestore/use-doc';
export { useUser } from './auth/use-user';

export const getFirebaseApp = () => app;
export const getFirestore = () => db;
export const getAuth = () => auth;

// Compatibility hooks
export const useFirebaseApp = () => app;
export const useFirestore = () => db;
export const useAuth = () => auth;
