import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  query,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore'
import { db, isFirebaseConfigured } from './firebase'

export interface FriendRequest {
  id: string
  fromUid: string
  fromName: string
  fromEmail: string
  fromPhotoURL?: string
  toUid: string
  toEmail: string
  status: 'pending' | 'accepted' | 'denied'
  createdAt: string
}

export interface FriendProfile {
  userId: string
  displayName: string
  email: string
  photoURL?: string
  totalXp: number
  level: number
  streak: number
  lessonsCompleted: number
  completedLessons: string[]
  equippedDecoration: string
}

export interface UserStats {
  totalXp: number
  level: number
  streak: number
  lessonsCompleted: number
  completedLessons: string[]
}

function pairId(a: string, b: string): string {
  return [a, b].sort().join('__')
}

/** Persist a readable stats snapshot on the user doc so friends can see it. */
export async function updateUserStats(uid: string, stats: UserStats): Promise<void> {
  if (!isFirebaseConfigured) return
  try {
    await setDoc(
      doc(db, 'users', uid),
      { ...stats, statsUpdatedAt: new Date().toISOString() },
      { merge: true },
    )
  } catch {
    // non-critical
  }
}

function toProfile(id: string, data: Record<string, unknown>): FriendProfile {
  return {
    userId: id,
    displayName: (data.displayName as string) ?? 'Learner',
    email: (data.email as string) ?? '',
    photoURL: (data.photoURL as string) ?? undefined,
    totalXp: (data.totalXp as number) ?? 0,
    level: (data.level as number) ?? 1,
    streak: (data.streak as number) ?? 0,
    lessonsCompleted: (data.lessonsCompleted as number) ?? 0,
    completedLessons: (data.completedLessons as string[]) ?? [],
    equippedDecoration: (data.equippedDecoration as string) ?? 'none',
  }
}

/** Persist the equipped avatar decoration so friends can see it. */
export async function persistDecoration(uid: string, decorationId: string): Promise<void> {
  if (!isFirebaseConfigured) return
  try {
    await setDoc(doc(db, 'users', uid), { equippedDecoration: decorationId }, { merge: true })
  } catch {
    // non-critical
  }
}

export async function findUserByEmail(email: string): Promise<FriendProfile | null> {
  if (!isFirebaseConfigured) return null
  const normalized = email.trim().toLowerCase()
  const q = query(collection(db, 'users'), where('emailLower', '==', normalized), limit(1))
  const snap = await getDocs(q)
  if (snap.empty) return null
  const d = snap.docs[0]
  return toProfile(d.id, d.data())
}

export async function sendFriendRequest(
  me: { uid: string; name: string; email: string; photoURL?: string },
  toEmail: string,
): Promise<{ ok: boolean; message: string }> {
  if (!isFirebaseConfigured) return { ok: false, message: 'Sign in to add friends.' }

  const target = await findUserByEmail(toEmail)
  if (!target) return { ok: false, message: 'No player found with that email.' }
  if (target.userId === me.uid) return { ok: false, message: "That's you!" }

  // Already friends?
  try {
    const existingFriendship = await getDoc(doc(db, 'friendships', pairId(me.uid, target.userId)))
    if (existingFriendship.exists()) return { ok: false, message: 'You are already friends.' }
  } catch {
    // treat a denied/missing read as "not friends yet"
  }

  // Pending request already exists? (single-field query, filtered client-side to avoid
  // needing a composite index)
  const outgoing = await getDocs(
    query(collection(db, 'friend_requests'), where('fromUid', '==', me.uid)),
  )
  const alreadySent = outgoing.docs.some((d) => {
    const data = d.data()
    return data.toUid === target.userId && data.status === 'pending'
  })
  if (alreadySent) return { ok: false, message: 'Request already sent.' }

  await addDoc(collection(db, 'friend_requests'), {
    fromUid: me.uid,
    fromName: me.name,
    fromEmail: me.email,
    ...(me.photoURL ? { fromPhotoURL: me.photoURL } : {}),
    toUid: target.userId,
    toEmail: target.email,
    status: 'pending',
    createdAt: new Date().toISOString(),
  })
  return { ok: true, message: `Friend request sent to ${target.displayName}!` }
}

export async function getIncomingRequests(uid: string): Promise<FriendRequest[]> {
  if (!isFirebaseConfigured) return []
  try {
    const snap = await getDocs(
      query(collection(db, 'friend_requests'), where('toUid', '==', uid)),
    )
    return snap.docs
      .map((d) => ({ id: d.id, ...(d.data() as Omit<FriendRequest, 'id'>) }))
      .filter((r) => r.status === 'pending')
  } catch {
    return []
  }
}

export async function acceptFriendRequest(req: FriendRequest, myUid: string): Promise<void> {
  if (!isFirebaseConfigured) return
  await setDoc(doc(db, 'friendships', pairId(req.fromUid, req.toUid)), {
    members: [req.fromUid, req.toUid],
    createdAt: new Date().toISOString(),
  })
  await updateDoc(doc(db, 'friend_requests', req.id), { status: 'accepted' })
  void myUid
}

export async function denyFriendRequest(req: FriendRequest): Promise<void> {
  if (!isFirebaseConfigured) return
  await deleteDoc(doc(db, 'friend_requests', req.id))
}

export async function getFriends(uid: string): Promise<FriendProfile[]> {
  if (!isFirebaseConfigured) return []
  try {
    const snap = await getDocs(
      query(collection(db, 'friendships'), where('members', 'array-contains', uid)),
    )
    const friendUids = snap.docs
      .map((d) => (d.data().members as string[]).find((m) => m !== uid))
      .filter((x): x is string => Boolean(x))

    const profiles = await Promise.all(
      friendUids.map(async (fuid) => {
        const u = await getDoc(doc(db, 'users', fuid))
        return u.exists() ? toProfile(u.id, u.data()) : null
      }),
    )
    return profiles.filter((p): p is FriendProfile => p !== null)
  } catch {
    return []
  }
}
