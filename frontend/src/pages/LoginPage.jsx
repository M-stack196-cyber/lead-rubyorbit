import { useState } from 'react'
import { ArrowRight, CheckCircle2, LockKeyhole, Orbit, ShieldCheck, UserPlus } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { isAuthConfigured } from '@/services/auth'

function AuthShell({ children, mode = 'signin', onSwitchMode }) {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.14),transparent_34%),linear-gradient(180deg,#f8fafc_0%,#eef2f7_100%)] px-4 py-10">
      <div className="mx-auto grid min-h-[calc(100vh-5rem)] w-full max-w-6xl items-center gap-8 lg:grid-cols-[1fr_0.86fr]">
        <section className="hidden lg:block">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 shadow-sm">
            <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
            Production safety controls enabled
          </div>
          <h1 className="mt-5 max-w-2xl text-5xl font-semibold tracking-tight text-slate-950">
            Outreach operations, governed from one workspace.
          </h1>
          <p className="mt-5 max-w-xl text-base leading-7 text-slate-600">
            LeadRubyOrbit coordinates leads, campaigns, approvals, controlled Gmail sending, reply monitoring, and workflow execution with audit-ready visibility.
          </p>
          <div className="mt-8 grid max-w-xl gap-3 sm:grid-cols-3">
            {['Approval-gated email', 'Reply-aware workflows', 'Workspace audit trail'].map((item) => (
              <div className="rounded-xl border border-slate-200 bg-white/80 p-4 shadow-sm" key={item}>
                <CheckCircle2 className="h-5 w-5 text-emerald-600" aria-hidden="true" />
                <p className="mt-3 text-sm font-semibold text-slate-900">{item}</p>
              </div>
            ))}
          </div>
        </section>

        <Card className="w-full border-slate-200 bg-white/95 shadow-[0_24px_70px_rgba(15,23,42,0.14)]">
          <CardHeader className="space-y-4 pb-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-950 text-white shadow-sm">
                <Orbit className="h-6 w-6" aria-hidden="true" />
              </div>
              <button
                className="inline-flex min-h-9 items-center justify-center rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
                type="button"
                onClick={onSwitchMode}
              >
                {mode === 'signin' ? 'Create account' : 'Sign in'}
              </button>
            </div>
            <div>
              <CardTitle className="text-2xl text-slate-950">
                {mode === 'signin' ? 'Sign in to LeadRubyOrbit' : 'Request workspace access'}
              </CardTitle>
              <CardDescription className="mt-2 text-sm leading-6">
                {mode === 'signin'
                  ? 'Use your approved team account to access outreach workflows.'
                  : 'Create an auth account. Workspace access may still require administrator approval.'}
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>{children}</CardContent>
        </Card>
      </div>
    </main>
  )
}

function formatAuthMessage(message = '') {
  if (message.toLowerCase().includes('email not confirmed')) {
    return 'Please confirm your email from the Supabase confirmation email, or ask admin to confirm your account.'
  }

  return message
}

export function LoginPage({ error = '', isLoading = false, onLogin, onShowSignup }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [formError, setFormError] = useState('')

  async function handleSubmit(event) {
    event.preventDefault()
    setFormError('')

    if (!email.trim() || !password) {
      setFormError('Email and password are required.')
      return
    }

    try {
      await onLogin({
        email: email.trim(),
        password,
      })
    } catch (loginError) {
      setFormError(formatAuthMessage(loginError.message))
    }
  }

  const message = formError || formatAuthMessage(error)
  const configured = isAuthConfigured()

  return (
    <AuthShell mode="signin" onSwitchMode={onShowSignup}>
      <form className="grid gap-4" onSubmit={handleSubmit}>
        <label className="grid gap-2 text-sm font-semibold text-slate-700" htmlFor="auth-email">
          Email
          <input
            className="min-h-11 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm outline-none transition focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/20"
            id="auth-email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            autoComplete="email"
            disabled={!configured || isLoading}
          />
        </label>
        <label className="grid gap-2 text-sm font-semibold text-slate-700" htmlFor="auth-password">
          Password
          <input
            className="min-h-11 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm outline-none transition focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/20"
            id="auth-password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="current-password"
            disabled={!configured || isLoading}
          />
        </label>

        {message ? <AuthMessage tone="danger">{message}</AuthMessage> : null}
        {!configured ? <AuthMessage tone="warning">Frontend auth requires VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.</AuthMessage> : null}

        <button
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-slate-950 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          type="submit"
          disabled={!configured || isLoading}
        >
          <LockKeyhole className="h-4 w-4" aria-hidden="true" />
          {isLoading ? 'Signing in...' : 'Sign in'}
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </button>
      </form>
    </AuthShell>
  )
}

export function SignupPage({ error = '', isLoading = false, onShowLogin, onSignup }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [formError, setFormError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const configured = isAuthConfigured()

  async function handleSubmit(event) {
    event.preventDefault()
    setFormError('')
    setSuccessMessage('')

    if (!email.trim() || password.length < 8) {
      setFormError('Enter an email and a password with at least 8 characters.')
      return
    }

    try {
      const result = await onSignup({ email: email.trim(), password })
      setSuccessMessage(result?.message || 'Account request received. Confirm your email if required, then sign in.')
    } catch (signupError) {
      setFormError(signupError.message)
    }
  }

  return (
    <AuthShell mode="signup" onSwitchMode={onShowLogin}>
      <form className="grid gap-4" onSubmit={handleSubmit}>
        <label className="grid gap-2 text-sm font-semibold text-slate-700" htmlFor="signup-email">
          Work email
          <input
            className="min-h-11 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm outline-none transition focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/20"
            id="signup-email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            autoComplete="email"
            disabled={!configured || isLoading}
          />
        </label>
        <label className="grid gap-2 text-sm font-semibold text-slate-700" htmlFor="signup-password">
          Password
          <input
            className="min-h-11 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm outline-none transition focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/20"
            id="signup-password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="new-password"
            disabled={!configured || isLoading}
          />
        </label>

        {successMessage ? <AuthMessage tone="success">{successMessage}</AuthMessage> : null}
        {formError || error ? <AuthMessage tone="danger">{formError || error}</AuthMessage> : null}
        {!configured ? <AuthMessage tone="warning">Frontend auth requires VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.</AuthMessage> : null}

        <button
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-slate-950 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          type="submit"
          disabled={!configured || isLoading}
        >
          <UserPlus className="h-4 w-4" aria-hidden="true" />
          {isLoading ? 'Creating account...' : 'Create account'}
        </button>
      </form>
    </AuthShell>
  )
}

function AuthMessage({ children, tone }) {
  const className = {
    danger: 'border-red-200 bg-red-50 text-red-700',
    success: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    warning: 'border-amber-200 bg-amber-50 text-amber-800',
  }[tone]

  return <p className={`rounded-lg border px-3 py-2 text-sm font-medium ${className}`}>{children}</p>
}
