import { AuthProvider, useAuth } from "@/src/context/AuthContext";
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
  const segments = useSegments();
  const inTabsGroup = segments[0] === "(tabs)";

  // Show a full-screen splash while we check AsyncStorage
  if (initialising) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: "#0D1117",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <ActivityIndicator color="#4F8EF7" size="large" />
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
          backgroundColor: "#0D1117",
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
  useEffect(() => {
    void SystemUI.setBackgroundColorAsync("#0D1117");
  }, []);

  return (
    <AuthProvider>
      <StatusBar style="light" />
      <AuthGate />
    </AuthProvider>
  );
}
