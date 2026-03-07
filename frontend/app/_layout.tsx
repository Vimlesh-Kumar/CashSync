import { AuthProvider, useAuth } from "@/src/context/AuthContext";
import { Slot, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";

/**
 * AuthGate: sits between the provider and screens.
 * It reads auth state from context and redirects accordingly.
 * This runs ONCE per navigation state change, never per-screen.
 */
function AuthGate() {
  const { user, initialising } = useAuth();
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    if (initialising) return; // wait until storage is checked

    const inAuthGroup = segments[0] !== "(tabs)";

    if (user && inAuthGroup) {
      // Logged in → send to dashboard
      router.replace("/(tabs)");
    } else if (!user && !inAuthGroup) {
      // Not logged in → send to login
      router.replace("/");
    }
  }, [user, initialising, segments]);

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

  return <Slot />;
}

/**
 * Root layout — wraps everything in AuthProvider so every
 * screen can access auth state via useAuth().
 */
export default function RootLayout() {
  return (
    <AuthProvider>
      <StatusBar style="light" />
      <AuthGate />
    </AuthProvider>
  );
}
