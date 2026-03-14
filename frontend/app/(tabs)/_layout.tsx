import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import React from "react";
import { Platform, StyleSheet, View } from "react-native";
import { useAppTheme } from "@/src/context/ThemeContext";

type TabIconProps = Readonly<{
  icon: any;
  focused: boolean;
  accent: string;
  muted: string;
}>;

function TabIcon({
  icon,
  focused,
  accent,
  muted,
}: TabIconProps) {
  return (
    <View style={[ti.wrap, focused && { backgroundColor: `${accent}22` }]}>
      <Ionicons
        name={icon}
        style={[
          ti.icon,
          { color: muted },
          focused && { color: accent },
        ]}
      />
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
  icon: { fontSize: 20 },
});

export default function TabLayout() {
  const { colors } = useAppTheme();

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
                backgroundColor: colors.card + "F5",
                borderTopWidth: 1,
                borderTopColor: colors.border,
              },
            ]}
          />
        ),
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textMuted,
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
              accent={colors.accent}
              muted={colors.textMuted}
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
              accent={colors.accent}
              muted={colors.textMuted}
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
              accent={colors.accent}
              muted={colors.textMuted}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: "Transactions",
          tabBarIcon: ({ focused }) => (
            <TabIcon
              icon={focused ? "card" : "card-outline"}
              focused={focused}
              accent={colors.accent}
              muted={colors.textMuted}
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
              accent={colors.accent}
              muted={colors.textMuted}
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
