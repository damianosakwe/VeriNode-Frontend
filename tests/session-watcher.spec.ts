import { test, expect } from "@playwright/test"

test.describe("Session Watcher — Wallet Disconnect Detection", () => {
  test.beforeEach(async ({ page }) => {
    // Mock Freighter API on window before navigation
    await page.addInitScript(() => {
      Object.defineProperty(window, "freighterApi", {
        value: { isConnected: () => true },
        writable: true,
        configurable: true,
      })
    })

    await page.goto("/")
    await page.waitForLoadState("networkidle")

    // Seed authenticated state via the test store hook
    await page.evaluate(() => {
      const stores = (window as Record<string, unknown>)
        .__TEST_STORES__ as Record<string, { getState: () => { login: (a: string, b: string) => void } }>
      stores.auth.getState().login("freighter", "GABCDEF123...")
    })
  })

  test("detects wallet lock and triggers logout flow within 6 seconds", async ({
    page,
  }) => {
    // Verify initial state — no overlay yet
    const overlay = page.locator("text=Wallet Disconnected")
    await expect(overlay).toHaveCount(0)

    // Simulate wallet lock: make isConnected return false
    await page.evaluate(() => {
      const freighter = (window as Record<string, unknown>).freighterApi as {
        isConnected: () => boolean
      }
      freighter.isConnected = () => false
    })

    // Wait for up to 3 polling cycles (6 seconds) for the overlay
    await expect(overlay).toBeVisible({ timeout: 6000 })

    // Confirm the overlay mentions the wallet type
    await expect(page.locator("text=freighter")).toBeVisible()

    // Wait for the forced logout redirect (after 10s grace period completes)
    // Total: up to 6s to detect + 10s grace = ~16s
    await page.waitForURL("**/login", { timeout: 18000 })
  })

  test("cancel button dismisses overlay when wallet reconnects", async ({
    page,
  }) => {
    // Trigger disconnect
    await page.evaluate(() => {
      const freighter = (window as Record<string, unknown>).freighterApi as {
        isConnected: () => boolean
      }
      freighter.isConnected = () => false
    })

    // Wait for overlay
    const overlay = page.locator("text=Wallet Disconnected")
    await expect(overlay).toBeVisible({ timeout: 6000 })

    // Simulate reconnection
    await page.evaluate(() => {
      const freighter = (window as Record<string, unknown>).freighterApi as {
        isConnected: () => boolean
      }
      freighter.isConnected = () => true
    })

    // Click Cancel — reconnection check should dismiss overlay
    await page.locator("button", { hasText: "Cancel" }).click()

    // Overlay should disappear
    await expect(overlay).toHaveCount(0, { timeout: 3000 })
  })
})
