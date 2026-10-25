import React, { useState } from 'react'
import { signIn } from '../lib/cloud.js'
import { Press } from '../ui/kit.jsx'
import { Mark } from './Onboarding.jsx'

// One form: signs you in, or makes the account the first time.
export default function Auth({ onUser }) {
  const [email, setEmail] = useState('')
  const [pw, setPw] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const go = async () => {
    setBusy(true); setErr('')
    try { onUser(await signIn(email.trim(), pw)) } catch (e) { setErr(e.message || 'Could not sign in') } finally { setBusy(false) }
  }
  return (
    <div className="screen" style={{ padding: 'calc(var(--safe-t) + 90px) 20px 0' }}>
      <Mark size={96} />
      <h1 className="hero center" style={{ marginTop: 28 }}>Lavender</h1>
      <p className="small center" style={{ marginTop: 8, fontSize: 15 }}>Sign in, or make an account with the same two fields.</p>
      <form className="stack" style={{ marginTop: 34, gap: 10 }} onSubmit={(e) => { e.preventDefault(); go() }}>
        <input className="field" type="email" autoComplete="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} aria-label="Email" />
        <input className="field" type="password" autoComplete="current-password" placeholder="Password" value={pw} onChange={(e) => setPw(e.target.value)} aria-label="Password" />
        {err && <p className="small center" role="alert" style={{ color: '#8a2b12' }}>{err}</p>}
        <Press type="submit" className="pill ink" style={{ marginTop: 6, opacity: busy ? 0.5 : 1 }} disabled={busy}>{busy ? 'One moment' : 'Continue'}</Press>
      </form>
    </div>
  )
}
