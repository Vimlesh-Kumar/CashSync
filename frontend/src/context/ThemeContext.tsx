import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useColorScheme as useSystemColorScheme } from "react-native";

export type ThemePreference = "system" | "light" | "dark";
export type ResolvedTheme = "light" | "dark";

export interface AppThemeColors {
  background: string;
  backgroundAlt: string;
  surface: string;
  card: string;
  border: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  accent: string;
  accentSoft: string;
  success: string;
  danger: string;
  warning: string;
  purple: string;
  input: string;
  gradient: [string, string, string];
}

const STORAGE_KEY = "theme_preference";

const darkColors: AppThemeColors = {
  background: "#0D1117",
  backgroundAlt: "#111827",
  surface: "#0A0A0A",
  card: "#161D2C",
  border: "#1E2D46",
  text: "#FFFFFF",
  textSecondary: "#D4D4D8",
  textMuted: "#8B9AB3",
  accent: "#4F8EF7",
  accentSoft: "rgba(79, 142, 247, 0.14)",
  success: "#34D399",
  danger: "#F87171",
  warning: "#FBBF24",
  purple: "#9B59F5",
  input: "#0D1117",
  gradient: ["#0D1117", "#111827", "#0D1117"],
};

const lightColors: AppThemeColors = {
  background: "#F3F6FB",
  backgroundAlt: "#E7EEF8",
  surface: "#FFFFFF",
  card: "#FFFFFF",
  border: "#D6E0EE",
  text: "#0F172A",
  textSecondary: "#334155",
  textMuted: "#64748B",
  accent: "#2563EB",
  accentSoft: "rgba(37, 99, 235, 0.12)",
  success: "#059669",
  danger: "#DC2626",
  warning: "#D97706",
  purple: "#7C3AED",
  input: "#FFFFFF",
  gradient: ["#F8FAFC", "#EEF4FF", "#F8FAFC"],
};

interface ThemeContextValue {
  preference: ThemePreference;
  resolvedTheme: ResolvedTheme;
  colors: AppThemeColors;
  ready: boolean;
  setPreference: (next: ThemePreference) => Promise<void>;
}

const ThemeContext = createContext<ThemeContextValue>({
  preference: "system",
  resolvedTheme: "dark",
  colors: darkColors,
  ready: false,
  setPreference: async () => {},
});

export function ThemeProvider({ children }: Readonly<{ children: React.ReactNode }>) {
  const systemTheme = useSystemColorScheme();
  const [preference, setPreferenceState] = useState<ThemePreference>("system");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const restorePreference = async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (stored === "light" || stored === "dark" || stored === "system") {
          setPreferenceState(stored);
        }
      } catch (error) {
        console.warn("ThemeContext: failed to restore preference", error);
      } finally {
        setReady(true);
      }
    };

    void restorePreference();
  }, []);

  const setPreference = async (next: ThemePreference) => {
    setPreferenceState(next);
    await AsyncStorage.setItem(STORAGE_KEY, next);
  };

  const resolvedTheme: ResolvedTheme = useMemo(() => {
    if (preference === "system") {
      return systemTheme === "light" ? "light" : "dark";
    }
    return preference;
  }, [preference, systemTheme]);

  const colors = resolvedTheme === "light" ? lightColors : darkColors;

  const value = useMemo(
    () => ({
      preference,
      resolvedTheme,
      colors,
      ready,
      setPreference,
    }),
    [preference, resolvedTheme, colors, ready],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useAppTheme() {
  return useContext(ThemeContext);
}
