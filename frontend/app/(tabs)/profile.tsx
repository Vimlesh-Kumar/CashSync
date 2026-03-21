import * as Contacts from "expo-contacts";
import * as Location from "expo-location";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect } from "@react-navigation/native";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { useAuth } from "@/src/context/AuthContext";
import { ThemePreference, useAppTheme } from "@/src/context/ThemeContext";
import { createBudget, getBudgets, updateBudget } from "@/src/features/budget";
import { CategoryItem, createCategory, getCategories } from "@/src/features/category";
import { updateUser } from "@/src/features/user";
import { getExportUrl, getLiveRates, LiveRates } from "@/src/features/activity/api/activity.api";
import {
  getSmsAutoSyncEnabled,
  getSmsPermissionState,
  requestSmsPermission,
  setSmsAutoSyncEnabled,
  SmsPermissionState,
} from "@/src/features/transaction/smsAutoSync";
import { formatCurrency, inferCurrencyFromCountry, normalizeCurrency, SUPPORTED_CURRENCIES } from "@/src/lib/currency";

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

type PermissionState = "unknown" | "granted" | "denied";

function formatPermissionState(state: PermissionState) {
  if (state === "granted") return "Granted";
  if (state === "denied") return "Denied";
  return "Not requested";
}

function formatSmsPermissionState(state: SmsPermissionState) {
  if (state === "granted") return "Granted";
  if (state === "denied") return "Denied";
  if (state === "unsupported") return "Android only";
  return "Not requested";
}

export default function ProfileScreen() {
  const { user, signOut, updateCurrentUser } = useAuth();
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
  const [savingDefaultCurrency, setSavingDefaultCurrency] = useState(false);
  const [locationPermission, setLocationPermission] = useState<PermissionState>("unknown");
  const [contactsPermission, setContactsPermission] = useState<PermissionState>("unknown");
  const [permissionLoading, setPermissionLoading] = useState<"location" | "contacts" | null>(null);
  const [smsPermission, setSmsPermission] = useState<SmsPermissionState>("unknown");
  const [smsAutoSyncEnabled, setSmsAutoSyncState] = useState(false);
  const [smsLoading, setSmsLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [liveRates, setLiveRates] = useState<LiveRates | null>(null);
  const [ratesLoading, setRatesLoading] = useState(false);


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

  useEffect(() => {
    let active = true;
    const loadPermissionState = async () => {
      try {
        const [locationRes, contactsRes] = await Promise.all([
          Location.getForegroundPermissionsAsync(),
          Contacts.getPermissionsAsync(),
        ]);
        if (!active) return;
        setLocationPermission(locationRes.status === "granted" ? "granted" : locationRes.status === "denied" ? "denied" : "unknown");
        setContactsPermission(contactsRes.status === "granted" ? "granted" : contactsRes.status === "denied" ? "denied" : "unknown");
      } catch {
      }
    };
    void loadPermissionState();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    const loadSmsState = async () => {
      try {
        const [enabled, permission] = await Promise.all([
          getSmsAutoSyncEnabled(),
          getSmsPermissionState(),
        ]);
        if (!active) return;
        setSmsAutoSyncState(enabled);
        setSmsPermission(permission);
      } catch {
      }
    };
    void loadSmsState();
    return () => {
      active = false;
    };
  }, []);

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

  const applyDefaultCurrency = useCallback(async (currency: string) => {
    if (!user) return;
    await updateUser(user.id, { defaultCurrency: currency });
    await updateCurrentUser({ defaultCurrency: currency });
  }, [updateCurrentUser, user]);

  const requestLocationCurrency = useCallback(async () => {
    if (!user) return;
    try {
      setPermissionLoading("location");
      const permission = await Location.requestForegroundPermissionsAsync();
      const nextState: PermissionState =
        permission.status === "granted" ? "granted" : permission.status === "denied" ? "denied" : "unknown";
      setLocationPermission(nextState);
      if (permission.status !== "granted") {
        Alert.alert("Location not granted", "CashSync could not access your location, so your currency was not changed.");
        return;
      }

      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const places = await Location.reverseGeocodeAsync(position.coords);
      const countryCode = places[0]?.isoCountryCode ?? null;
      const inferredCurrency = inferCurrencyFromCountry(countryCode);
      await applyDefaultCurrency(inferredCurrency);
      Alert.alert(
        "Default currency updated",
        countryCode
          ? `CashSync detected ${countryCode} and set your default currency to ${inferredCurrency}.`
          : `CashSync updated your default currency to ${inferredCurrency}.`,
      );
    } catch (error) {
      console.error("Failed to update default currency from location", error);
      Alert.alert("Could not use location", "Please try again or choose a currency manually.");
    } finally {
      setPermissionLoading(null);
    }
  }, [applyDefaultCurrency, user]);

  const requestContactsPermission = useCallback(async () => {
    try {
      setPermissionLoading("contacts");
      const permission = await Contacts.requestPermissionsAsync();
      const nextState: PermissionState =
        permission.status === "granted" ? "granted" : permission.status === "denied" ? "denied" : "unknown";
      setContactsPermission(nextState);
      if (permission.status === "granted") {
        Alert.alert("Contacts enabled", "You can now sync contacts from the Groups tab to find friends faster.");
      } else {
        Alert.alert("Contacts not granted", "CashSync cannot suggest friends from your address book until you allow contacts access.");
      }
    } catch (error) {
      console.error("Failed to request contacts permission", error);
      Alert.alert("Could not request contacts access", "Please try again.");
    } finally {
      setPermissionLoading(null);
    }
  }, []);

  const toggleSmsAutoSync = useCallback(async () => {
    if (Platform.OS !== "android") {
      Alert.alert("Android only", "Incoming SMS auto-sync requires Android and a development build.");
      return;
    }

    try {
      setSmsLoading(true);
      if (smsAutoSyncEnabled) {
        await setSmsAutoSyncEnabled(false);
        setSmsAutoSyncState(false);
        Alert.alert("SMS auto-sync disabled", "CashSync will stop listening for new bank SMS messages.");
        return;
      }

      const granted = await requestSmsPermission();
      const nextPermission = await getSmsPermissionState();
      setSmsPermission(granted ? "granted" : nextPermission === "unknown" ? "denied" : nextPermission);
      if (!granted) {
        Alert.alert("SMS permission not granted", "CashSync needs SMS access on Android to auto-detect incoming bank messages.");
        return;
      }

      await setSmsAutoSyncEnabled(true);
      setSmsAutoSyncState(true);
      Alert.alert("SMS auto-sync enabled", "CashSync will listen for new incoming Android SMS messages and try to ingest supported bank alerts automatically.");
    } catch (error) {
      console.error("Failed to toggle SMS auto-sync", error);
      Alert.alert("Could not update SMS auto-sync", "Please try again.");
    } finally {
      setSmsLoading(false);
    }
  }, [smsAutoSyncEnabled]);

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
          <Text style={styles.cardTitle}>Default Currency</Text>
          <Text style={styles.helperText}>This currency is used for new transactions and summaries.</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.selectorRow}>
            {SUPPORTED_CURRENCIES.map((currency) => {
              const selected = normalizeCurrency(user.defaultCurrency) === currency;
              return (
                <Pressable
                  key={currency}
                  style={[styles.chip, selected && styles.chipActive, savingDefaultCurrency && { opacity: 0.7 }]}
                  disabled={savingDefaultCurrency}
                  onPress={async () => {
                    if (selected) return;
                    try {
                      setSavingDefaultCurrency(true);
                      await applyDefaultCurrency(currency);
                    } finally {
                      setSavingDefaultCurrency(false);
                    }
                  }}
                >
                  <Text style={[styles.chipText, selected && styles.chipTextActive]}>{currency}</Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Permissions</Text>
          <Text style={styles.helperText}>
            Allow CashSync to use location for country currency detection and contacts for friend suggestions.
          </Text>

          <View style={styles.permissionRow}>
            <View style={styles.permissionCopy}>
              <Text style={styles.permissionTitle}>Location to set default currency</Text>
              <Text style={styles.permissionMeta}>Status: {formatPermissionState(locationPermission)}</Text>
            </View>
            <Pressable
              style={styles.actionBtn}
              disabled={permissionLoading === "location"}
              onPress={() => {
                void requestLocationCurrency();
              }}
            >
              {permissionLoading === "location" ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.actionBtnText}>Use Location</Text>
              )}
            </Pressable>
          </View>

          <View style={styles.permissionRow}>
            <View style={styles.permissionCopy}>
              <Text style={styles.permissionTitle}>Contacts to sync friends</Text>
              <Text style={styles.permissionMeta}>Status: {formatPermissionState(contactsPermission)}</Text>
            </View>
            <Pressable
              style={styles.actionBtn}
              disabled={permissionLoading === "contacts"}
              onPress={() => {
                void requestContactsPermission();
              }}
            >
              {permissionLoading === "contacts" ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.actionBtnText}>Enable Contacts</Text>
              )}
            </Pressable>
          </View>

          <View style={styles.permissionRow}>
            <View style={styles.permissionCopy}>
              <Text style={styles.permissionTitle}>Messages for auto-sync</Text>
              <Text style={styles.permissionMeta}>
                Status: {formatSmsPermissionState(smsPermission)} · {smsAutoSyncEnabled ? "Auto-sync on" : "Auto-sync off"}
              </Text>
              <Text style={styles.permissionMeta}>
                Android dev build only. CashSync keeps clipboard auto-detect and can now listen for new incoming bank SMS messages when enabled.
              </Text>
            </View>
            <Pressable
              style={styles.actionBtn}
              disabled={smsLoading}
              onPress={() => {
                void toggleSmsAutoSync();
              }}
            >
              {smsLoading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.actionBtnText}>{smsAutoSyncEnabled ? "Disable SMS" : "Enable SMS"}</Text>
              )}
            </Pressable>
          </View>
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
            placeholder={`Amount (${normalizeCurrency(user.defaultCurrency)})`}
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
                  <Text style={styles.budgetAmount}>
                    {formatCurrency(budget.amount, budget.currency || user.defaultCurrency)}
                  </Text>
                </View>
                <Text style={styles.budgetMeta}>
                  {budget.category?.name || budget.categoryLabel || "Unlinked"} • Spent{" "}
                  {formatCurrency(budget.spent || 0, budget.currency || user.defaultCurrency)} • Remaining{" "}
                  {formatCurrency(budget.remaining || 0, budget.currency || user.defaultCurrency)}
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

        {/* ─── Export Data ─── */}
        <View style={styles.card}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Ionicons name="cloud-download-outline" size={22} color={colors.text} />
            <Text style={styles.cardTitle}>Export Data</Text>
          </View>
          <Text style={styles.helperText}>Download all your transactions for backup or analysis.</Text>
          <View style={styles.row}>
            <Pressable
              id="export-json-btn"
              style={[styles.exportBtn, { flex: 1, flexDirection: 'row', justifyContent: 'center', gap: 8 }]}
              onPress={async () => {
                if (!user) return;
                const url = getExportUrl(user.id, 'json');
                await Linking.openURL(url);
              }}
            >
              <Ionicons name="document-text-outline" size={18} color={colors.text} />
              <Text style={styles.exportBtnText}>JSON</Text>
            </Pressable>
            <Pressable
              id="export-csv-btn"
              style={[styles.exportBtn, { flex: 1, backgroundColor: `${colors.accent}22`, borderColor: colors.accent, flexDirection: 'row', justifyContent: 'center', gap: 8 }]}
              onPress={async () => {
                if (!user) return;
                const url = getExportUrl(user.id, 'csv');
                await Linking.openURL(url);
              }}
            >
              <Ionicons name="stats-chart-outline" size={18} color={colors.accent} />
              <Text style={[styles.exportBtnText, { color: colors.accent }]}>CSV</Text>
            </Pressable>
          </View>
        </View>

        {/* ─── Live Exchange Rates ─── */}
        <View style={styles.card}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Ionicons name="cash-outline" size={22} color={colors.text} />
              <Text style={styles.cardTitle}>Exchange Rates</Text>
            </View>
            <Pressable
              id="load-rates-btn"
              style={[styles.actionBtn, { paddingHorizontal: 12, paddingVertical: 8 }]}
              onPress={async () => {
                setRatesLoading(true);
                try {
                  const data = await getLiveRates();
                  setLiveRates(data);
                } catch {
                  Alert.alert('Error', 'Could not fetch live rates.');
                } finally {
                  setRatesLoading(false);
                }
              }}
            >
              {ratesLoading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.actionBtnText}>Load</Text>
              )}
            </Pressable>
          </View>
          <Text style={styles.helperText}>Live USD-based rates for 26+ currencies (cached 1hr).</Text>
          {liveRates && (
            <>
              <Text style={{ color: colors.textMuted, fontSize: 11 }}>Updated: {new Date(liveRates.updatedAt).toLocaleTimeString()}</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.selectorRow}>
                {Object.entries(liveRates.rates)
                  .filter(([code]) => code !== 'USD')
                  .slice(0, 20)
                  .map(([code, rate]) => (
                    <View key={code} style={styles.rateChip}>
                      <Text style={styles.rateCode}>{code}</Text>
                      <Text style={styles.rateValue}>{rate.toFixed(2)}</Text>
                    </View>
                  ))}
              </ScrollView>
            </>
          )}
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
    permissionRow: {
      flexDirection: "row",
      gap: 12,
      alignItems: "center",
      justifyContent: "space-between",
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 14,
      padding: 12,
      backgroundColor: colors.input,
    },
    permissionCopy: {
      flex: 1,
      gap: 4,
    },
    permissionTitle: {
      color: colors.text,
      fontSize: 14,
      fontWeight: "700",
    },
    permissionMeta: {
      color: colors.textMuted,
      fontSize: 12,
      lineHeight: 17,
    },
    permissionNotice: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 14,
      padding: 12,
      backgroundColor: colors.input,
      gap: 4,
    },
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
    exportBtn: {
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.input,
      borderRadius: 12,
      alignItems: "center",
      paddingVertical: 12,
    },
    exportBtnText: { color: colors.text, fontWeight: "700", fontSize: 14 },
    rateChip: {
      backgroundColor: colors.input,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 10,
      paddingHorizontal: 10,
      paddingVertical: 6,
      alignItems: "center",
      minWidth: 52,
    },
    rateCode: { color: colors.textMuted, fontSize: 10, fontWeight: "700" },
    rateValue: { color: colors.text, fontSize: 13, fontWeight: "800" },
  });
