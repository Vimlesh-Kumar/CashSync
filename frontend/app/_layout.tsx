import { AuthProvider, useAuth } from "@/src/context/AuthContext";
import { ThemeProvider, useAppTheme } from "@/src/context/ThemeContext";
import * as SystemUI from "expo-system-ui";
import { Redirect, Stack, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";

import AuthScreen from "./index";

/**
 * AuthGate: sits between the provider and screens.
 * It reads auth state from context and redirects accordingly.
 * This runs ONCE per navigation state change, never per-screen.
 */
function AuthGate() {
  const { user, initialising } = useAuth();
  const { colors, ready } = useAppTheme();
  const segments = useSegments();
  const inTabsGroup = segments[0] === "(tabs)";

  // Show a full-screen splash while we check AsyncStorage
  if (initialising || !ready) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: colors.background,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <ActivityIndicator color={colors.accent} size="large" />
      </View>
    );
  }

  if (!user) {
    return <AuthScreen />;
  }

  if (user && !inTabsGroup) {
    return <Redirect href="/(tabs)" />;
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: "none",
        contentStyle: {
          backgroundColor: colors.background,
        },
      }}
    />
  );
}

/**
 * Root layout — wraps everything in AuthProvider so every
 * screen can access auth state via useAuth().
 */
export default function RootLayout() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <RootShell />
      </AuthProvider>
    </ThemeProvider>
  );
}

function RootShell() {
  const { resolvedTheme, colors } = useAppTheme();

  useEffect(() => {
    void SystemUI.setBackgroundColorAsync(colors.background);
  }, [colors.background]);

  return (
    <>
      <StatusBar style={resolvedTheme === "dark" ? "light" : "dark"} />
      <AuthGate />
    </>
  );
}
