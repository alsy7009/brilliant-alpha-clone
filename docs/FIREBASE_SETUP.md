# Firebase setup guide — ActiveLearn

Follow these steps once. You do **not** need to share secret keys in chat — paste them only into your local `.env` file (which is gitignored).

---

## What you need to provide (to yourself)

From the [Firebase Console](https://console.firebase.google.com/), you will copy **six values** into `.env`:

| `.env` variable | Where it comes from in `firebaseConfig` |
|-----------------|------------------------------------------|
| `VITE_FIREBASE_API_KEY` | `apiKey` |
| `VITE_FIREBASE_AUTH_DOMAIN` | `authDomain` |
| `VITE_FIREBASE_PROJECT_ID` | `projectId` |
| `VITE_FIREBASE_STORAGE_BUCKET` | `storageBucket` |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | `messagingSenderId` |
| `VITE_FIREBASE_APP_ID` | `appId` |

You also need your **Firebase project ID** for the CLI (same as `projectId`) when deploying.

---

## Step 1 — Create a Firebase project

1. Go to [Firebase Console](https://console.firebase.google.com/) → **Add project**.
2. Name it (e.g. `activelearn-mvp`).
3. Disable Google Analytics if you want the fastest setup (optional for class project).
4. Create the project.

---

## Step 2 — Register a web app

1. On the project overview, click the **Web** icon (`</>`).
2. App nickname: `ActiveLearn Web`.
3. **Do not** enable Firebase Hosting yet in the wizard (we deploy from CLI later).
4. Copy the `firebaseConfig` object shown on screen.

Example (yours will differ):

```javascript
const firebaseConfig = {
  apiKey: "AIza...",
  authDomain: "activelearn-mvp.firebaseapp.com",
  projectId: "activelearn-mvp",
  storageBucket: "activelearn-mvp.appspot.com",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:abcdef123456"
};
```

---

## Step 3 — Create `.env` in the project root

```bash
cp .env.example .env
```

Fill in `.env` (no quotes needed):

```env
VITE_FIREBASE_API_KEY=AIza...
VITE_FIREBASE_AUTH_DOMAIN=activelearn-mvp.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=activelearn-mvp
VITE_FIREBASE_STORAGE_BUCKET=activelearn-mvp.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789012
VITE_FIREBASE_APP_ID=1:123456789012:web:abcdef123456
```

**Restart the dev server** after saving `.env` (Vite only reads env vars at startup):

```bash
npm run dev
```

The login screen should **no longer** show the “Continue in demo mode” banner, and email/Google sign-in should be enabled.

---

## Step 4 — Enable Authentication

1. Firebase Console → **Build** → **Authentication** → **Get started**.
2. **Sign-in method** tab:
   - **Email/Password** → Enable → Save.
   - **Google** → Enable → pick a support email → Save.

### Google Sign-In: authorized domains

Under **Authentication** → **Settings** → **Authorized domains**, ensure these exist:

- `localhost` (for local dev)
- `your-project-id.firebaseapp.com` (auto-added)
- `your-project-id.web.app` (after hosting deploy)

---

## Step 5 — Create Firestore

1. **Build** → **Firestore Database** → **Create database**.
2. For development, **Start in test mode** is OK short-term, but **use production rules before public deploy** (see Step 7).
3. Pick a region close to your users (e.g. `us-central1`).

### Collections (created automatically by the app)

| Collection | Created when |
|------------|----------------|
| `users/{uid}` | First sign-in (email or Google) |
| `user_progress/{uid}_{lessonId}` | First completed lesson step |

Lessons load from `src/content/lessons/*.json` in the repo for now (no Firestore seed required for MVP).

---

## Step 6 — Install Firebase CLI & link project (deploy only)

```bash
npm install -g firebase-tools
firebase login
firebase use --add
```

Select your project ID when prompted. This creates `.firebaserc` (you can commit this file — it is not secret).

---

## Step 7 — Deploy security rules

From the project root:

```bash
firebase deploy --only firestore:rules
```

Rules are in `firestore.rules` — users can only read/write their own `users` and `user_progress` docs.

---

## Step 8 — Deploy the app (submission)

```bash
npm run build
firebase deploy --only hosting
```

Your public URL will be:

- `https://<project-id>.web.app`
- `https://<project-id>.firebaseapp.com`

Add the hosting domain to Google OAuth authorized domains if Google sign-in fails after deploy.

---

## Verify everything works

| Check | How |
|-------|-----|
| Env loaded | Login page has no demo banner; sign-up works |
| Email auth | Create account → lands on roadmap |
| Google auth | “Continue with Google” completes |
| Progress | Complete a step → refresh → same step |
| Firestore | Console → Firestore → see `users` and `user_progress` docs |

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| Still shows demo mode | `.env` missing values or dev server not restarted |
| `auth/invalid-api-key` | Wrong `VITE_FIREBASE_API_KEY` |
| Google popup blocked | Use mobile width (redirect) or allow popups on localhost |
| `permission-denied` on Firestore | Deploy `firestore.rules`; ensure user is signed in |
| Google works locally but not on deploy | Add hosting URL to authorized domains |

---

## What to send a teammate (not secrets)

Safe to share in README or docs:

- Firebase **project ID**
- Deployed **hosting URL**
- That auth providers are Email + Google

**Never commit** `.env` or paste API keys into GitHub.
