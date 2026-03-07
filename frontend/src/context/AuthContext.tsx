import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface AuthUser {
  id: string;
  email: string;
  name?: string;
  provider: string;
  createdAt: string;
}

interface AuthContextValue {
  /** The logged-in user, or null when not authenticated */
  user: AuthUser | null;
  /** JWT token */
  token: string | null;
  /** True while we are reading AsyncStorage on cold start */
  initialising: boolean;
  /** Call this after a successful sync to persist the session */
  signIn: (user: AuthUser, token: string) => Promise<void>;
  /** Wipes the session and sends the user back to login */
  signOut: () => Promise<void>;
}

// ─── Context ─────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextValue>({
  user: null,
  token: null,
  initialising: true,
  signIn: async () => {},
  signOut: async () => {},
});

// ─── Provider ────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [initialising, setInitialising] = useState(true);

  // Restore session on cold start
  useEffect(() => {
    const restore = async () => {
      try {
        const [storedUser, storedToken] = await AsyncStorage.multiGet([
          "user",
          "token",
        ]);

        const userVal = storedUser[1];
        const tokenVal = storedToken[1];

        if (userVal) setUser(JSON.parse(userVal));
        if (tokenVal) setToken(tokenVal);
      } catch (err) {
        console.warn("AuthContext: failed to restore session", err);
      } finally {
        setInitialising(false);
      }
    };
    restore();
  }, []);

  const signIn = useCallback(async (newUser: AuthUser, newToken: string) => {
    await AsyncStorage.multiSet([
      ["user", JSON.stringify(newUser)],
      ["token", newToken],
    ]);
    setUser(newUser);
    setToken(newToken);
  }, []);

  const signOut = useCallback(async () => {
    await AsyncStorage.multiRemove(["user", "token"]);
    setUser(null);
    setToken(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, token, initialising, signIn, signOut }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useAuth() {
  return useContext(AuthContext);
}
