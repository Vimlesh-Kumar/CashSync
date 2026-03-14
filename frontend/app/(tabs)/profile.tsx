import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect } from "@react-navigation/native";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { useAuth } from "@/src/context/AuthContext";
import { ThemePreference, useAppTheme } from "@/src/context/ThemeContext";
import { createBudget, getBudgets, updateBudget } from "@/src/features/budget";
import { CategoryItem, createCategory, getCategories } from "@/src/features/category";

const BUILT_IN_BUDGET_CATEGORIES = [
  "Food & Groceries",
  "Subscriptions",
  "Transport",
  "Salary",
  "Shopping",
  "Healthcare",
  "Housing",
  "Utilities",
  "Investments",
  "General",
];

type BudgetCategoryOption = {
  key: string;
  name: string;
  categoryId: string | null;
};

export default function ProfileScreen() {
  const { user, signOut } = useAuth();
  const { colors, preference, setPreference } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [budgets, setBudgets] = useState<any[]>([]);
  const [categoryName, setCategoryName] = useState("");
  const [budgetName, setBudgetName] = useState("");
  const [budgetAmount, setBudgetAmount] = useState("");
  const [selectedBudgetCategoryId, setSelectedBudgetCategoryId] = useState<string | null>(null);
  const [selectedBudgetCategoryName, setSelectedBudgetCategoryName] = useState<string | null>(null);
  const [editingBudgetId, setEditingBudgetId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [cats, buds] = await Promise.all([getCategories(user.id), getBudgets(user.id)]);
      setCategories(cats);
      setBudgets(buds);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void load();
  }, [load]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const budgetCategoryOptions: BudgetCategoryOption[] = [
    ...BUILT_IN_BUDGET_CATEGORIES.map((name) => ({
      key: `system-${name}`,
      name,
      categoryId: null,
    })),
    ...categories.map((category) => ({
      key: category.id,
      name: category.name,
      categoryId: category.id,
    })),
  ];

  const selectedBudgetOption =
    budgetCategoryOptions.find(
      (option) => option.categoryId === selectedBudgetCategoryId && option.name === selectedBudgetCategoryName,
    ) || budgetCategoryOptions.find((option) => option.name === selectedBudgetCategoryName);

  const resetBudgetForm = () => {
    setBudgetName("");
    setBudgetAmount("");
    setSelectedBudgetCategoryId(null);
    setSelectedBudgetCategoryName(null);
    setEditingBudgetId(null);
  };

  const startEditingBudget = (budget: any) => {
    setEditingBudgetId(budget.id);
    setBudgetName(budget.name);
    setBudgetAmount(String(budget.amount));
    setSelectedBudgetCategoryId(budget.category?.id ?? null);
    setSelectedBudgetCategoryName(budget.category?.name ?? budget.categoryLabel ?? null);
  };

  if (!user) return null;

  return (
    <View style={styles.container}>
      <LinearGradient colors={colors.gradient} style={StyleSheet.absoluteFill} />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{(user.name?.charAt(0) || "U").toUpperCase()}</Text>
          </View>
          <Text style={styles.userName}>{user.name || "CashSync User"}</Text>
          <Text style={styles.userEmail}>{user.email}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Theme</Text>
          <Text style={styles.helperText}>Choose how CashSync looks on this device.</Text>
          <View style={styles.selectorRow}>
            {(["system", "light", "dark"] as ThemePreference[]).map((option) => {
              const selected = preference === option;
              return (
                <Pressable
                  key={option}
                  style={[styles.chip, selected && styles.chipActive]}
                  onPress={() => {
                    void setPreference(option);
                  }}
                >
                  <Text style={[styles.chipText, selected && styles.chipTextActive]}>
                    {option === "system" ? "System" : option === "light" ? "Light" : "Dark"}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Custom Categories</Text>
          <View style={styles.row}>
            <TextInput
              style={styles.input}
              placeholder="E.g. Entertainment"
              placeholderTextColor={colors.textMuted}
              value={categoryName}
              onChangeText={setCategoryName}
            />
            <Pressable
              style={styles.actionBtn}
              onPress={async () => {
                if (!categoryName.trim()) return;
                await createCategory({ userId: user.id, name: categoryName.trim() });
                setCategoryName("");
                await load();
              }}
            >
              <Text style={styles.actionBtnText}>Add</Text>
            </Pressable>
          </View>
          <View style={styles.wrapRow}>
            {categories.map((cat) => (
              <View key={cat.id} style={styles.pill}>
                <Text style={styles.pillText}>{cat.name}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Monthly Budget</Text>
          <TextInput
            style={styles.input}
            placeholder="Budget Name"
            placeholderTextColor={colors.textMuted}
            value={budgetName}
            onChangeText={setBudgetName}
          />
          <TextInput
            style={styles.input}
            placeholder="Amount (₹)"
            placeholderTextColor={colors.textMuted}
            keyboardType="numeric"
            value={budgetAmount}
            onChangeText={setBudgetAmount}
          />
          <Text style={styles.helperText}>Sync With Expenditure Category</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.selectorRow}>
            {budgetCategoryOptions.map((option) => {
              const selected =
                selectedBudgetCategoryName === option.name && selectedBudgetCategoryId === option.categoryId;
              return (
                <Pressable
                  key={option.key}
                  style={[styles.chip, selected && styles.chipActive]}
                  onPress={() => {
                    if (selected) {
                      setSelectedBudgetCategoryId(null);
                      setSelectedBudgetCategoryName(null);
                      return;
                    }
                    setSelectedBudgetCategoryId(option.categoryId);
                    setSelectedBudgetCategoryName(option.name);
                  }}
                >
                  <Text style={[styles.chipText, selected && styles.chipTextActive]}>{option.name}</Text>
                </Pressable>
              );
            })}
          </ScrollView>

          <Text style={styles.helperText}>
            {selectedBudgetOption
              ? `This budget will sync with ${selectedBudgetOption.name}.`
              : "Choose the category this budget should follow."}
          </Text>

          <Pressable
            style={styles.primaryBtn}
            onPress={async () => {
              try {
                const amount = Number.parseFloat(budgetAmount);
                if (Number.isNaN(amount) || amount <= 0) return;
                const fallbackCategory = budgetCategoryOptions.find(
                  (option) => option.name.toLowerCase() === budgetName.trim().toLowerCase(),
                );
                const resolvedCategoryId = selectedBudgetCategoryId ?? fallbackCategory?.categoryId ?? null;
                const resolvedCategoryLabel = selectedBudgetCategoryName ?? fallbackCategory?.name ?? null;
                const resolvedName = budgetName.trim() || resolvedCategoryLabel || "Budget";

                if (editingBudgetId) {
                  await updateBudget(editingBudgetId, {
                    categoryId: resolvedCategoryId,
                    categoryLabel: resolvedCategoryLabel,
                    name: resolvedName,
                    amount,
                  });
                  Alert.alert("Budget updated", "Budget sync was updated successfully.");
                } else {
                  await createBudget({
                    userId: user.id,
                    categoryId: resolvedCategoryId,
                    categoryLabel: resolvedCategoryLabel,
                    name: resolvedName,
                    amount,
                    monthStart: new Date().toISOString(),
                  });
                }
                resetBudgetForm();
                await load();
              } catch (error) {
                console.error("Failed to save budget", error);
                Alert.alert("Could not save budget", "Please try again.");
              }
            }}
          >
            <Text style={styles.primaryBtnText}>{editingBudgetId ? "Save Budget Changes" : "Create Budget"}</Text>
          </Pressable>

          {editingBudgetId && (
            <Pressable style={styles.secondaryBtn} onPress={resetBudgetForm}>
              <Text style={styles.secondaryBtnText}>Cancel Editing</Text>
            </Pressable>
          )}

          <View style={{ gap: 12, marginTop: 10 }}>
            {budgets.map((budget) => (
              <View key={budget.id} style={styles.budgetItem}>
                <View style={styles.budgetTop}>
                  <Text style={styles.budgetName}>{budget.name}</Text>
                  <Text style={styles.budgetAmount}>₹{budget.amount.toLocaleString("en-IN")}</Text>
                </View>
                <Text style={styles.budgetMeta}>
                  {budget.category?.name || budget.categoryLabel || "Unlinked"} • Spent ₹
                  {(budget.spent || 0).toLocaleString("en-IN")} • Remaining ₹
                  {(budget.remaining || 0).toLocaleString("en-IN")}
                </Text>
                <View style={styles.progressBg}>
                  <View style={[styles.progressFill, { width: `${Math.min(budget.usage || 0, 100)}%` }]} />
                </View>
                <Pressable style={styles.editBtn} onPress={() => startEditingBudget(budget)}>
                  <Text style={styles.editBtnText}>Edit Budget Sync</Text>
                </Pressable>
              </View>
            ))}
          </View>
        </View>

        <Pressable style={styles.logoutBtn} onPress={signOut}>
          <Text style={styles.logoutText}>Sign Out</Text>
        </Pressable>

        {loading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator color={colors.accent} size="large" />
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const createStyles = (colors: ReturnType<typeof useAppTheme>["colors"]) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    scroll: {
      paddingHorizontal: 20,
      paddingTop: Platform.OS === "web" ? 48 : 72,
      paddingBottom: 130,
      maxWidth: 760,
      width: "100%",
      alignSelf: "center",
      gap: 16,
    },
    header: { alignItems: "center", marginBottom: 6 },
    avatar: {
      width: 84,
      height: 84,
      borderRadius: 42,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.accent,
      marginBottom: 10,
    },
    avatarText: { color: "#fff", fontSize: 30, fontWeight: "800" },
    userName: { color: colors.text, fontSize: 26, fontWeight: "800" },
    userEmail: { color: colors.textMuted, marginTop: 4 },
    card: {
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 18,
      padding: 16,
      gap: 12,
    },
    cardTitle: { color: colors.text, fontSize: 18, fontWeight: "700" },
    helperText: { color: colors.textMuted, fontSize: 12 },
    selectorRow: { flexDirection: "row", gap: 8, paddingBottom: 2 },
    chip: {
      borderRadius: 999,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.input,
      paddingHorizontal: 14,
      paddingVertical: 9,
    },
    chipActive: {
      borderColor: colors.accent,
      backgroundColor: colors.accentSoft,
    },
    chipText: { color: colors.textMuted, fontWeight: "700", fontSize: 12 },
    chipTextActive: { color: colors.accent },
    row: { flexDirection: "row", gap: 10, alignItems: "center" },
    input: {
      flex: 1,
      backgroundColor: colors.input,
      borderColor: colors.border,
      borderWidth: 1,
      borderRadius: 12,
      color: colors.text,
      paddingHorizontal: 14,
      paddingVertical: 12,
      fontSize: 14,
    },
    actionBtn: {
      backgroundColor: colors.accent,
      borderRadius: 12,
      paddingHorizontal: 16,
      paddingVertical: 12,
      alignItems: "center",
      justifyContent: "center",
    },
    actionBtnText: { color: "#fff", fontWeight: "700" },
    wrapRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    pill: {
      backgroundColor: colors.input,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 999,
      paddingHorizontal: 10,
      paddingVertical: 5,
    },
    pillText: { color: colors.textSecondary, fontSize: 12 },
    primaryBtn: {
      backgroundColor: colors.accent,
      borderRadius: 12,
      alignItems: "center",
      paddingVertical: 13,
      marginTop: 2,
    },
    primaryBtnText: { color: "#fff", fontWeight: "800" },
    secondaryBtn: {
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.input,
      borderRadius: 12,
      alignItems: "center",
      paddingVertical: 12,
    },
    secondaryBtnText: { color: colors.text, fontWeight: "700" },
    budgetItem: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      padding: 12,
      backgroundColor: colors.input,
    },
    budgetTop: { flexDirection: "row", justifyContent: "space-between", marginBottom: 4 },
    budgetName: { color: colors.text, fontWeight: "700" },
    budgetAmount: { color: colors.text, fontWeight: "700" },
    budgetMeta: { color: colors.textMuted, fontSize: 12 },
    progressBg: {
      height: 8,
      borderRadius: 6,
      backgroundColor: `${colors.border}AA`,
      marginTop: 8,
      overflow: "hidden",
    },
    progressFill: {
      height: "100%",
      backgroundColor: colors.purple,
    },
    editBtn: {
      marginTop: 10,
      alignSelf: "flex-start",
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 999,
      paddingHorizontal: 10,
      paddingVertical: 6,
      backgroundColor: colors.accentSoft,
    },
    editBtnText: { color: colors.accent, fontWeight: "700", fontSize: 12 },
    logoutBtn: {
      backgroundColor: `${colors.danger}22`,
      borderWidth: 1,
      borderColor: `${colors.danger}66`,
      borderRadius: 14,
      alignItems: "center",
      paddingVertical: 15,
      marginTop: 4,
    },
    logoutText: { color: colors.danger, fontWeight: "800" },
    loadingOverlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: "rgba(0, 0, 0, 0.25)",
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 16,
    },
  });
