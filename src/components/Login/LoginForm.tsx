import { useState, type FormEvent } from 'react'
import {
  authErrorMessage,
  cancelGoogleLink,
  confirmGoogleLink,
  isDemoMode,
  signInWithEmail,
  signInWithGoogle,
  signUpWithEmail,
} from '../../lib/auth'
import './LoginForm.css'

interface LoginFormProps {
  onDemoContinue: () => void
  onAuthed?: () => void
  /** Set after a mobile Google redirect that conflicts with an existing password account. */
  initialConfirmEmail?: string | null
}

export function LoginForm({ onDemoContinue, onAuthed, initialConfirmEmail }: LoginFormProps) {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  // "Use Google from now on?" confirmation for an email that already has a password account.
  const [confirmEmail, setConfirmEmail] = useState<string | null>(initialConfirmEmail ?? null)
  const [confirmPassword, setConfirmPassword] = useState('')

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setError(null)
    setBusy(true)
    try {
      if (mode === 'signup') {
        await signUpWithEmail(email, password, displayName || 'Learner')
      } else {
        await signInWithEmail(email, password)
      }
      onAuthed?.()
    } catch (err) {
      setError(authErrorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  const handleGoogle = async () => {
    setError(null)
    setBusy(true)
    try {
      const result = await signInWithGoogle()
      if (result.user) {
        onAuthed?.()
      } else if (result.confirmLink) {
        setConfirmEmail(result.confirmLink.email)
      }
    } catch (err) {
      setError(authErrorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  const handleConfirmLink = async (event: FormEvent) => {
    event.preventDefault()
    setError(null)
    setBusy(true)
    try {
      await confirmGoogleLink(confirmPassword)
      setConfirmEmail(null)
      setConfirmPassword('')
      onAuthed?.()
    } catch (err) {
      setError(authErrorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  const handleCancelLink = () => {
    cancelGoogleLink()
    setConfirmEmail(null)
    setConfirmPassword('')
    setError(null)
  }

  return (
    <div className="login-form">
      <div className="login-brand">
        <h1>ALGEBRA QUEST</h1>
        <p>Power up your math skills. Clear missions, earn XP, level up. ★</p>
      </div>

      {confirmEmail && (
        <form onSubmit={handleConfirmLink} className="link-panel">
          <p className="link-panel-msg">
            <strong>{confirmEmail}</strong> already has an email &amp; password account. Do you
            want to log in with Google from now on? Enter your password once to connect them.
          </p>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Your account password"
            autoComplete="current-password"
            required
          />
          {error && <p className="auth-error">{error}</p>}
          <button type="submit" className="primary-button" disabled={busy}>
            Yes, use Google from now on
          </button>
          <button type="button" className="link-button" onClick={handleCancelLink}>
            No thanks, keep my password
          </button>
        </form>
      )}

      {isDemoMode() && (
        <div className="demo-banner">
          No save file detected. Jump in with DEMO MODE, or add{' '}
          <code>.env</code> credentials to save your progress.
          <button type="button" className="demo-button" onClick={onDemoContinue}>
            ▶ Play Demo
          </button>
        </div>
      )}

      <form onSubmit={handleSubmit} className="auth-form">
        {mode === 'signup' && (
          <label>
            Hero name
            <input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="e.g. PixelMaster"
              autoComplete="name"
            />
          </label>
        )}
        <label>
          Email
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
        </label>
        <label>
          Password
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
          />
        </label>

        {error && <p className="auth-error">{error}</p>}

        <button type="submit" className="primary-button" disabled={busy || isDemoMode()}>
          {mode === 'signup' ? '★ New Hero' : '▶ Press Start'}
        </button>
      </form>

      <button
        type="button"
        className="google-button"
        onClick={handleGoogle}
        disabled={busy || isDemoMode()}
      >
        Continue with Google
      </button>

      <button
        type="button"
        className="link-button"
        onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')}
      >
        {mode === 'signin' ? 'New player? Create a hero' : 'Got a save? Press Start'}
      </button>
    </div>
  )
}
