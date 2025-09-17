import { test, expect } from '@playwright/test'

test.describe('Inbox Page', () => {
  test.beforeEach(async ({ page }) => {
    // Mock authentication
    await page.goto('/inbox')
    
    // Mock the session data
    await page.addInitScript(() => {
      window.localStorage.setItem('nextauth.session', JSON.stringify({
        user: {
          id: 'test-user-id',
          email: 'test@example.com',
          name: 'Test User',
          role: 'OWNER'
        },
        expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      }))
    })
  })

  test('should display inbox page', async ({ page }) => {
    await page.goto('/inbox')
    
    // Check if the page loads
    await expect(page.getByText('Review Inbox')).toBeVisible()
    await expect(page.getByText('Filters')).toBeVisible()
    await expect(page.getByText('Reviews')).toBeVisible()
  })

  test('should show filters section', async ({ page }) => {
    await page.goto('/inbox')
    
    // Check filter options
    await expect(page.getByText('Platform')).toBeVisible()
    await expect(page.getByText('Status')).toBeVisible()
    await expect(page.getByText('Rating')).toBeVisible()
    await expect(page.getByText('Search')).toBeVisible()
  })

  test('should display empty state when no reviews selected', async ({ page }) => {
    await page.goto('/inbox')
    
    // Check empty state
    await expect(page.getByText('Select a Review')).toBeVisible()
    await expect(page.getByText('Choose a review from the list to view details and respond.')).toBeVisible()
  })

  test('should show reply generation interface', async ({ page }) => {
    await page.goto('/inbox')
    
    // Check reply interface elements
    await expect(page.getByText('Reply')).toBeVisible()
    await expect(page.getByText('Create Ticket')).toBeVisible()
    await expect(page.getByText('Tone')).toBeVisible()
    await expect(page.getByText('Generate AI Reply')).toBeVisible()
  })
})
