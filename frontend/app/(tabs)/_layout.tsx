import { Tabs } from "expo-router";
import React from "react";
import { Platform, StyleSheet, Text, View } from "react-native";

const ACCENT = "#4F8EF7";
const MUTED = "#3D4E68";
const CARD_BG = "#111827";
const BORDER = "#1A2235";

function TabIcon({
  icon,
  focused,
  label,
}: {
  icon: string;
  focused: boolean;
  label: string;
}) {
  return (
    <View style={[ti.wrap, focused && ti.wrapActive]}>
      <Text style={[ti.icon, focused && ti.iconActive]}>{icon}</Text>
    </View>
  );
}

const ti = StyleSheet.create({
  wrap: {
    width: 48,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  wrapActive: { backgroundColor: ACCENT + "22" },
  icon: { fontSize: 20, color: MUTED },
  iconActive: { color: ACCENT },
});

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.bar,
        tabBarBackground: () => (
          <View
            style={[
              StyleSheet.absoluteFill,
              {
                backgroundColor: CARD_BG + "F5",
                borderTopWidth: 1,
                borderTopColor: BORDER,
              },
            ]}
          />
        ),
        tabBarActiveTintColor: ACCENT,
        tabBarInactiveTintColor: MUTED,
        tabBarLabelStyle: styles.label,
        tabBarShowLabel: true,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ focused }) => (
            <TabIcon icon="⌂" focused={focused} label="Home" />
          ),
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: "Transactions",
          tabBarIcon: ({ focused }) => (
            <TabIcon icon="≡" focused={focused} label="Transactions" />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: "absolute",
    height: Platform.OS === "ios" ? 82 : 68,
    paddingBottom: Platform.OS === "ios" ? 20 : 10,
    paddingTop: 10,
    borderTopWidth: 0,
    backgroundColor: "transparent",
  },
  label: { fontSize: 11, fontWeight: "600", letterSpacing: 0.1, marginTop: -2 },
});
