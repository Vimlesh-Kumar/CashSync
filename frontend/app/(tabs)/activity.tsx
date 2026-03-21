import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect } from "@react-navigation/native";
import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/src/context/AuthContext";
import { useAppTheme } from "@/src/context/ThemeContext";
import {
  ActivityLog,
  getActivityForUser,
} from "@/src/features/activity/api/activity.api";

const ACTION_META: Record<string, { icon: keyof typeof Ionicons.glyphMap; label: string; color: string }> = {
  CREATE_TRANSACTION:  { icon: "cash-outline", label: "Added expense",        color: "#EF4444" },
  SETTLE_SPLIT:        { icon: "checkmark-circle-outline", label: "Settled up",           color: "#22C55E" },
  ADD_MEMBER:          { icon: "person-add-outline", label: "Added member",         color: "#6366F1" },
  CREATE_GROUP:        { icon: "people-outline", label: "Created group",        color: "#0EA5E9" },
  CREATE_RECURRING:    { icon: "repeat-outline", label: "Set up recurring bill", color: "#F59E0B" },
  RECURRING_TRIGGERED: { icon: "flash-outline", label: "Recurring bill fired", color: "#F97316" },
};

function friendlyAction(action: string) {
  return ACTION_META[action] ?? { icon: "document-text-outline" as keyof typeof Ionicons.glyphMap, label: action.replace(/_/g, " ").toLowerCase(), color: "#64748B" };
}

function timeAgo(dateStr: string) {
  const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export default function ActivityScreen() {
  const { user } = useAuth();
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    try {
      const data = await getActivityForUser(user.id, 60);
      setLogs(data);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    void load();
  }, [load]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <LinearGradient colors={colors.gradient} style={StyleSheet.absoluteFill} />

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}
      >
        <Text style={styles.title}>Activity Feed</Text>
        <Text style={styles.subtitle}>Everything that happened in your account</Text>

        {loading ? (
          <ActivityIndicator color={colors.accent} style={{ marginTop: 32 }} />
        ) : logs.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="mail-unread-outline" size={48} color={colors.textMuted} />
            <Text style={styles.emptyText}>No activity yet. Start splitting expenses!</Text>
          </View>
        ) : (
          <View style={styles.feed}>
            {logs.map((log) => {
              const { icon, label, color } = friendlyAction(log.action);
              const meta = (log.metadata ?? {}) as Record<string, unknown>;
              return (
                <View key={log.id} style={styles.logRow}>
                  <View style={[styles.iconBadge, { backgroundColor: `${color}22` }]}>
                    <Ionicons name={icon} size={20} color={color} />
                  </View>
                  <View style={styles.logContent}>
                    <Text style={styles.logLabel}>
                      <Text style={styles.actorName}>
                        {log.user?.name ?? log.user?.email?.split("@")[0] ?? "Someone"}
                      </Text>{" "}
                      {label}
                      {meta.title ? (
                        <Text style={styles.logMeta}> · {String(meta.title)}</Text>
                      ) : null}
                      {meta.amount ? (
                        <Text style={[styles.logMeta, { color }]}>
                          {" "}· {String(meta.currency ?? "₹")}{Number(meta.amount).toLocaleString()}
                        </Text>
                      ) : null}
                    </Text>
                    <Text style={styles.timeAgo}>{timeAgo(log.createdAt)}</Text>
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const createStyles = (colors: ReturnType<typeof useAppTheme>["colors"]) =>
  StyleSheet.create({
    scroll: {
      paddingHorizontal: 18,
      paddingTop: Platform.OS === "web" ? 40 : 58,
      paddingBottom: 110,
      maxWidth: 760,
      width: "100%",
      alignSelf: "center",
      gap: 8,
    },
    title: { color: colors.text, fontSize: 27, fontWeight: "800", letterSpacing: -0.4 },
    subtitle: { color: colors.textMuted, fontSize: 12, marginBottom: 12 },
    feed: { gap: 2 },
    logRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: `${colors.border}55`,
    },
    iconBadge: {
      width: 42,
      height: 42,
      borderRadius: 12,
      alignItems: "center",
      justifyContent: "center",
    },
    icon: { fontSize: 20 },
    logContent: { flex: 1, gap: 2 },
    logLabel: { color: colors.text, fontSize: 13, lineHeight: 18 },
    actorName: { fontWeight: "700" },
    logMeta: { color: colors.textMuted, fontWeight: "400" },
    timeAgo: { color: colors.textMuted, fontSize: 11 },
    empty: { alignItems: "center", gap: 12, marginTop: 60 },
    emptyIcon: { fontSize: 48 },
    emptyText: { color: colors.textMuted, textAlign: "center", fontSize: 14 },
  });
