import { AuthProvider, useAuth } from "@/src/context/AuthContext";
import { ingestSms } from "@/src/features/transaction";
import { beginSmsListener, getSmsAutoSyncEnabled } from "@/src/features/transaction/smsAutoSync";
import { ThemeProvider, useAppTheme } from "@/src/context/ThemeContext";
import * as SystemUI from "expo-system-ui";
import { Redirect, Stack, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useRef } from "react";
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
  const { user } = useAuth();
  const recentMessagesRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    void SystemUI.setBackgroundColorAsync(colors.background);
  }, [colors.background]);

  useEffect(() => {
    let active = true;
    let stopListening: (() => void) | undefined;

    const wireSmsAutoSync = async () => {
      if (!user) return;

      const enabled = await getSmsAutoSyncEnabled();
      if (!active || !enabled) return;

      stopListening = await beginSmsListener(async (rawSms) => {
        if (!active || !user) return;
        if (recentMessagesRef.current.has(rawSms)) return;

        recentMessagesRef.current.add(rawSms);
        setTimeout(() => {
          recentMessagesRef.current.delete(rawSms);
        }, 60_000);

        try {
          await ingestSms(rawSms, user.id);
        } catch (error) {
          console.warn("SMS auto-sync failed", error);
        }
      }, (message) => {
        console.warn("SMS listener error", message);
      });
    };

    void wireSmsAutoSync();

    return () => {
      active = false;
      stopListening?.();
    };
  }, [user]);

  return (
    <>
      <StatusBar style={resolvedTheme === "dark" ? "light" : "dark"} />
      <AuthGate />
    </>
  );
}
