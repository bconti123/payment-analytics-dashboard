import { describe, it, expect, vi, beforeEach } from "vitest"
import { screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render } from "@testing-library/react"

import { LoginForm } from "./login-form"
import { resetMockUrl } from "@/test/next-navigation-mock"
import { ApiError } from "@/lib/api"
import { AuthProvider } from "@/lib/auth/context"
import { clearToken } from "@/lib/auth/storage"

vi.mock("next/navigation", async () => {
  const { createNavigationMock } = await import("@/test/next-navigation-mock")
  return createNavigationMock("/login")
})

vi.mock("@/lib/api", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api")>("@/lib/api")
  return {
    ...actual,
    login: vi.fn(),
    getMe: vi.fn(),
  }
})

import { login, getMe } from "@/lib/api"
const mockLogin = vi.mocked(login)
const mockGetMe = vi.mocked(getMe)

function renderForm() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0, staleTime: 0 } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <LoginForm />
      </AuthProvider>
    </QueryClientProvider>,
  )
}

describe("LoginForm", () => {
  beforeEach(() => {
    resetMockUrl()
    clearToken()
    mockLogin.mockReset()
    mockGetMe.mockReset()
  })

  it("submits credentials and stores the token on success", async () => {
    const user = userEvent.setup()
    mockLogin.mockResolvedValue({
      access_token: "tok-123",
      token_type: "bearer",
      expires_in: 3600,
    })
    mockGetMe.mockResolvedValue({
      id: "u1",
      email: "admin@example.com",
      role: "admin",
      created_at: "2026-05-01T00:00:00Z",
    })

    renderForm()
    await user.type(screen.getByLabelText(/email/i), "admin@example.com")
    await user.type(screen.getByLabelText(/password/i), "devpassword")
    await user.click(screen.getByRole("button", { name: /sign in/i }))

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith("admin@example.com", "devpassword")
    })
    await waitFor(() => {
      expect(window.localStorage.getItem("pad.access_token")).toBe("tok-123")
    })
  })

  it("shows an inline error on 401 and does not store a token", async () => {
    const user = userEvent.setup()
    mockLogin.mockRejectedValue(new ApiError(401, "nope"))

    renderForm()
    await user.type(screen.getByLabelText(/email/i), "admin@example.com")
    await user.type(screen.getByLabelText(/password/i), "wrong")
    await user.click(screen.getByRole("button", { name: /sign in/i }))

    expect(
      await screen.findByText(/invalid email or password/i),
    ).toBeInTheDocument()
    expect(window.localStorage.getItem("pad.access_token")).toBeNull()
  })
})
