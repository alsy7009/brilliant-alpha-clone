import { useState, type FormEvent } from 'react'
import {
  isDemoMode,
  signInWithEmail,
  signInWithGoogle,
  signUpWithEmail,
} from '../../lib/auth'
import './LoginForm.css'

interface LoginFormProps {
  onDemoContinue: () => void
  onAuthed?: () => void
}

export function LoginForm({ onDemoContinue, onAuthed }: LoginFormProps) {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

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
      setError(err instanceof Error ? err.message : 'Sign in failed')
    } finally {
      setBusy(false)
    }
  }

  const handleGoogle = async () => {
    setError(null)
    setBusy(true)
    try {
      const user = await signInWithGoogle()
      if (user) onAuthed?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Google sign in failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="login-form">
      <div className="login-brand">
        <h1>ALGEBRA QUEST</h1>
        <p>Power up your math skills. Clear missions, earn XP, level up. ★</p>
      </div>

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
