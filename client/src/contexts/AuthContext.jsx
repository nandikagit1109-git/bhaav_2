import React, { createContext, useContext, useState, useCallback } from 'react';

const AuthContext = createContext(null);

const STORAGE_KEY = 'bhaav_user_id';

/**
 * Generate a random anonymous user ID.
 */
function generateUserId() {
  return 'u_' + crypto.randomUUID().replace(/-/g, '').slice(0, 16);
}

/**
 * AuthProvider — lightweight anonymous user identity.
 *
 * No login, no signup, no JWT, no passwords.
 * Each person gets a random user_id stored in localStorage.
 * The recovery-code system lets them restore access on a new device.
 *
 * We keep the "AuthContext" name for minimal churn, but this is
 * purely an identity provider — not an authentication gate.
 */
export function AuthProvider({ children }) {
  const [userId] = useState(() => {
    let id = localStorage.getItem(STORAGE_KEY);
    if (!id) {
      id = generateUserId();
      localStorage.setItem(STORAGE_KEY, id);
    }
    return id;
  });

  const user = { id: userId };

  return (
    <AuthContext.Provider value={{ user, loading: false, isAuthenticated: true }}>
      {children}
    </AuthContext.Provider>
  );
}

/**
 * Hook to access user context.
 * Provides: { user: { id }, loading, isAuthenticated }
 */
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider');
  }
  return context;
}
