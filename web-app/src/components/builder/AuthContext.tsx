import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { ref, get, set } from 'firebase/database';
import { database } from './firebaseConfig';

// Simple hash function for passwords (not cryptographically secure, but fine for this use case)
const simpleHash = (str: string): string => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(36);
};

export interface User {
  id: string;
  name: string;
}

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  error: string | null;
  login: (name: string, password: string) => Promise<boolean>;
  createAccount: (name: string, password: string) => Promise<boolean>;
  logout: () => void;
  changePassword: (oldPassword: string, newPassword: string) => Promise<boolean>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const AUTH_STORAGE_KEY = 'activity-builder-auth';
const BOOTSTRAP_KEY = 'activity-builder-bootstrap-v1';

// Initial accounts to bootstrap
const INITIAL_ACCOUNTS = [
  { id: 'nigel-nisbet', name: 'Nigel Nisbet', password: 'C@m3r0onN' },
  { id: 'pl', name: 'PL', password: 'pldelivery2026' },
];

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Bootstrap initial accounts on first load
  useEffect(() => {
    const bootstrapAccounts = async () => {
      // Check if we've already bootstrapped
      const bootstrapped = localStorage.getItem(BOOTSTRAP_KEY);
      if (bootstrapped) return;

      try {
        for (const account of INITIAL_ACCOUNTS) {
          const userRef = ref(database, `builderUsers/${account.id}`);
          const snapshot = await get(userRef);

          if (!snapshot.exists()) {
            await set(userRef, {
              name: account.name,
              passwordHash: simpleHash(account.password),
              createdAt: Date.now(),
            });
            console.log(`Created initial account: ${account.name}`);
          }
        }

        // Also assign "Changing the world" presentation to Nigel if it exists
        const presentationsRef = ref(database, 'presentations');
        const presSnapshot = await get(presentationsRef);
        if (presSnapshot.exists()) {
          const data = presSnapshot.val();
          for (const id of Object.keys(data)) {
            const title = data[id].config?.title || '';
            const currentOwner = data[id].config?.ownerId;
            if (title.toLowerCase().includes('changing the world') && !currentOwner) {
              await set(ref(database, `presentations/${id}/config/ownerId`), 'nigel-nisbet');
              console.log(`Assigned "${title}" to Nigel Nisbet`);
            }
          }
        }

        localStorage.setItem(BOOTSTRAP_KEY, 'true');
      } catch (err) {
        console.error('Bootstrap error (may be expected if rules not updated):', err);
      }
    };

    bootstrapAccounts();
  }, []);

  // Check for existing session on mount
  useEffect(() => {
    const stored = localStorage.getItem(AUTH_STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setUser(parsed);
      } catch {
        localStorage.removeItem(AUTH_STORAGE_KEY);
      }
    }
    setLoading(false);
  }, []);

  const login = useCallback(async (name: string, password: string): Promise<boolean> => {
    setError(null);
    setLoading(true);

    try {
      // Normalize the name for ID lookup
      const userId = name.toLowerCase().replace(/\s+/g, '-');
      const userRef = ref(database, `builderUsers/${userId}`);
      const snapshot = await get(userRef);

      if (!snapshot.exists()) {
        setError('Account not found');
        setLoading(false);
        return false;
      }

      const userData = snapshot.val();
      const passwordHash = simpleHash(password);

      if (userData.passwordHash !== passwordHash) {
        setError('Incorrect password');
        setLoading(false);
        return false;
      }

      const loggedInUser: User = {
        id: userId,
        name: userData.name,
      };

      setUser(loggedInUser);
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(loggedInUser));
      setLoading(false);
      return true;
    } catch (err) {
      setError('Login failed. Please try again.');
      console.error('Login error:', err);
      setLoading(false);
      return false;
    }
  }, []);

  const createAccount = useCallback(async (name: string, password: string): Promise<boolean> => {
    setError(null);
    setLoading(true);

    try {
      const userId = name.toLowerCase().replace(/\s+/g, '-');
      const userRef = ref(database, `builderUsers/${userId}`);
      const snapshot = await get(userRef);

      if (snapshot.exists()) {
        setError('An account with this name already exists');
        setLoading(false);
        return false;
      }

      const passwordHash = simpleHash(password);
      await set(userRef, {
        name,
        passwordHash,
        createdAt: Date.now(),
      });

      const newUser: User = {
        id: userId,
        name,
      };

      setUser(newUser);
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(newUser));
      setLoading(false);
      return true;
    } catch (err) {
      setError('Account creation failed. Please try again.');
      console.error('Create account error:', err);
      setLoading(false);
      return false;
    }
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    localStorage.removeItem(AUTH_STORAGE_KEY);
  }, []);

  const changePassword = useCallback(async (oldPassword: string, newPassword: string): Promise<boolean> => {
    if (!user) {
      setError('Not logged in');
      return false;
    }

    setError(null);

    try {
      const userRef = ref(database, `builderUsers/${user.id}`);
      const snapshot = await get(userRef);

      if (!snapshot.exists()) {
        setError('User not found');
        return false;
      }

      const userData = snapshot.val();
      const oldHash = simpleHash(oldPassword);

      if (userData.passwordHash !== oldHash) {
        setError('Current password is incorrect');
        return false;
      }

      const newHash = simpleHash(newPassword);
      await set(userRef, {
        ...userData,
        passwordHash: newHash,
        updatedAt: Date.now(),
      });

      return true;
    } catch (err) {
      setError('Failed to change password');
      console.error('Change password error:', err);
      return false;
    }
  }, [user]);

  return (
    <AuthContext.Provider value={{ user, loading, error, login, createAccount, logout, changePassword }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextValue => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
