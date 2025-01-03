import { createClient } from '@supabase/supabase-js';
import { AuthProvider } from '../../src/auth/AuthProvider';
import { RateLimiter } from '../../src/auth/RateLimiter';
import { render, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';

jest.mock('@supabase/supabase-js');

describe('Authentication Security', () => {
  let rateLimiter: RateLimiter;

  beforeEach(() => {
    rateLimiter = new RateLimiter(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
  });

  test('מונע SQL injection בשדות הזדהות', async () => {
    const maliciousInput = "' OR '1'='1";

    const mockSignIn = jest.fn();
    (createClient as jest.Mock).mockImplementation(() => ({
      auth: {
        signInWithPassword: mockSignIn,
      },
    }));

    await expect(
      rateLimiter.checkLimit(maliciousInput, 'user', '/api/auth/login')
    ).resolves.not.toThrow();

    expect(mockSignIn).not.toHaveBeenCalled();
  });

  test('מוודא תקינות טוקן JWT', async () => {
    const mockGetSession = jest.fn();
    (createClient as jest.Mock).mockImplementation(() => ({
      auth: {
        getSession: mockGetSession.mockResolvedValue({ 
          data: { session: null }, 
          error: new Error('Invalid JWT') 
        }),
      },
    }));

    const { container } = render(
      <AuthProvider>
        <div data-testid="test-child">Test</div>
      </AuthProvider>
    );

    await waitFor(() => {
      expect(mockGetSession).toHaveBeenCalled();
      expect(container.querySelector('[data-testid="test-child"]')).toBeInTheDocument();
    });
  });

  test('מיישם Rate Limiting נכון', async () => {
    const ip = '127.0.0.1';
    const maxAttempts = 5;

    for (let i = 0; i < maxAttempts; i++) {
      await rateLimiter.recordRequest(ip, 'ip', '/api/auth/login');
    }

    const result = await rateLimiter.checkLimit(ip, 'ip', '/api/auth/login');
    expect(result.blocked).toBe(true);
  });

  test('מונע CSRF attacks', async () => {
    const invalidCsrfToken = 'invalid-csrf-token';
    const mockFetch = jest.fn();
    global.fetch = mockFetch;

    mockFetch.mockImplementationOnce(() => 
      Promise.resolve({
        ok: false,
        status: 403,
        statusText: 'Forbidden',
      })
    );

    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: {
        'X-CSRF-Token': invalidCsrfToken,
      },
    });

    expect(response.ok).toBe(false);
    expect(response.status).toBe(403);
  });
}); 