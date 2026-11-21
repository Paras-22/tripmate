import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { GoogleLogin } from '@react-oauth/google'
import { api, saveSession } from '../services/api'
import { validateInviteCode } from '../utils/validation'

// Here I made the first page with the two ways in: Google for organisers, invite code for travellers
export default function Login() {
  const navigate = useNavigate()
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [codeError, setCodeError] = useState('')

  async function signIn(path, body) {
    setError('')
    try {
      saveSession(await api(path, 'POST', body))
      navigate(0) // here I reload the page so Home can open the right screen
    } catch (err) {
      setError(err.status ? err.message : 'Could not reach TripMate. Check your connection.')
    }
  }

  // Here I check the code looks right before asking the server
  function handleJoin(event) {
    event.preventDefault()
    const problem = validateInviteCode(code)
    setCodeError(problem)
    if (!problem) signIn('/auth/join', { code: code.trim() })
  }

  return (
    <main className="page login">
      <p className="brand">TripMate</p>
      <h1>One trip plan for the whole group.</h1>
      <p className="muted">Everyone sees the latest plan, even with no mobile data.</p>

      <section className="card">
        <h2>Joining a trip?</h2>
        <form onSubmit={handleJoin} className="join-form" noValidate>
          <label>
            Invite code
            <input
              value={code}
              onChange={(event) => setCode(event.target.value)}
              placeholder="A1B2C3D4"
              autoComplete="off"
              required
            />
            {codeError && <span className="field-error" role="alert">{codeError}</span>}
          </label>
          <button>Join trip</button>
        </form>
      </section>

      <section className="card">
        <h2>Planning a trip?</h2>
        <p className="muted">Sign in to create trips and share the invite code.</p>
        <GoogleLogin
          onSuccess={({ credential }) => signIn('/auth/google', { credential })}
          onError={() => setError('Google sign in failed')}
        />
      </section>

      {error && <p className="error" role="alert">{error}</p>}
    </main>
  )
}
