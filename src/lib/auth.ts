import {
  createUserWithEmailAndPassword,
  fetchSignInMethodsForEmail,
  getRedirectResult,
  GoogleAuthProvider,
  linkWithCredential,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  signOut,
  updateProfile,
  type AuthCredential,
  type User,
} from 'firebase/auth'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { auth, db, isFirebaseConfigured } from './firebase'
import type { UserProfile } from '../types/progress'
import { getLocalUserId } from './streak'

const googleProvider = new GoogleAuthProvider()

// A Google credential waiting to be linked to an existing email/password account,
// once the user confirms they want to use Google from now on.
let pendingGoogleCred: AuthCredential | null = null
let pendingLinkEmail: string | null = null

export interface GoogleSignInResult {
  user: User | null
  /** Set when this email already has an email/password account — ask before linking. */
  confirmLink?: { email: string }
}

function isMobileViewport(): boolean {
  return window.matchMedia('(max-width: 768px)').matches
}

export async function initAuthRedirect(): Promise<GoogleSignInResult> {
  if (!isFirebaseConfigured) return { user: null }
  try {
    const result = await getRedirectResult(auth)
    if (result?.user) {
      await upsertUserProfile(result.user, 'google.com')
      return { user: result.user }
    }
    return { user: null }
  } catch (err) {
    const code = (err as { code?: string }).code
    if (code === 'auth/account-exists-with-different-credential') {
      const cred = GoogleAuthProvider.credentialFromError(
        err as Parameters<typeof GoogleAuthProvider.credentialFromError>[0],
      )
      const email = (err as { customData?: { email?: string } }).customData?.email ?? null
      if (cred && email) {
        pendingGoogleCred = cred
        pendingLinkEmail = email
        return { user: null, confirmLink: { email } }
      }
    }
    // Don't block app load on other redirect errors.
    return { user: null }
  }
}

export function subscribeToAuth(callback: (user: User | null) => void): () => void {
  if (!isFirebaseConfigured) {
    callback(null)
    return () => undefined
  }
  return onAuthStateChanged(auth, callback)
}

export async function signInWithEmail(email: string, password: string): Promise<User> {
  try {
    const result = await signInWithEmailAndPassword(auth, email, password)
    await upsertUserProfile(result.user, 'password')
    return result.user
  } catch (err) {
    const code = (err as { code?: string }).code
    if (
      code === 'auth/invalid-credential' ||
      code === 'auth/wrong-password' ||
      code === 'auth/user-not-found'
    ) {
      const methods = await fetchSignInMethodsForEmail(auth, email).catch((): string[] => [])
      if (methods.includes('google.com')) {
        throw new Error(
          'This email is already registered with a Google account. Try "Continue with Google" — this account may use Google sign-in instead of a password.',
        )
      }
    }
    throw err
  }
}

/** Maps Firebase auth errors (and our own thrown Errors) to friendly text. */
export function authErrorMessage(err: unknown): string {
  const code = (err as { code?: string })?.code
  if (code) {
    switch (code) {
      case 'auth/invalid-credential':
      case 'auth/wrong-password':
      case 'auth/user-not-found':
        return 'Invalid email or password.'
      case 'auth/invalid-email':
        return 'Please enter a valid email address.'
      case 'auth/email-already-in-use':
        return 'This email is already registered. Try signing in instead.'
      case 'auth/weak-password':
        return 'Password must be at least 6 characters.'
      case 'auth/too-many-requests':
        return 'Too many attempts. Please wait a moment and try again.'
      case 'auth/popup-closed-by-user':
      case 'auth/cancelled-popup-request':
        return 'Sign-in was cancelled.'
      case 'auth/network-request-failed':
        return 'Network error. Check your connection and try again.'
      default:
        return 'Something went wrong. Please try again.'
    }
  }
  // Our own thrown Errors already carry friendly messages.
  if (err instanceof Error) return err.message
  return 'Something went wrong. Please try again.'
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

export async function signInWithGoogle(): Promise<GoogleSignInResult> {
  if (isMobileViewport()) {
    await signInWithRedirect(auth, googleProvider)
    return { user: null }
  }
  try {
    const result = await signInWithPopup(auth, googleProvider)
    await upsertUserProfile(result.user, 'google.com')
    return { user: result.user }
  } catch (err) {
    const code = (err as { code?: string }).code
    if (code === 'auth/account-exists-with-different-credential') {
      const cred = GoogleAuthProvider.credentialFromError(
        err as Parameters<typeof GoogleAuthProvider.credentialFromError>[0],
      )
      const email = (err as { customData?: { email?: string } }).customData?.email ?? null
      if (cred && email) {
        pendingGoogleCred = cred
        pendingLinkEmail = email
        // Ask the user before linking Google to their existing account.
        return { user: null, confirmLink: { email } }
      }
    }
    throw err
  }
}

/**
 * User confirmed they want Google sign-in. Verify their password, then attach the
 * Google credential so both methods share one account (one uid). Google works from now on.
 */
export async function confirmGoogleLink(password: string): Promise<User> {
  if (!pendingGoogleCred || !pendingLinkEmail) {
    throw new Error('Nothing to link. Please try "Continue with Google" again.')
  }
  const result = await signInWithEmailAndPassword(auth, pendingLinkEmail, password)
  await linkWithCredential(result.user, pendingGoogleCred)
  await upsertUserProfile(result.user, 'google.com')
  pendingGoogleCred = null
  pendingLinkEmail = null
  return result.user
}

export function cancelGoogleLink(): void {
  pendingGoogleCred = null
  pendingLinkEmail = null
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
