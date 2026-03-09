import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { useAuth } from "@/src/context/AuthContext";
import { createBudget, getBudgets } from "@/src/features/budget";
import { createCategory, getCategories } from "@/src/features/category";

const BG_START = "#0A0A0A";
const BG_END = "#121212";
const CARD_BG = "rgba(255, 255, 255, 0.03)";
const CARD_BORDER = "rgba(255, 255, 255, 0.08)";
const ACCENT = "#39FF14"; // Neon Green
const ACCENT_GLOW = "rgba(57, 255, 20, 0.2)";
const PURPLE = "#B026FF"; // Electric Purple
const TEXT_PRIMARY = "#FFFFFF";
const TEXT_SECONDARY = "#A1A1AA";
const RED_ACCENT = "#FF3366";

export default function ProfileScreen() {
  const { user, signOut } = useAuth();
  const router = useRouter();
  const [categories, setCategories] = useState<any[]>([]);
  const [budgets, setBudgets] = useState<any[]>([]);
  const [categoryName, setCategoryName] = useState("");
  const [budgetName, setBudgetName] = useState("");
  const [budgetAmount, setBudgetAmount] = useState("");
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [cats, buds] = await Promise.all([
        getCategories(user.id),
        getBudgets(user.id),
      ]);
      setCategories(cats);
      setBudgets(buds);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (e) {
      console.error("Failed to sign out", e);
    }
  };

  if (!user) return null;

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[BG_START, BG_END]}
        style={StyleSheet.absoluteFill}
      />

      {/* Decorative Blur Orbs */}
      <View style={[styles.orb, styles.orbTopLeft]} />
      <View style={[styles.orb, styles.orbBottomRight]} />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header / Avatar Section */}
        <View style={styles.headerContainer}>
          <View style={styles.avatarWrapper}>
            <LinearGradient
              colors={[ACCENT, PURPLE]}
              style={styles.avatarGradient}
            >
              <View style={styles.avatarInner}>
                <Text style={styles.avatarText}>
                  {user.name ? user.name.charAt(0).toUpperCase() : "U"}
                </Text>
              </View>
            </LinearGradient>
          </View>
          <Text style={styles.userName}>{user.name || "CashSync User"}</Text>
          <Text style={styles.userEmail}>{user.email}</Text>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>PRO MEMBER</Text>
          </View>
        </View>

        {/* Categories Section */}
        <View style={styles.glassCard}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Custom Categories</Text>
          </View>

          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              placeholder="E.g. Entertainment"
              placeholderTextColor={TEXT_SECONDARY}
              value={categoryName}
              onChangeText={setCategoryName}
            />
            <Pressable
              style={({ pressed }) => [
                styles.actionBtn,
                pressed && styles.pressed,
              ]}
              onPress={async () => {
                if (!categoryName.trim()) return;
                await createCategory({
                  userId: user.id,
                  name: categoryName.trim(),
                });
                setCategoryName("");
                await load();
              }}
            >
              <Text style={styles.actionBtnText}>Add</Text>
            </Pressable>
          </View>

          <View style={styles.listContainer}>
            {categories.map((cat, i) => (
              <View key={cat.id || i} style={styles.pill}>
                <Text style={styles.pillText}>
                  {cat.icon ? `${cat.icon} ` : ""}
                  {cat.name}
                </Text>
              </View>
            ))}
            {categories.length === 0 && !loading && (
              <Text style={styles.emptyText}>No custom categories yet.</Text>
            )}
          </View>
        </View>

        {/* Budgets Section */}
        <View style={styles.glassCard}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Monthly Budget</Text>
          </View>

          <View style={styles.budgetForm}>
            <TextInput
              style={styles.input}
              placeholder="Budget Name (e.g. Utilities)"
              placeholderTextColor={TEXT_SECONDARY}
              value={budgetName}
              onChangeText={setBudgetName}
            />
            <TextInput
              style={styles.input}
              placeholder="Amount (₹)"
              placeholderTextColor={TEXT_SECONDARY}
              keyboardType="numeric"
              value={budgetAmount}
              onChangeText={setBudgetAmount}
            />
            <Pressable
              style={({ pressed }) => [
                styles.primaryBtn,
                pressed && styles.pressed,
              ]}
              onPress={async () => {
                const amount = Number.parseFloat(budgetAmount);
                if (!budgetName.trim() || Number.isNaN(amount) || amount <= 0)
                  return;
                await createBudget({
                  userId: user.id,
                  name: budgetName.trim(),
                  amount,
                  monthStart: new Date().toISOString(),
                });
                setBudgetName("");
                setBudgetAmount("");
                await load();
              }}
            >
              <LinearGradient
                colors={[ACCENT, "#28C90E"]}
                style={styles.gradientBtn}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <Text style={styles.primaryBtnText}>Create Budget</Text>
              </LinearGradient>
            </Pressable>
          </View>

          <View style={styles.budgetList}>
            {budgets.map((budget, i) => (
              <View key={budget.id || i} style={styles.budgetItem}>
                <View style={styles.budgetDetails}>
                  <Text style={styles.budgetName}>{budget.name}</Text>
                  <Text style={styles.budgetAmount}>
                    ₹{budget.amount.toLocaleString("en-IN")}
                  </Text>
                </View>
                <View style={styles.progressBarBg}>
                  <View
                    style={[
                      styles.progressBarFill,
                      { width: `${Math.min(budget.usage || 0, 100)}%` },
                    ]}
                  />
                </View>
                <Text style={styles.budgetUsage}>
                  {budget.usage ? budget.usage.toFixed(1) : 0}% used
                </Text>
              </View>
            ))}
            {budgets.length === 0 && !loading && (
              <Text style={styles.emptyText}>No budgets defined.</Text>
            )}
          </View>
        </View>

        {/* Logout Button */}
        <Pressable
          style={({ pressed }) => [styles.logoutBtn, pressed && styles.pressed]}
          onPress={handleSignOut}
        >
          <Text style={styles.logoutBtnText}>Sign Out completely</Text>
        </Pressable>

        {loading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator color={ACCENT} size="large" />
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BG_START,
  },
  orb: {
    position: "absolute",
    borderRadius: 999,
    opacity: 0.15,
    filter: "blur(60px)",
  },
  orbTopLeft: {
    width: 300,
    height: 300,
    backgroundColor: PURPLE,
    top: -100,
    left: -100,
  },
  orbBottomRight: {
    width: 350,
    height: 350,
    backgroundColor: ACCENT,
    bottom: -150,
    right: -100,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: Platform.OS === "web" ? 60 : 80,
    paddingBottom: 140,
    maxWidth: 720,
    width: "100%",
    alignSelf: "center",
    gap: 24,
  },
  headerContainer: {
    alignItems: "center",
    marginBottom: 10,
  },
  avatarWrapper: {
    marginBottom: 16,
    shadowColor: ACCENT,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 10,
  },
  avatarGradient: {
    width: 110,
    height: 110,
    borderRadius: 55,
    padding: 3,
  },
  avatarInner: {
    flex: 1,
    backgroundColor: BG_END,
    borderRadius: 55,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontSize: 44,
    fontWeight: "800",
    color: TEXT_PRIMARY,
  },
  userName: {
    fontSize: 28,
    fontWeight: "800",
    color: TEXT_PRIMARY,
    letterSpacing: -0.5,
  },
  userEmail: {
    fontSize: 15,
    color: TEXT_SECONDARY,
    marginTop: 4,
  },
  badge: {
    marginTop: 12,
    backgroundColor: ACCENT_GLOW,
    borderWidth: 1,
    borderColor: "rgba(57, 255, 20, 0.4)",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
  },
  badgeText: {
    color: ACCENT,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1,
  },
  glassCard: {
    backgroundColor: CARD_BG,
    borderWidth: 1,
    borderColor: CARD_BORDER,
    borderRadius: 24,
    padding: 24,
    overflow: "hidden",
  },
  cardHeader: {
    marginBottom: 16,
  },
  cardTitle: {
    color: TEXT_PRIMARY,
    fontSize: 18,
    fontWeight: "700",
    letterSpacing: -0.3,
  },
  inputRow: {
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
  },
  input: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.2)",
    borderWidth: 1,
    borderColor: CARD_BORDER,
    borderRadius: 14,
    color: TEXT_PRIMARY,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
  },
  actionBtn: {
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 14,
    paddingHorizontal: 20,
    paddingVertical: 14,
    justifyContent: "center",
  },
  actionBtnText: {
    color: TEXT_PRIMARY,
    fontWeight: "600",
  },
  listContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 16,
  },
  pill: {
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  pillText: {
    color: TEXT_SECONDARY,
    fontSize: 14,
    fontWeight: "500",
  },
  emptyText: {
    color: TEXT_SECONDARY,
    fontSize: 14,
    fontStyle: "italic",
    marginTop: 8,
  },
  budgetForm: {
    gap: 12,
    marginBottom: 24,
  },
  primaryBtn: {
    borderRadius: 14,
    marginTop: 6,
    overflow: "hidden",
    shadowColor: ACCENT,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
  },
  gradientBtn: {
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryBtnText: {
    color: "#000",
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  budgetList: {
    gap: 16,
  },
  budgetItem: {
    paddingVertical: 8,
  },
  budgetDetails: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  budgetName: {
    color: TEXT_PRIMARY,
    fontWeight: "600",
    fontSize: 15,
  },
  budgetAmount: {
    color: TEXT_PRIMARY,
    fontWeight: "700",
    fontSize: 15,
  },
  progressBarBg: {
    height: 8,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    borderRadius: 4,
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    backgroundColor: PURPLE,
    borderRadius: 4,
  },
  budgetUsage: {
    color: TEXT_SECONDARY,
    fontSize: 12,
    marginTop: 6,
    textAlign: "right",
  },
  logoutBtn: {
    backgroundColor: "rgba(255, 51, 102, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(255, 51, 102, 0.3)",
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: "center",
    marginTop: 10,
  },
  logoutBtnText: {
    color: RED_ACCENT,
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  pressed: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }],
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(10, 10, 10, 0.6)",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 24,
  },
});
