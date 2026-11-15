import { describe, it, expect, beforeEach } from 'vitest';
import { getToken, setToken, getStoredUser, setStoredUser } from '../services/api';

class MockStorage {
  private store: Record<string, string> = {};

  getItem(key: string) {
    return this.store[key] || null;
  }
  setItem(key: string, value: string) {
    this.store[key] = String(value);
  }
  removeItem(key: string) {
    delete this.store[key];
  }
  clear() {
    this.store = {};
  }
}

describe('Client-Side Security & Session Storage', () => {
  let mockSession: MockStorage;
  let mockLocal: MockStorage;

  beforeEach(() => {
    mockSession = new MockStorage();
    mockLocal = new MockStorage();

    Object.defineProperty(window, 'sessionStorage', {
      value: mockSession,
      writable: true,
    });
    Object.defineProperty(window, 'localStorage', {
      value: mockLocal,
      writable: true,
    });
  });

  it('stores JWT token in sessionStorage, never in localStorage', () => {
    const testToken = 'jwt-test-token-12345';
    setToken(testToken);

    expect(window.sessionStorage.getItem('carecircle_token')).toBe(testToken);
    expect(window.localStorage.getItem('carecircle_token')).toBeNull();
    expect(getToken()).toBe(testToken);
  });

  it('removes token from sessionStorage on clear', () => {
    setToken('sample-token');
    expect(getToken()).toBe('sample-token');

    setToken(null);
    expect(window.sessionStorage.getItem('carecircle_token')).toBeNull();
    expect(getToken()).toBeNull();
  });

  it('stores user profile in sessionStorage only', () => {
    const user = {
      id: 1,
      name: 'Lakshmi Raman',
      email: 'lakshmi@example.com',
      phone: '9840012345',
      role: 'patient' as const,
    };

    setStoredUser(user);
    expect(window.sessionStorage.getItem('carecircle_user')).toBeTruthy();
    expect(window.localStorage.getItem('carecircle_user')).toBeNull();

    const retrieved = getStoredUser();
    expect(retrieved?.name).toBe('Lakshmi Raman');
    expect(retrieved?.role).toBe('patient');
  });
});
