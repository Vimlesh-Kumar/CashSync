import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import React from "react";
import { Platform, StyleSheet, View } from "react-native";

const ACCENT = "#00F260";
const MUTED = "#A1A1AA";
const CARD_BG = "#09090B";
const BORDER = "#27272A";

function TabIcon({
  icon,
  focused,
  label,
}: {
  icon: any;
  focused: boolean;
  label: string;
}) {
  return (
    <View style={[ti.wrap, focused && ti.wrapActive]}>
      <Ionicons name={icon} style={[ti.icon, focused && ti.iconActive]} />
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
            <TabIcon
              icon={focused ? "home" : "home-outline"}
              focused={focused}
              label="Home"
            />
          ),
        }}
      />
      <Tabs.Screen
        name="insights"
        options={{
          title: "Analytics",
          tabBarIcon: ({ focused }) => (
            <TabIcon
              icon={focused ? "bar-chart" : "bar-chart-outline"}
              focused={focused}
              label="Analytics"
            />
          ),
        }}
      />
      <Tabs.Screen
        name="split"
        options={{
          title: "Split",
          tabBarIcon: ({ focused }) => (
            <TabIcon
              icon={focused ? "git-network" : "git-network-outline"}
              focused={focused}
              label="Split"
            />
          ),
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: "Cards",
          tabBarIcon: ({ focused }) => (
            <TabIcon
              icon={focused ? "card" : "card-outline"}
              focused={focused}
              label="Cards"
            />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ focused }) => (
            <TabIcon
              icon={focused ? "person" : "person-outline"}
              focused={focused}
              label="Profile"
            />
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
