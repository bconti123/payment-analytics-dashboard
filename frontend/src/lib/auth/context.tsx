"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react"
import { useQueryClient } from "@tanstack/react-query"

import { ApiError, getMe, login as apiLogin, type Me } from "@/lib/api"
import { clearToken, getToken, setToken } from "./storage"

type Status = "loading" | "authenticated" | "unauthenticated"

interface AuthContextValue {
  status: Status
  user: Me | null
  login: (email: string, password: string) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient()
  // Always start "loading" so SSR and the first client render agree.
  // The mount effect resolves to "authenticated" / "unauthenticated".
  const [status, setStatus] = useState<Status>("loading")
  const [user, setUser] = useState<Me | null>(null)

  const fetchMe = useCallback(async () => {
    try {
      const me = await getMe()
      setUser(me)
      setStatus("authenticated")
    } catch (err) {
      clearToken()
      setUser(null)
      setStatus("unauthenticated")
      if (!(err instanceof ApiError) || err.status !== 401) {
        console.error("auth: failed to load /me", err)
      }
    }
  }, [])

  useEffect(() => {
    // Mount-time bootstrap from localStorage. fetchMe schedules setState
    // inside a promise — the linter still warns on the call itself.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (getToken()) void fetchMe()
    else setStatus("unauthenticated")
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const login = useCallback(
    async (email: string, password: string) => {
      const token = await apiLogin(email, password)
      setToken(token.access_token)
      await fetchMe()
    },
    [fetchMe],
  )

  const logout = useCallback(() => {
    clearToken()
    setUser(null)
    setStatus("unauthenticated")
    queryClient.clear()
  }, [queryClient])

  const value = useMemo(
    () => ({ status, user, login, logout }),
    [status, user, login, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (ctx === undefined) {
    throw new Error("useAuth must be used inside <AuthProvider>")
  }
  return ctx
}
