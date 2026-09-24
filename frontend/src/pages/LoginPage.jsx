import { useState } from 'react'
import { LockKeyhole, Orbit } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { isAuthConfigured } from '@/services/auth'

export function LoginPage({ error = '', isLoading = false, onLogin }) {
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
      setFormError(loginError.message)
    }
  }

  const message = formError || error
  const configured = isAuthConfigured()

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4 py-10">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Orbit className="h-6 w-6" aria-hidden="true" />
          </div>
          <div>
            <CardTitle>Sign in to LeadRubyOrbit</CardTitle>
            <CardDescription>Use your approved team account to access outreach workflows.</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <form className="grid gap-4" onSubmit={handleSubmit}>
            <label className="grid gap-2 text-sm font-medium text-slate-700" htmlFor="auth-email">
              Email
              <input
                className="rounded-md border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                id="auth-email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="email"
                disabled={!configured || isLoading}
              />
            </label>
            <label className="grid gap-2 text-sm font-medium text-slate-700" htmlFor="auth-password">
              Password
              <input
                className="rounded-md border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                id="auth-password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="current-password"
                disabled={!configured || isLoading}
              />
            </label>

            {message ? (
              <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {message}
              </p>
            ) : null}

            {!configured ? (
              <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                Frontend auth requires VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.
              </p>
            ) : null}

            <button
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
              type="submit"
              disabled={!configured || isLoading}
            >
              <LockKeyhole className="h-4 w-4" aria-hidden="true" />
              {isLoading ? 'Signing in...' : 'Sign in'}
            </button>
          </form>
        </CardContent>
      </Card>
    </main>
  )
}
