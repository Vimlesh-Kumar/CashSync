import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { useAuth } from "@/src/context/AuthContext";
import { useAppTheme } from "@/src/context/ThemeContext";
import {
  createTransaction,
  getStats,
  getTransactions,
  Transaction,
  TransactionStats,
} from "@/src/features/transaction";

const CATEGORY_META: Record<string, { icon: keyof typeof Ionicons.glyphMap; color: string }> = {
  "Food & Groceries": { icon: "fast-food", color: "#FF6B6B" },
  Subscriptions: { icon: "play-circle", color: "#FFD93D" },
  Transport: { icon: "car", color: "#4ECDC4" },
  Salary: { icon: "cash", color: "#10B981" },
  Shopping: { icon: "cart", color: "#C689C6" },
  Healthcare: { icon: "medkit", color: "#F87171" },
  Housing: { icon: "home", color: "#60A5FA" },
  Utilities: { icon: "flash", color: "#F59E0B" },
  Investments: { icon: "trending-up", color: "#8B5CF6" },
  General: { icon: "wallet", color: "#94A3B8" },
};

function getCategoryMeta(cat: string) {
  return CATEGORY_META[cat] || CATEGORY_META.General;
}

export default function HomeScreen() {
  const { user } = useAuth();
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const router = useRouter();
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [stats, setStats] = useState<TransactionStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async (silent = false) => {
    if (!user) return;
    try {
      if (!silent) setLoading(true);
      const [txRes, statsRes] = await Promise.all([
        getTransactions(user.id, { limit: 20 }),
        getStats(user.id),
      ]);

      if (txRes.transactions.length === 0) {
        const seeds = [
          {
            title: "Swiggy",
            amount: 349,
            type: "EXPENSE",
            isPersonal: false,
            category: "Food & Groceries",
            authorId: user.id,
          },
          {
            title: "Salary Credit",
            amount: 75000,
            type: "INCOME",
            isPersonal: true,
            category: "Salary",
            authorId: user.id,
          },
        ] as const;
        await Promise.all(seeds.map((s) => createTransaction(s)));
        const [refreshedTx, refreshedStats] = await Promise.all([
          getTransactions(user.id, { limit: 20 }),
          getStats(user.id),
        ]);
        setTransactions(refreshedTx.transactions);
        setStats(refreshedStats);
      } else {
        setTransactions(txRes.transactions);
        setStats(statsRes);
      }

      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }).start();
    } catch (err: any) {
      setError(err.message || "Failed to load dashboard");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    void load();
  }, [user]);

  if (loading) {
    return (
      <View style={styles.center}>
        <LinearGradient colors={colors.gradient} style={StyleSheet.absoluteFill} />
        <ActivityIndicator color={colors.accent} size="large" />
        <Text style={styles.mutedText}>Loading your finances…</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={[styles.mutedText, { color: colors.danger }]}>{error}</Text>
      </View>
    );
  }

  const displayName = user?.name || "User";
  const netBalance = (stats?.income || 0) - (stats?.expense || 0);

  return (
    <View style={styles.root}>
      <LinearGradient colors={colors.gradient} style={StyleSheet.absoluteFill} />
      <Animated.ScrollView
        style={{ flex: 1, opacity: fadeAnim }}
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              void load(true);
            }}
            tintColor={colors.accent}
          />
        }
      >
        <View style={styles.header}>
          <Text style={styles.title}>Welcome, {displayName.split(" ")[0]}</Text>
          <Pressable onPress={() => router.push("/(tabs)/profile")}> 
            <Ionicons name="person-circle" size={34} color={colors.accent} />
          </Pressable>
        </View>

        <View style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>Net Balance</Text>
          <Text style={[styles.balanceValue, { color: netBalance >= 0 ? colors.text : colors.danger }]}> 
            ₹{Math.abs(netBalance).toLocaleString("en-IN")}
          </Text>
          <View style={styles.metricsRow}>
            <View>
              <Text style={styles.metricLabel}>Income</Text>
              <Text style={[styles.metricValue, { color: colors.success }]}>₹{(stats?.income || 0).toLocaleString("en-IN")}</Text>
            </View>
            <View>
              <Text style={styles.metricLabel}>Expense</Text>
              <Text style={[styles.metricValue, { color: colors.danger }]}>₹{(stats?.expense || 0).toLocaleString("en-IN")}</Text>
            </View>
          </View>
        </View>

        <View style={styles.quickRow}>
          <Action icon="card-outline" label="Transactions" onPress={() => router.push("/(tabs)/explore")} color={colors.accent} styles={styles} />
          <Action icon="bar-chart-outline" label="Insights" onPress={() => router.push("/(tabs)/insights")} color={colors.purple} styles={styles} />
          <Action icon="people-outline" label="Split" onPress={() => router.push("/(tabs)/split")} color={colors.success} styles={styles} />
        </View>

        <View style={styles.sectionHead}>
          <Text style={styles.sectionTitle}>Recent Activity</Text>
          <Pressable onPress={() => router.push("/(tabs)/explore")}> 
            <Text style={styles.link}>View all</Text>
          </Pressable>
        </View>

        {transactions.slice(0, 6).map((tx) => {
          const meta = getCategoryMeta(tx.category);
          const isCredit = tx.type === "INCOME";
          return (
            <View key={tx.id} style={styles.txRow}>
              <View style={[styles.txIcon, { backgroundColor: `${meta.color}22` }]}> 
                <Ionicons name={meta.icon} size={18} color={meta.color} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.txTitle} numberOfLines={1}>{tx.title}</Text>
                <Text style={styles.txMeta}>{tx.category}</Text>
              </View>
              <Text style={[styles.txAmount, { color: isCredit ? colors.success : colors.text }]}> 
                {isCredit ? "+" : "-"}₹{tx.amount.toLocaleString("en-IN")}
              </Text>
            </View>
          );
        })}
      </Animated.ScrollView>
    </View>
  );
}

function Action({
  icon,
  label,
  onPress,
  color,
  styles,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  color: string;
  styles: ReturnType<typeof createStyles>;
}) {
  return (
    <Pressable style={styles.action} onPress={onPress}>
      <Ionicons name={icon} size={22} color={color} />
      <Text style={styles.actionText}>{label}</Text>
    </Pressable>
  );
}

const createStyles = (colors: ReturnType<typeof useAppTheme>["colors"]) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.background },
    center: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.background,
      gap: 10,
    },
    mutedText: { color: colors.textMuted, fontSize: 14 },
    scroll: {
      paddingHorizontal: 18,
      paddingTop: Platform.OS === "web" ? 40 : 58,
      paddingBottom: 120,
      maxWidth: 720,
      width: "100%",
      alignSelf: "center",
      gap: 14,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 6,
    },
    title: { color: colors.text, fontSize: 25, fontWeight: "800" },
    balanceCard: {
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 18,
      padding: 18,
      gap: 8,
    },
    balanceLabel: { color: colors.textMuted, fontWeight: "600" },
    balanceValue: { fontSize: 34, fontWeight: "800" },
    metricsRow: {
      marginTop: 8,
      flexDirection: "row",
      justifyContent: "space-between",
    },
    metricLabel: { color: colors.textMuted, fontSize: 12 },
    metricValue: { fontWeight: "700", marginTop: 2 },
    quickRow: { flexDirection: "row", gap: 10 },
    action: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
      paddingVertical: 12,
      borderRadius: 14,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
    },
    actionText: { color: colors.textSecondary, fontWeight: "600", fontSize: 12 },
    sectionHead: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginTop: 6,
    },
    sectionTitle: { color: colors.text, fontSize: 18, fontWeight: "700" },
    link: { color: colors.accent, fontWeight: "600" },
    txRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      padding: 14,
      borderRadius: 16,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
    },
    txIcon: {
      width: 40,
      height: 40,
      borderRadius: 12,
      alignItems: "center",
      justifyContent: "center",
    },
    txTitle: { color: colors.text, fontWeight: "600" },
    txMeta: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
    txAmount: { fontWeight: "700" },
  });
