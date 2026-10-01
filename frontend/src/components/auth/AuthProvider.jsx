import { useEffect, useState } from 'react'
import { AuthContext } from './authContext'
import { authRequired, restoreAuthSession, signInWithPassword, signOut, signUpWithPassword } from '@/services/auth'

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [isLoading, setIsLoading] = useState(authRequired)
  const [error, setError] = useState('')

  useEffect(() => {
    let isMounted = true

    async function restore() {
      if (!authRequired) {
        setIsLoading(false)
        return
      }

      try {
        const restored = await restoreAuthSession()

        if (!isMounted) return
        setSession(restored.session)
        setProfile(restored.profile)
        setError('')
      } catch (restoreError) {
        if (!isMounted) return
        setError(restoreError.message)
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    restore()

    return () => {
      isMounted = false
    }
  }, [])

  async function login(credentials) {
    setIsLoading(true)
    setError('')

    try {
      const result = await signInWithPassword(credentials)
      setSession(result.session)
      setProfile(result.profile)
      return result
    } catch (loginError) {
      setError(loginError.message)
      throw loginError
    } finally {
      setIsLoading(false)
    }
  }

  async function signup(credentials) {
    setIsLoading(true)
    setError('')

    try {
      return await signUpWithPassword(credentials)
    } catch (signupError) {
      setError(signupError.message)
      throw signupError
    } finally {
      setIsLoading(false)
    }
  }

  async function logout() {
    if (!authRequired) {
      setError('Authentication is disabled for this local environment.')
      return
    }

    await signOut(session)
    setSession(null)
    setProfile(null)
    setError('')
  }

  const value = {
    authRequired,
    error,
    isAuthenticated: !authRequired || Boolean(session?.accessToken),
    isLoading,
    login,
    logout,
    profile,
    session,
    signup,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
