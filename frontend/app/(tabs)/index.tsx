import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { useAuth } from "@/src/context/AuthContext";
import {
  createTransaction,
  getStats,
  getTransactions,
  Transaction,
  TransactionStats,
} from "@/src/features/transaction";

const ACCENT = "#4F8EF7";
const GREEN = "#34D399";
const RED = "#F87171";
const PURPLE = "#9B59F5";
const BG = "#0D1117";
const CARD_BG = "#161D2C";
const BORDER = "#1E2D46";
const MUTED = "#4A5568";
const TEXT_DIM = "#8B9AB3";

// ─── Category Icons ──────────────────────────────────────────────────────────

const CATEGORY_META: Record<string, { emoji: string; color: string }> = {
  "Food & Groceries": { emoji: "🍔", color: "#FF6B6B" },
  Subscriptions: { emoji: "🎬", color: "#FFD93D" },
  Transport: { emoji: "🚗", color: "#4ECDC4" },
  Salary: { emoji: "💰", color: GREEN },
  Shopping: { emoji: "🛍️", color: "#C689C6" },
  Healthcare: { emoji: "💊", color: "#F87171" },
  Housing: { emoji: "🏠", color: "#60A5FA" },
  Utilities: { emoji: "⚡", color: "#FBBF24" },
  Telecom: { emoji: "📱", color: "#34D399" },
  Investments: { emoji: "📈", color: PURPLE },
  "Cash Withdrawal": { emoji: "🏧", color: MUTED },
  Transfer: { emoji: "↔️", color: ACCENT },
  General: { emoji: "💸", color: MUTED },
};

function getCategoryMeta(cat: string) {
  return CATEGORY_META[cat] || CATEGORY_META["General"];
}

// ─── Mini Transaction Row ─────────────────────────────────────────────────────

function TxRow({ tx }: { tx: Transaction }) {
  const isCredit = tx.type === "INCOME";
  const meta = getCategoryMeta(tx.category);
  return (
    <View style={txStyles.row}>
      <View style={[txStyles.icon, { backgroundColor: meta.color + "20" }]}>
        <Text style={txStyles.emoji}>{meta.emoji}</Text>
      </View>
      <View style={txStyles.info}>
        <Text style={txStyles.title} numberOfLines={1}>
          {tx.title}
        </Text>
        <Text style={txStyles.meta}>
          {tx.category} ·{" "}
          {new Date(tx.date).toLocaleDateString("en-IN", {
            day: "numeric",
            month: "short",
          })}
        </Text>
      </View>
      <View style={txStyles.right}>
        <Text style={[txStyles.amount, { color: isCredit ? GREEN : "#fff" }]}>
          {isCredit ? "+" : "−"}₹{tx.amount.toLocaleString("en-IN")}
        </Text>
        {!tx.isPersonal && (
          <View style={txStyles.sharedPill}>
            <Text style={txStyles.sharedText}>Shared</Text>
          </View>
        )}
      </View>
    </View>
  );
}

const txStyles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: BORDER + "55",
  },
  icon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  emoji: { fontSize: 20 },
  info: { flex: 1, gap: 3 },
  title: { fontSize: 15, fontWeight: "600", color: "#fff" },
  meta: { fontSize: 12, color: TEXT_DIM },
  right: { alignItems: "flex-end", gap: 4 },
  amount: { fontSize: 15, fontWeight: "700" },
  sharedPill: {
    backgroundColor: ACCENT + "22",
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  sharedText: { fontSize: 10, color: ACCENT, fontWeight: "600" },
});

// ─── Stat Chip ────────────────────────────────────────────────────────────────

function StatChip({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color: string;
}) {
  return (
    <View style={chipStyles.wrap}>
      <View style={[chipStyles.dot, { backgroundColor: color }]} />
      <View>
        <Text style={chipStyles.label}>{label}</Text>
        <Text style={[chipStyles.value, { color }]}>{value}</Text>
      </View>
    </View>
  );
}

const chipStyles = StyleSheet.create({
  wrap: { flexDirection: "row", alignItems: "center", gap: 10, flex: 1 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  label: {
    fontSize: 11,
    color: "rgba(255,255,255,0.4)",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  value: { fontSize: 17, fontWeight: "700" },
});

// ─── Category Bar ─────────────────────────────────────────────────────────────

function CategoryBar({
  stats,
  total,
}: {
  stats: Array<{ name: string; total: number }>;
  total: number;
}) {
  if (!stats.length || total === 0) return null;
  const colors = [ACCENT, PURPLE, GREEN, "#F59E0B", RED, "#60A5FA"];
  return (
    <View style={{ gap: 10, marginTop: 4 }}>
      {stats.slice(0, 4).map((s, i) => (
        <View key={s.name} style={{ gap: 4 }}>
          <View
            style={{ flexDirection: "row", justifyContent: "space-between" }}
          >
            <Text style={{ color: TEXT_DIM, fontSize: 13 }}>
              {getCategoryMeta(s.name).emoji} {s.name}
            </Text>
            <Text style={{ color: "#fff", fontSize: 13, fontWeight: "600" }}>
              ₹{s.total.toLocaleString("en-IN")}
            </Text>
          </View>
          <View style={{ height: 4, backgroundColor: BORDER, borderRadius: 4 }}>
            <View
              style={{
                height: 4,
                width: `${Math.min((s.total / total) * 100, 100)}%`,
                backgroundColor: colors[i % colors.length],
                borderRadius: 4,
              }}
            />
          </View>
        </View>
      ))}
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function HomeScreen() {
  const { user, signOut } = useAuth();
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

      // Seed sample data if empty
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
          {
            title: "Netflix",
            amount: 649,
            type: "EXPENSE",
            isPersonal: true,
            category: "Subscriptions",
            authorId: user.id,
          },
          {
            title: "Uber Ride",
            amount: 220,
            type: "EXPENSE",
            isPersonal: true,
            category: "Transport",
            authorId: user.id,
          },
        ];
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
        duration: 500,
        useNativeDriver: true,
      }).start();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    load();
  }, [user]);

  if (loading) {
    return (
      <View style={[s.center, { backgroundColor: BG }]}>
        <LinearGradient
          colors={[BG, "#111827"]}
          style={StyleSheet.absoluteFill}
        />
        <View style={s.logoMark}>
          <Text style={s.logoText}>CS</Text>
        </View>
        <ActivityIndicator color={ACCENT} style={{ marginTop: 20 }} />
        <Text style={{ color: MUTED, marginTop: 10, fontSize: 14 }}>
          Loading your finances…
        </Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[s.center, { backgroundColor: BG }]}>
        <Text
          style={{
            color: RED,
            fontSize: 16,
            textAlign: "center",
            marginHorizontal: 32,
          }}
        >
          ⚠ {error}
        </Text>
        <Pressable style={s.btn} onPress={signOut}>
          <Text style={s.btnText}>Sign Out</Text>
        </Pressable>
      </View>
    );
  }

  const displayName = user?.name || "User";
  const initials = displayName
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const netBalance = (stats?.income || 0) - (stats?.expense || 0);

  return (
    <View style={[s.root]}>
      <LinearGradient
        colors={[BG, "#111827", BG]}
        style={StyleSheet.absoluteFill}
      />
      <View
        style={[s.blob, { top: -60, right: -60, backgroundColor: ACCENT }]}
      />
      <View
        style={[
          s.blob,
          {
            bottom: 100,
            left: -50,
            backgroundColor: PURPLE,
            width: 200,
            height: 200,
          },
        ]}
      />

      <Animated.ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={s.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              load(true);
            }}
            tintColor={ACCENT}
          />
        }
      >
        {/* ── Header ── */}
        <View style={s.header}>
          <View>
            <Text style={s.greeting}>{greeting} 👋</Text>
            <Text style={s.userName}>{displayName}</Text>
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <Pressable style={s.avatarCircle}>
              <Text style={s.avatarText}>{initials}</Text>
            </Pressable>
            <Pressable style={s.iconBtn} onPress={signOut}>
              <Text style={{ color: MUTED, fontSize: 15 }}>⎋</Text>
            </Pressable>
          </View>
        </View>

        {/* ── Net Worth Card ── */}
        <View style={s.balanceCard}>
          <LinearGradient
            colors={["#1A2580", "#0F1550"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[StyleSheet.absoluteFill, { borderRadius: 24 }]}
          />
          <View style={s.cardGlow} />
          <Text style={s.balLabel}>NET BALANCE</Text>
          <Text
            style={[s.balAmount, { color: netBalance >= 0 ? "#fff" : RED }]}
          >
            {netBalance >= 0 ? "+" : ""}₹
            {Math.abs(netBalance).toLocaleString("en-IN", {
              minimumFractionDigits: 2,
            })}
          </Text>
          <Text style={s.balEmail}>{user?.email}</Text>

          <View style={s.chipRow}>
            <StatChip
              label="Income"
              value={`₹${(stats?.income || 0).toLocaleString("en-IN")}`}
              color={GREEN}
            />
            <View style={s.divider} />
            <StatChip
              label="Expenses"
              value={`₹${(stats?.expense || 0).toLocaleString("en-IN")}`}
              color={RED}
            />
          </View>
        </View>

        {/* ── Quick Actions ── */}
        <View style={s.quickRow}>
          {[
            { icon: "➕", label: "Add", color: ACCENT, action: () => {} },
            { icon: "📲", label: "SMS", color: GREEN, action: () => {} },
            { icon: "👥", label: "Split", color: PURPLE, action: () => {} },
            {
              icon: "📊",
              label: "Analyse",
              color: "#F59E0B",
              action: () => {},
            },
          ].map((a) => (
            <Pressable key={a.label} style={s.qa} onPress={a.action}>
              <View style={[s.qaIcon, { backgroundColor: a.color + "22" }]}>
                <Text style={{ fontSize: 20 }}>{a.icon}</Text>
              </View>
              <Text style={s.qaLabel}>{a.label}</Text>
            </Pressable>
          ))}
        </View>

        {/* ── Spending Breakdown ── */}
        {stats?.topCategories && stats.topCategories.length > 0 && (
          <View style={s.card}>
            <Text style={s.cardTitle}>Spending Breakdown</Text>
            <CategoryBar stats={stats.topCategories} total={stats.expense} />
          </View>
        )}

        {/* ── Recent Transactions ── */}
        <View style={s.card}>
          <View style={s.cardHeader}>
            <Text style={s.cardTitle}>Recent Activity</Text>
            <Pressable onPress={() => router.push("/(tabs)/explore")}>
              <Text style={s.seeAll}>See all →</Text>
            </Pressable>
          </View>

          {transactions.length === 0 ? (
            <View style={s.empty}>
              <Text style={{ fontSize: 36 }}>💸</Text>
              <Text style={{ color: MUTED, marginTop: 8 }}>
                No transactions yet
              </Text>
            </View>
          ) : (
            transactions.slice(0, 5).map((tx) => <TxRow key={tx.id} tx={tx} />)
          )}
        </View>
      </Animated.ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  blob: {
    position: "absolute",
    borderRadius: 999,
    opacity: 0.08,
    width: 280,
    height: 280,
  },
  scroll: {
    paddingHorizontal: 18,
    paddingTop: Platform.OS === "web" ? 40 : 58,
    paddingBottom: 110,
    maxWidth: 640,
    alignSelf: "center",
    width: "100%",
  },

  // Header
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
  },
  greeting: { fontSize: 13, color: MUTED, marginBottom: 4 },
  userName: {
    fontSize: 26,
    fontWeight: "800",
    color: "#fff",
    letterSpacing: -0.4,
  },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: ACCENT,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: BORDER,
  },
  avatarText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: CARD_BG,
    borderWidth: 1,
    borderColor: BORDER,
    alignItems: "center",
    justifyContent: "center",
  },

  // Balance card
  balanceCard: {
    borderRadius: 24,
    padding: 24,
    marginBottom: 18,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#1E3A8A22",
    ...Platform.select({
      web: { boxShadow: "0 16px 48px rgba(79,142,247,0.2)" },
      default: {
        shadowColor: ACCENT,
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.2,
        shadowRadius: 20,
        elevation: 8,
      },
    }),
  },
  cardGlow: {
    position: "absolute",
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: ACCENT,
    opacity: 0.1,
    top: -50,
    right: -30,
  },
  balLabel: {
    fontSize: 11,
    color: "rgba(255,255,255,0.4)",
    letterSpacing: 1.5,
    textTransform: "uppercase",
    marginBottom: 6,
  },
  balAmount: {
    fontSize: 42,
    fontWeight: "800",
    letterSpacing: -1,
    marginBottom: 4,
  },
  balEmail: { fontSize: 12, color: "rgba(255,255,255,0.3)", marginBottom: 20 },
  chipRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  divider: { width: 1, height: 40, backgroundColor: "rgba(255,255,255,0.07)" },

  // Quick actions
  quickRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
    gap: 10,
  },
  qa: { flex: 1, alignItems: "center", gap: 8 },
  qaIcon: {
    width: 58,
    height: 58,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
  },
  qaLabel: { fontSize: 11, color: MUTED, fontWeight: "600" },

  // Card
  card: {
    backgroundColor: CARD_BG,
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: BORDER,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  cardTitle: { fontSize: 16, fontWeight: "700", color: "#fff" },
  seeAll: { fontSize: 13, color: ACCENT, fontWeight: "600" },

  // Empty
  empty: { alignItems: "center", paddingVertical: 32 },

  // Splash
  logoMark: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: ACCENT,
    alignItems: "center",
    justifyContent: "center",
  },
  logoText: { fontSize: 24, fontWeight: "800", color: "#fff" },
  btn: {
    backgroundColor: RED,
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 14,
    marginTop: 16,
  },
  btnText: { color: "#fff", fontWeight: "700", fontSize: 15 },
});
