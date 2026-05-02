/**
 * Stateful mock for next/navigation. Use it from a test file like:
 *
 *   vi.mock("next/navigation", async () => {
 *     const { createNavigationMock } = await import("@/test/next-navigation-mock")
 *     return createNavigationMock("/transactions")
 *   })
 *
 *   beforeEach(() => resetMockUrl())
 *
 * router.replace() updates the in-memory search string and notifies
 * subscribers, so useSearchParams() returns a new value and components
 * re-render — close enough to real Next.js behavior for these tests.
 */
import * as React from "react"

let pathname = "/"
let search = ""
const subscribers = new Set<() => void>()

export function resetMockUrl() {
  search = ""
  subscribers.clear()
}

export function getMockSearch() {
  return search
}

export function createNavigationMock(initialPathname: string) {
  pathname = initialPathname
  return {
    useRouter: () => ({
      replace: (url: string) => {
        const u = new URL(url, "http://localhost/")
        search = u.search.replace(/^\?/, "")
        subscribers.forEach((s) => s())
      },
      push: () => {},
      refresh: () => {},
      prefetch: () => {},
      back: () => {},
      forward: () => {},
    }),
    usePathname: () => pathname,
    useSearchParams: () => {
      const [, force] = React.useReducer((x: number) => x + 1, 0)
      React.useEffect(() => {
        subscribers.add(force)
        return () => {
          subscribers.delete(force)
        }
      }, [])
      return new URLSearchParams(search)
    },
  }
}
