import {
  createUserWithEmailAndPassword,
  getRedirectResult,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  signOut,
  updateProfile,
  type User,
} from 'firebase/auth'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { auth, db, isFirebaseConfigured } from './firebase'
import type { UserProfile } from '../types/progress'
import { getLocalUserId } from './streak'

const googleProvider = new GoogleAuthProvider()

function isMobileViewport(): boolean {
  return window.matchMedia('(max-width: 768px)').matches
}

export async function initAuthRedirect(): Promise<void> {
  if (!isFirebaseConfigured) return
  await getRedirectResult(auth)
}

export function subscribeToAuth(callback: (user: User | null) => void): () => void {
  if (!isFirebaseConfigured) {
    callback(null)
    return () => undefined
  }
  return onAuthStateChanged(auth, callback)
}

export async function signInWithEmail(email: string, password: string): Promise<User> {
  const result = await signInWithEmailAndPassword(auth, email, password)
  await upsertUserProfile(result.user, 'password')
  return result.user
}

export async function signUpWithEmail(
  email: string,
  password: string,
  displayName: string,
): Promise<User> {
  const result = await createUserWithEmailAndPassword(auth, email, password)
  // Set the auth profile name so it shows immediately and on future logins.
  await updateProfile(result.user, { displayName })
  await upsertUserProfile(result.user, 'password', displayName)
  return result.user
}

export function getCurrentUser(): User | null {
  if (!isFirebaseConfigured) return null
  return auth.currentUser
}

export async function signInWithGoogle(): Promise<User | null> {
  if (isMobileViewport()) {
    await signInWithRedirect(auth, googleProvider)
    return null
  }
  const result = await signInWithPopup(auth, googleProvider)
  await upsertUserProfile(result.user, 'google.com')
  return result.user
}

export async function logOut(): Promise<void> {
  if (!isFirebaseConfigured) {
    localStorage.removeItem('activelearn_local_uid')
    return
  }
  await signOut(auth)
}

export async function upsertUserProfile(
  user: User,
  provider: UserProfile['authProvider'],
  displayName?: string,
): Promise<void> {
  if (!isFirebaseConfigured) return

  // Firestore rejects `undefined` field values, so only include photoURL when set.
  const baseFields = {
    userId: user.uid,
    displayName: displayName ?? user.displayName ?? 'Learner',
    email: user.email ?? '',
    authProvider: provider,
    ...(user.photoURL ? { photoURL: user.photoURL } : {}),
  }

  const ref = doc(db, 'users', user.uid)
  const existing = await getDoc(ref)
  if (!existing.exists()) {
    await setDoc(ref, { ...baseFields, createdAt: new Date().toISOString() })
  } else {
    await setDoc(
      ref,
      {
        displayName: baseFields.displayName,
        email: baseFields.email,
        ...(user.photoURL ? { photoURL: user.photoURL } : {}),
      },
      { merge: true },
    )
  }
}

export function resolveUserId(user: User | null): string {
  if (user) return user.uid
  return getLocalUserId()
}

export function isDemoMode(): boolean {
  return !isFirebaseConfigured
}
