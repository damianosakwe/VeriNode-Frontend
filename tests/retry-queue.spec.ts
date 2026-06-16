import { test, expect } from '@playwright/test';

const RPC_ENDPOINT = 'https://soroban-rpc.stellar.org';
const SAMPLE_TX_XDR = 'AAAAAgAAAABzYXRvc2hpX3Rlc3QAAAABAAAAAQAAAAAAAAAAAAAAAGQAAAAAAAAAAQAAAA9zdGFraW5nX2RlcG9zaXQAAAABAAAAAAAAAAlhbW91bnQAAAABAAAAAAAAAAAAAAAF9eEAAAAAAAAAAAABAAAAAAAAAAAAAAA=';

test.describe('Client Broadcast Recovery Queue', () => {
  test('should create pending entry on network drop and recover on retry', async ({ page }) => {
    const requests: string[] = [];

    await page.route(RPC_ENDPOINT, async (route) => {
      requests.push('intercepted');
      await route.abort('connectionrefused');
    });

    await page.goto('/');

    const textarea = page.locator('textarea');
    await textarea.fill(SAMPLE_TX_XDR);

    const submitButton = page.getByRole('button', { name: 'Submit Stake' });
    await submitButton.click();

    await page.waitForTimeout(1000);

    const hasQueueEntry = await page.evaluate(() => {
      const raw = sessionStorage.getItem('txRetryQueue');
      if (!raw) return false;
      const queue = JSON.parse(raw);
      return queue.some(
        (e: { status: string }) => e.status === 'pending'
      );
    });
    expect(hasQueueEntry).toBe(true);

    const hasNetworkErrorToast = page.locator('text=Network error');
    await expect(hasNetworkErrorToast).toBeVisible({ timeout: 5000 });

    await page.unroute(RPC_ENDPOINT);

    await page.route(RPC_ENDPOINT, async (route) => {
      const response = await route.fetch();
      const body = await response.json();
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: Date.now(),
          result: {
            hash: 'a'.repeat(64),
            status: 'PENDING',
          },
        }),
      });
    });

    await page.waitForTimeout(5000);

    const hasConfirmed = await page.evaluate(() => {
      const raw = sessionStorage.getItem('txRetryQueue');
      if (!raw) return false;
      const queue = JSON.parse(raw);
      return queue.length === 0 || queue.some(
        (e: { status: string }) => e.status === 'confirmed'
      );
    });

    const confirmedToast = page.locator('text=Transaction confirmed');
    await expect(confirmedToast).toBeVisible({ timeout: 10000 });
  });

  test('should skip duplicate submission within 60s window', async ({ page }) => {
    await page.goto('/');

    const textarea = page.locator('textarea');
    await textarea.fill(SAMPLE_TX_XDR);

    const submitButton = page.getByRole('button', { name: 'Submit Stake' });

    await page.route(RPC_ENDPOINT, async (route) => {
      const response = await route.fetch();
      const body = await response.json();
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: Date.now(),
          result: {
            hash: 'b'.repeat(64),
            status: 'PENDING',
          },
        }),
      });
    });

    await submitButton.click();

    await page.waitForTimeout(1500);

    const duplicateToast = page.locator('text=Transaction already submitted');
    const duplicateVisible = await duplicateToast.isVisible().catch(() => false);

    await submitButton.click();

    await page.waitForTimeout(1000);

    const queueAfterSecondClick = await page.evaluate(() => {
      const raw = sessionStorage.getItem('txRetryQueue');
      if (!raw) return [];
      return JSON.parse(raw);
    });

    expect(queueAfterSecondClick.filter((e: { status: string }) => e.status === 'pending').length).toBeLessThanOrEqual(1);
  });

  test('should persist queue across page refresh', async ({ page }) => {
    await page.goto('/');

    await page.evaluate(() => {
      const queue = [
        {
          txXDR: 'AAAA-test-persist',
          txHash: null,
          status: 'pending',
          createdAt: Date.now() - 10000,
          retryCount: 0,
          nextRetryAt: null,
        },
      ];
      sessionStorage.setItem('txRetryQueue', JSON.stringify(queue));
    });

    await page.reload();

    await page.waitForTimeout(2000);

    const pendingBanner = page.locator('text=pending transaction');
    await expect(pendingBanner).toBeVisible({ timeout: 5000 });

    const bannerText = await pendingBanner.textContent();
    expect(bannerText).toContain('1');
  });

  test('should show pending transactions banner with details', async ({ page }) => {
    await page.goto('/');

    await page.evaluate(() => {
      const queue = [
        {
          txXDR: 'AAAA-test-banner-1',
          txHash: 'abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
          status: 'pending',
          createdAt: Date.now() - 30000,
          retryCount: 1,
          nextRetryAt: Date.now() + 10000,
        },
      ];
      sessionStorage.setItem('txRetryQueue', JSON.stringify(queue));
    });

    await page.reload();
    await page.waitForTimeout(2000);

    const banner = page.locator('text=1 pending transaction');
    await expect(banner).toBeVisible({ timeout: 5000 });

    const viewDetailsButton = page.getByText('View Details');
    await viewDetailsButton.click();

    const txHashCell = page.locator('text=abcdef');
    await expect(txHashCell).toBeVisible();

    const retryCell = page.locator('text=1/3');
    await expect(retryCell).toBeVisible();
  });
});
