import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { useAuth } from "@/src/context/AuthContext";
import {
  createTransaction,
  getTransactions,
  Transaction,
  TransactionCard,
} from "@/src/features/transaction";
import { getUserProfile } from "@/src/features/user";

export default function HomeScreen() {
  const { user, signOut } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // user is guaranteed non-null here because AuthGate blocks unauthenticated access
    if (!user) return;

    const load = async () => {
      try {
        setLoading(true);

        const [fetchedProfile, fetched] = await Promise.all([
          getUserProfile(user.id),
          getTransactions(user.id),
        ]);

        let txList = fetched;
        if (fetched.length === 0) {
          const [t1, t2] = await Promise.all([
            createTransaction({
              title: "Netflix",
              amount: 14.99,
              type: "EXPENSE",
              category: "Subscription",
              isPersonal: false,
              authorId: user.id,
            }),
            createTransaction({
              title: "Salary",
              amount: 4500,
              type: "INCOME",
              category: "Salary",
              isPersonal: true,
              authorId: user.id,
            }),
          ]);
          txList = [t2, t1];
        }

        setProfile(fetchedProfile);
        setTransactions(txList);

        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }).start();
      } catch (err: any) {
        setError(err.message || "Failed to load dashboard");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [user]);

  if (loading) {
    return (
      <View style={styles.splash}>
        <LinearGradient
          colors={["#0D1117", "#111827"]}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.logoMark}>
          <Text style={styles.logoMarkText}>CS</Text>
        </View>
        <ActivityIndicator color="#4F8EF7" style={{ marginTop: 24 }} />
        <Text style={styles.loadingText}>Loading your dashboard…</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.splash}>
        <LinearGradient
          colors={["#0D1117", "#111827"]}
          style={StyleSheet.absoluteFill}
        />
        <Text style={styles.errorText}>⚠ {error}</Text>
        <Pressable style={styles.retryBtn} onPress={signOut}>
          <Text style={styles.retryBtnText}>Sign Out</Text>
        </Pressable>
      </View>
    );
  }

  const displayName = profile?.name || user?.name || "User";
  const displayEmail = profile?.email || user?.email || "";
  const totalBalance = 14_580.2; // replace with real balance later
  const income = transactions
    .filter((t) => t.type === "INCOME")
    .reduce((s, t) => s + t.amount, 0);
  const expense = transactions
    .filter((t) => t.type === "EXPENSE")
    .reduce((s, t) => s + t.amount, 0);

  const initials = displayName
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  // Greeting based on time
  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={["#0D1117", "#111827", "#0D1117"]}
        style={StyleSheet.absoluteFill}
      />
      <View style={[styles.blob, styles.blobTop]} />
      <View style={[styles.blob, styles.blobBottom]} />

      <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* ── Top Bar ── */}
          <View style={styles.topBar}>
            <View>
              <Text style={styles.greeting}>{greeting} 👋</Text>
              <Text style={styles.userName}>{displayName}</Text>
            </View>
            <View style={styles.topBarRight}>
              <View style={styles.avatarCircle}>
                <Text style={styles.avatarText}>{initials}</Text>
              </View>
              <Pressable
                style={({ pressed }) => [
                  styles.logoutBtn,
                  pressed && { borderColor: "#F87171" },
                ]}
                onPress={signOut}
              >
                <Text style={styles.logoutIcon}>⎋</Text>
              </Pressable>
            </View>
          </View>

          {/* ── Balance Card ── */}
          <View style={styles.balanceCard}>
            <LinearGradient
              colors={["#1A256B", "#0F1A4E"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[StyleSheet.absoluteFill, { borderRadius: 28 }]}
            />
            <View style={styles.cardGlow} />
            <Text style={styles.balanceLabel}>TOTAL BALANCE</Text>
            <Text style={styles.balanceAmount}>
              $
              {totalBalance.toLocaleString("en-US", {
                minimumFractionDigits: 2,
              })}
            </Text>
            <Text style={styles.balanceEmail}>{displayEmail}</Text>

            <View style={styles.balanceStats}>
              <View style={styles.statItem}>
                <View
                  style={[styles.statDot, { backgroundColor: "#34D399" }]}
                />
                <View>
                  <Text style={styles.statLabel}>Income</Text>
                  <Text style={[styles.statValue, { color: "#34D399" }]}>
                    +${income.toFixed(2)}
                  </Text>
                </View>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <View
                  style={[styles.statDot, { backgroundColor: "#F87171" }]}
                />
                <View>
                  <Text style={styles.statLabel}>Expenses</Text>
                  <Text style={[styles.statValue, { color: "#F87171" }]}>
                    −${expense.toFixed(2)}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* ── Quick Actions ── */}
          <View style={styles.quickActions}>
            {[
              { icon: "↑", label: "Send", color: "#4F8EF7" },
              { icon: "↓", label: "Receive", color: "#34D399" },
              { icon: "⊕", label: "Add", color: "#9B59F5" },
              { icon: "⋯", label: "More", color: "#F59E0B" },
            ].map((a) => (
              <Pressable key={a.label} style={styles.quickAction}>
                <View
                  style={[styles.qaIcon, { backgroundColor: a.color + "22" }]}
                >
                  <Text style={[styles.qaEmoji, { color: a.color }]}>
                    {a.icon}
                  </Text>
                </View>
                <Text style={styles.qaLabel}>{a.label}</Text>
              </Pressable>
            ))}
          </View>

          {/* ── Transactions ── */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Recent Activity</Text>
              <Pressable>
                <Text style={styles.seeAll}>See all</Text>
              </Pressable>
            </View>

            {transactions.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyIcon}>💸</Text>
                <Text style={styles.emptyText}>No transactions yet</Text>
              </View>
            ) : (
              transactions.map((t) => (
                <TransactionCard key={t.id} transaction={t} />
              ))
            )}
          </View>
        </ScrollView>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#0D1117" },
  splash: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#0D1117",
    gap: 12,
  },
  loadingText: { color: "#4A5568", fontSize: 14, marginTop: 8 },
  errorText: {
    color: "#F87171",
    fontSize: 16,
    textAlign: "center",
    paddingHorizontal: 32,
    marginBottom: 16,
  },
  retryBtn: {
    backgroundColor: "#F87171",
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 14,
  },
  retryBtnText: { color: "#fff", fontWeight: "700", fontSize: 15 },

  blob: { position: "absolute", borderRadius: 999, opacity: 0.1 },
  blobTop: {
    width: 300,
    height: 300,
    backgroundColor: "#4F8EF7",
    top: -60,
    right: -60,
  },
  blobBottom: {
    width: 200,
    height: 200,
    backgroundColor: "#9B59F5",
    bottom: 80,
    left: -40,
  },

  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: Platform.OS === "web" ? 40 : 60,
    paddingBottom: 100,
    maxWidth: 600,
    alignSelf: "center",
    width: "100%",
  },

  // Top bar
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 28,
  },
  greeting: { fontSize: 13, color: "#4A5568", marginBottom: 4 },
  userName: {
    fontSize: 24,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: -0.3,
  },
  topBarRight: { flexDirection: "row", alignItems: "center", gap: 10 },
  avatarCircle: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: "#4F8EF7",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#1E2D46",
  },
  avatarText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  logoutBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#161D2C",
    borderWidth: 1,
    borderColor: "#1E2D46",
    alignItems: "center",
    justifyContent: "center",
  },
  logoutIcon: { color: "#4A5568", fontSize: 18 },

  // Balance card
  balanceCard: {
    borderRadius: 28,
    padding: 28,
    marginBottom: 20,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#1E3A8A22",
    ...Platform.select({
      web: { boxShadow: "0 20px 60px rgba(79, 142, 247, 0.2)" },
      default: {
        shadowColor: "#4F8EF7",
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.2,
        shadowRadius: 24,
        elevation: 8,
      },
    }),
  },
  cardGlow: {
    position: "absolute",
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: "#4F8EF7",
    opacity: 0.12,
    top: -40,
    right: -20,
  },
  balanceLabel: {
    fontSize: 11,
    color: "rgba(255,255,255,0.45)",
    fontWeight: "700",
    letterSpacing: 1.5,
    textTransform: "uppercase",
    marginBottom: 8,
  },
  balanceAmount: {
    fontSize: 44,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: -1,
    marginBottom: 6,
  },
  balanceEmail: {
    fontSize: 12,
    color: "rgba(255,255,255,0.3)",
    marginBottom: 24,
  },
  balanceStats: { flexDirection: "row", alignItems: "center", gap: 16 },
  statItem: { flexDirection: "row", alignItems: "center", gap: 10, flex: 1 },
  statDot: { width: 8, height: 8, borderRadius: 4 },
  statLabel: {
    fontSize: 11,
    color: "rgba(255,255,255,0.4)",
    letterSpacing: 0.3,
    marginBottom: 2,
  },
  statValue: { fontSize: 16, fontWeight: "700" },
  statDivider: {
    width: 1,
    height: 36,
    backgroundColor: "rgba(255,255,255,0.08)",
  },

  // Quick actions
  quickActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 28,
    gap: 10,
  },
  quickAction: { flex: 1, alignItems: "center", gap: 8 },
  qaIcon: {
    width: 56,
    height: 56,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
  },
  qaEmoji: { fontSize: 22, fontWeight: "800" },
  qaLabel: { fontSize: 12, color: "#4A5568", fontWeight: "600" },

  // Sections
  section: { marginBottom: 24 },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  sectionTitle: { fontSize: 18, fontWeight: "700", color: "#FFFFFF" },
  seeAll: { fontSize: 14, color: "#4F8EF7", fontWeight: "600" },

  // Empty state
  emptyState: { alignItems: "center", paddingVertical: 40, gap: 12 },
  emptyIcon: { fontSize: 36 },
  emptyText: { color: "#3D4E68", fontSize: 15, fontWeight: "500" },

  // Splash logo
  logoMark: {
    width: 68,
    height: 68,
    borderRadius: 22,
    backgroundColor: "#4F8EF7",
    alignItems: "center",
    justifyContent: "center",
  },
  logoMarkText: {
    fontSize: 26,
    fontWeight: "800",
    color: "#fff",
    letterSpacing: 1,
  },
});
