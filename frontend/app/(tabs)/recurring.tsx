import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect } from "@react-navigation/native";
import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { useAuth } from "@/src/context/AuthContext";
import { useAppTheme } from "@/src/context/ThemeContext";
import {
  RecurringBill,
  createRecurringBill,
  deleteRecurringBill,
  getRecurringBills,
  updateRecurringBill,
} from "@/src/features/activity/api/activity.api";

const FREQ_OPTIONS = [
  { key: "WEEKLY", label: "Weekly", icon: "📅" },
  { key: "MONTHLY", label: "Monthly", icon: "🗓️" },
  { key: "YEARLY", label: "Yearly", icon: "📆" },
];

function nextDueLabel(dateStr: string) {
  const d = new Date(dateStr);
  const diff = Math.ceil((d.getTime() - Date.now()) / (1000 * 86400));
  if (diff < 0) return "Overdue";
  if (diff === 0) return "Due today";
  if (diff === 1) return "Due tomorrow";
  return `Due in ${diff}d`;
}

function nextDueColor(dateStr: string, colors: any) {
  const diff = Math.ceil((new Date(dateStr).getTime() - Date.now()) / (1000 * 86400));
  if (diff < 0) return "#EF4444";
  if (diff <= 3) return "#F59E0B";
  return colors.textMuted;
}

export default function RecurringScreen() {
  const { user } = useAuth();
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [bills, setBills] = useState<RecurringBill[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showModal, setShowModal] = useState(false);

  // Form state
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("Bills");
  const [frequency, setFrequency] = useState<"WEEKLY" | "MONTHLY" | "YEARLY">("MONTHLY");
  const [currency, setCurrency] = useState("INR");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    try {
      const data = await getRecurringBills(user.id);
      setBills(data);
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

  const resetForm = () => {
    setTitle("");
    setAmount("");
    setCategory("Bills");
    setFrequency("MONTHLY");
    setCurrency("INR");
  };

  const onSave = async () => {
    if (!user || !title.trim() || !amount.trim()) return;
    const parsed = parseFloat(amount.replace(/,/g, ""));
    if (isNaN(parsed) || parsed <= 0) {
      Alert.alert("Invalid amount", "Please enter a valid amount.");
      return;
    }
    setSaving(true);
    try {
      await createRecurringBill({
        userId: user.id,
        title: title.trim(),
        amount: parsed,
        currency,
        category: category.trim() || "Bills",
        frequency,
      });
      await load();
      setShowModal(false);
      resetForm();
    } catch (e: any) {
      Alert.alert("Error", e.message ?? "Failed to create recurring bill.");
    } finally {
      setSaving(false);
    }
  };

  const onToggleActive = async (bill: RecurringBill) => {
    try {
      await updateRecurringBill(bill.id, { isActive: !bill.isActive });
      setBills((prev) => prev.map((b) => (b.id === bill.id ? { ...b, isActive: !b.isActive } : b)));
    } catch (e: any) {
      Alert.alert("Error", e.message ?? "Failed to update.");
    }
  };

  const onDelete = (bill: RecurringBill) => {
    Alert.alert("Delete Recurring Bill", `Remove "${bill.title}"? This cannot be undone.`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteRecurringBill(bill.id);
            setBills((prev) => prev.filter((b) => b.id !== bill.id));
          } catch (e: any) {
            Alert.alert("Error", e.message ?? "Failed to delete.");
          }
        },
      },
    ]);
  };

  const activeBills = bills.filter((b) => b.isActive);
  const inactiveBills = bills.filter((b) => !b.isActive);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <LinearGradient colors={colors.gradient} style={StyleSheet.absoluteFill} />

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Recurring Bills</Text>
            <Text style={styles.subtitle}>Auto-created on schedule</Text>
          </View>
          <Pressable
            id="add-recurring-btn"
            style={({ pressed }) => [styles.addBtn, pressed && { opacity: 0.75 }]}
            onPress={() => setShowModal(true)}
          >
            <Text style={styles.addBtnText}>+ Add</Text>
          </Pressable>
        </View>

        {loading ? (
          <ActivityIndicator color={colors.accent} style={{ marginTop: 32 }} />
        ) : bills.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>🔁</Text>
            <Text style={styles.emptyTitle}>No recurring bills</Text>
            <Text style={styles.emptyText}>Set up rent, subscriptions, or any regular expense and we'll create it automatically.</Text>
            <Pressable style={styles.emptyBtn} onPress={() => setShowModal(true)}>
              <Text style={styles.emptyBtnText}>Get started</Text>
            </Pressable>
          </View>
        ) : (
          <>
            {activeBills.length > 0 && (
              <>
                <Text style={styles.sectionLabel}>Active</Text>
                {activeBills.map((bill) => (
                  <BillCard
                    key={bill.id}
                    bill={bill}
                    colors={colors}
                    styles={styles}
                    onToggle={() => onToggleActive(bill)}
                    onDelete={() => onDelete(bill)}
                  />
                ))}
              </>
            )}
            {inactiveBills.length > 0 && (
              <>
                <Text style={[styles.sectionLabel, { marginTop: 20 }]}>Paused</Text>
                {inactiveBills.map((bill) => (
                  <BillCard
                    key={bill.id}
                    bill={bill}
                    colors={colors}
                    styles={styles}
                    onToggle={() => onToggleActive(bill)}
                    onDelete={() => onDelete(bill)}
                  />
                ))}
              </>
            )}
          </>
        )}
      </ScrollView>

      {/* Create Modal */}
      <Modal visible={showModal} transparent animationType="slide">
        <View style={styles.overlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>New Recurring Bill</Text>

            <Text style={styles.fieldLabel}>Bill name *</Text>
            <TextInput
              id="recurring-title-input"
              style={styles.input}
              placeholder="e.g. Netflix, Rent, Gym"
              placeholderTextColor={colors.textMuted}
              value={title}
              onChangeText={setTitle}
            />

            <View style={{ flexDirection: "row", gap: 10 }}>
              <View style={{ flex: 2 }}>
                <Text style={styles.fieldLabel}>Amount *</Text>
                <TextInput
                  id="recurring-amount-input"
                  style={styles.input}
                  placeholder="0.00"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="decimal-pad"
                  value={amount}
                  onChangeText={setAmount}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.fieldLabel}>Currency</Text>
                <TextInput
                  id="recurring-currency-input"
                  style={styles.input}
                  placeholder="INR"
                  placeholderTextColor={colors.textMuted}
                  autoCapitalize="characters"
                  maxLength={3}
                  value={currency}
                  onChangeText={setCurrency}
                />
              </View>
            </View>

            <Text style={styles.fieldLabel}>Category</Text>
            <TextInput
              id="recurring-category-input"
              style={styles.input}
              placeholder="Bills"
              placeholderTextColor={colors.textMuted}
              value={category}
              onChangeText={setCategory}
            />

            <Text style={styles.fieldLabel}>Frequency</Text>
            <View style={styles.freqRow}>
              {FREQ_OPTIONS.map((f) => (
                <Pressable
                  key={f.key}
                  id={`freq-${f.key.toLowerCase()}`}
                  style={[styles.freqBtn, frequency === f.key && styles.freqBtnActive]}
                  onPress={() => setFrequency(f.key as any)}
                >
                  <Text style={styles.freqIcon}>{f.icon}</Text>
                  <Text style={[styles.freqLabel, frequency === f.key && { color: colors.accent }]}>
                    {f.label}
                  </Text>
                </Pressable>
              ))}
            </View>

            <View style={styles.modalActions}>
              <Pressable
                style={[styles.modalBtn, styles.cancelBtn]}
                onPress={() => { setShowModal(false); resetForm(); }}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </Pressable>
              <Pressable
                id="save-recurring-btn"
                style={[styles.modalBtn, styles.saveBtn, saving && { opacity: 0.6 }]}
                onPress={onSave}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.saveBtnText}>Save</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function BillCard({
  bill,
  colors,
  styles,
  onToggle,
  onDelete,
}: {
  bill: RecurringBill;
  colors: any;
  styles: any;
  onToggle: () => void;
  onDelete: () => void;
}) {
  const dueLabel = nextDueLabel(bill.nextDueAt);
  const dueColor = nextDueColor(bill.nextDueAt, colors);
  const freqMeta = FREQ_OPTIONS.find((f) => f.key === bill.frequency);

  return (
    <View style={[styles.card, !bill.isActive && { opacity: 0.55 }]}>
      <View style={styles.cardTop}>
        <View style={styles.cardLeft}>
          <Text style={styles.cardTitle}>{bill.title}</Text>
          <Text style={styles.cardMeta}>
            {freqMeta?.icon} {freqMeta?.label ?? bill.frequency}  ·  {bill.category}
          </Text>
        </View>
        <View style={styles.cardRight}>
          <Text style={styles.cardAmount}>
            {bill.currency} {bill.amount.toLocaleString()}
          </Text>
          <Text style={[styles.cardDue, { color: dueColor }]}>{dueLabel}</Text>
        </View>
      </View>
      <View style={styles.cardActions}>
        <Pressable onPress={onDelete} style={styles.deleteBtn}>
          <Text style={styles.deleteBtnText}>🗑 Delete</Text>
        </Pressable>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <Text style={{ color: colors.textMuted, fontSize: 12 }}>
            {bill.isActive ? "Active" : "Paused"}
          </Text>
          <Switch
            value={bill.isActive}
            onValueChange={onToggle}
            thumbColor={bill.isActive ? colors.accent : "#6B7280"}
            trackColor={{ false: "#374151", true: `${colors.accent}55` }}
          />
        </View>
      </View>
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
    header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
    title: { color: colors.text, fontSize: 27, fontWeight: "800", letterSpacing: -0.4 },
    subtitle: { color: colors.textMuted, fontSize: 12 },
    addBtn: {
      backgroundColor: colors.accent,
      paddingHorizontal: 16,
      paddingVertical: 9,
      borderRadius: 10,
    },
    addBtnText: { color: "#fff", fontWeight: "700", fontSize: 14 },
    sectionLabel: { color: colors.textMuted, fontSize: 11, fontWeight: "700", textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 },
    card: {
      backgroundColor: colors.card,
      borderRadius: 14,
      padding: 14,
      borderWidth: 1,
      borderColor: colors.border,
      gap: 10,
    },
    cardTop: { flexDirection: "row", justifyContent: "space-between" },
    cardLeft: { flex: 1, gap: 3 },
    cardRight: { alignItems: "flex-end", gap: 3 },
    cardTitle: { color: colors.text, fontSize: 15, fontWeight: "700" },
    cardMeta: { color: colors.textMuted, fontSize: 12 },
    cardAmount: { color: colors.text, fontSize: 16, fontWeight: "800" },
    cardDue: { fontSize: 11, fontWeight: "600" },
    cardActions: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingTop: 8, borderTopWidth: 1, borderTopColor: `${colors.border}55` },
    deleteBtn: { paddingHorizontal: 10, paddingVertical: 4 },
    deleteBtnText: { color: "#EF4444", fontSize: 12 },
    empty: { alignItems: "center", gap: 10, marginTop: 60, paddingHorizontal: 20 },
    emptyIcon: { fontSize: 48 },
    emptyTitle: { color: colors.text, fontSize: 18, fontWeight: "700" },
    emptyText: { color: colors.textMuted, textAlign: "center", fontSize: 13, lineHeight: 20 },
    emptyBtn: { marginTop: 10, backgroundColor: colors.accent, paddingHorizontal: 24, paddingVertical: 11, borderRadius: 10 },
    emptyBtnText: { color: "#fff", fontWeight: "700", fontSize: 14 },
    // Modal
    overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.7)", justifyContent: "flex-end" },
    modal: {
      backgroundColor: colors.card,
      borderTopLeftRadius: 22,
      borderTopRightRadius: 22,
      padding: 22,
      paddingBottom: Platform.OS === "ios" ? 40 : 22,
      gap: 10,
    },
    modalTitle: { color: colors.text, fontSize: 18, fontWeight: "800", marginBottom: 4 },
    fieldLabel: { color: colors.textMuted, fontSize: 11, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 2 },
    input: {
      backgroundColor: colors.background,
      color: colors.text,
      borderRadius: 10,
      padding: 12,
      fontSize: 15,
      borderWidth: 1,
      borderColor: colors.border,
    },
    freqRow: { flexDirection: "row", gap: 8 },
    freqBtn: {
      flex: 1,
      alignItems: "center",
      paddingVertical: 10,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.background,
      gap: 4,
    },
    freqBtnActive: { borderColor: colors.accent, backgroundColor: `${colors.accent}15` },
    freqIcon: { fontSize: 18 },
    freqLabel: { color: colors.textMuted, fontSize: 11, fontWeight: "600" },
    modalActions: { flexDirection: "row", gap: 10, marginTop: 6 },
    modalBtn: { flex: 1, alignItems: "center", paddingVertical: 13, borderRadius: 12 },
    cancelBtn: { backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border },
    cancelBtnText: { color: colors.textMuted, fontWeight: "700" },
    saveBtn: { backgroundColor: colors.accent },
    saveBtnText: { color: "#fff", fontWeight: "800", fontSize: 15 },
  });
