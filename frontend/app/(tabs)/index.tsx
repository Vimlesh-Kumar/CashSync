import { Ionicons } from "@expo/vector-icons";
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

const ACCENT = "#00F260";
const GREEN = "#00F260";
const RED = "#FF453A";
const PURPLE = "#A855F7";
const BG = "#09090B";
const CARD_BG = "#1F1F22";
const BORDER = "#27272A";
const MUTED = "#A1A1AA";
const TEXT_DIM = "#D4D4D8";

// ─── Category Icons ──────────────────────────────────────────────────────────

const CATEGORY_META: Record<
  string,
  { icon: keyof typeof Ionicons.glyphMap; color: string }
> = {
  "Food & Groceries": { icon: "fast-food", color: "#FF6B6B" },
  Subscriptions: { icon: "play-circle", color: "#FFD93D" },
  Transport: { icon: "car", color: "#4ECDC4" },
  Salary: { icon: "cash", color: GREEN },
  Shopping: { icon: "cart", color: "#C689C6" },
  Healthcare: { icon: "medkit", color: "#F87171" },
  Housing: { icon: "home", color: "#60A5FA" },
  Utilities: { icon: "flash", color: "#FBBF24" },
  Telecom: { icon: "call", color: "#34D399" },
  Investments: { icon: "trending-up", color: PURPLE },
  "Cash Withdrawal": { icon: "cash-outline", color: MUTED },
  Transfer: { icon: "swap-horizontal", color: ACCENT },
  General: { icon: "wallet", color: MUTED },
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
        <Ionicons name={meta.icon} size={20} color={meta.color} />
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
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: CARD_BG,
    borderRadius: 20,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: BORDER,
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

// ─── Stat Chip (Hidden in new design, preserving function) ───────────────────

function StatChip({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color: string;
}) {
  return null;
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
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 6 }}
            >
              <Ionicons
                name={getCategoryMeta(s.name).icon}
                size={14}
                color={TEXT_DIM}
              />
              <Text style={{ color: TEXT_DIM, fontSize: 13 }}>{s.name}</Text>
            </View>
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
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <View
              style={{
                backgroundColor: GREEN,
                paddingHorizontal: 6,
                paddingVertical: 4,
                borderRadius: 6,
              }}
            >
              <Text
                style={{
                  color: "#000",
                  fontWeight: "900",
                  fontSize: 13,
                  letterSpacing: -0.5,
                }}
              >
                C+S
              </Text>
            </View>
            <Text style={{ color: GREEN, fontWeight: "700", fontSize: 18 }}>
              CashSync
            </Text>
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <Text style={{ color: "#fff", fontSize: 14 }}>
              {displayName.split(" ")[0]} R.
            </Text>
            <Pressable style={s.avatarCircle}>
              <Text style={s.avatarText}>{initials}</Text>
            </Pressable>
          </View>
        </View>

        {/* ── Net Worth Card ── */}
        <View style={s.balanceCard}>
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "flex-start",
              marginBottom: 8,
            }}
          >
            <Text style={s.balLabel}>
              Welcome, {displayName.split(" ")[0]}!
            </Text>
            <View
              style={{
                backgroundColor: GREEN + "20",
                paddingHorizontal: 8,
                paddingVertical: 4,
                borderRadius: 12,
              }}
            >
              <Text style={{ color: GREEN, fontSize: 11, fontWeight: "700" }}>
                ↗ +2.8%
              </Text>
            </View>
          </View>
          <Text
            style={[s.balAmount, { color: netBalance >= 0 ? "#fff" : RED }]}
          >
            ₹
            {Math.abs(netBalance).toLocaleString("en-IN", {
              minimumFractionDigits: 2,
            })}
          </Text>
        </View>

        {/* ── Quick Actions ── */}
        <View style={s.quickRow}>
          {[
            {
              icon: "qr-code-outline" as const,
              label: "Scan\nReceipt",
              color: GREEN,
              action: () => router.push("/(tabs)/explore"),
            },
            {
              icon: "receipt-outline" as const,
              label: "Split\nBill",
              color: PURPLE,
              action: () => router.push("/(tabs)/split"),
            },
            {
              icon: "send-outline" as const,
              label: "Send\nMoney",
              color: GREEN,
              action: () => {},
            },
            {
              icon: "hand-left-outline" as const,
              label: "Request",
              color: GREEN,
              action: () => {},
            },
          ].map((a) => (
            <Pressable key={a.label} style={s.qa} onPress={a.action}>
              <View style={[s.qaIcon]}>
                <Ionicons name={a.icon} size={22} color={a.color} />
              </View>
              <Text style={[s.qaLabel, { textAlign: "center" }]}>
                {a.label}
              </Text>
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
        <View style={s.listContainer}>
          <View style={s.cardHeader}>
            <Text style={s.cardTitle}>Recent Activity</Text>
            <Pressable onPress={() => router.push("/(tabs)/explore")}>
              <Text style={s.seeAll}>Slow all</Text>
            </Pressable>
          </View>

          {transactions.length === 0 ? (
            <View style={s.empty}>
              <Ionicons name="cash-outline" size={42} color={MUTED} />
              <Text style={{ color: MUTED, marginTop: 12 }}>
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
    borderRadius: 20,
    padding: 24,
    marginBottom: 18,
    backgroundColor: CARD_BG,
    borderWidth: 1,
    borderColor: BORDER,
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
    fontSize: 18,
    color: MUTED,
    fontWeight: "600",
  },
  balAmount: {
    fontSize: 42,
    fontWeight: "800",
    letterSpacing: -1,
  },
  balEmail: { fontSize: 12, color: "rgba(255,255,255,0.3)", marginBottom: 20 },
  chipRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  divider: { width: 1, height: 40, backgroundColor: "rgba(255,255,255,0.07)" },

  // Quick actions
  quickRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 32,
    gap: 12,
  },
  qa: {
    flex: 1,
    alignItems: "center",
    gap: 8,
    backgroundColor: CARD_BG,
    borderRadius: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: BORDER,
  },
  qaIcon: {
    alignItems: "center",
    justifyContent: "center",
  },
  qaLabel: { fontSize: 12, color: MUTED, fontWeight: "600", lineHeight: 16 },

  // Card
  listContainer: {
    marginBottom: 16,
  },
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
    paddingHorizontal: 4,
  },
  cardTitle: { fontSize: 18, fontWeight: "700", color: "#fff" },
  seeAll: { fontSize: 14, color: PURPLE, fontWeight: "600" },

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
