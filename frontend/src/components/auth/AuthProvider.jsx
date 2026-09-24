import { useEffect, useState } from 'react'
import { AuthContext } from './authContext'
import { authRequired, restoreAuthSession, signInWithPassword, signOut } from '@/services/auth'

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

  async function logout() {
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
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
