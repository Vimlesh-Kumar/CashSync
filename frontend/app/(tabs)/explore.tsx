import { LinearGradient } from "expo-linear-gradient";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { useAuth } from "@/src/context/AuthContext";
import {
  getTransactions,
  ingestSms,
  Transaction,
  updateTransaction,
} from "@/src/features/transaction";

const BG = "#0D1117";
const CARD_BG = "#161D2C";
const BORDER = "#1E2D46";
const ACCENT = "#4F8EF7";
const GREEN = "#34D399";
const RED = "#F87171";
const MUTED = "#4A5568";
const TEXT_DIM = "#8B9AB3";

const CATEGORIES = [
  "All",
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
const TYPES = ["All", "EXPENSE", "INCOME", "TRANSFER"];

const CATEGORY_META: Record<string, { emoji: string; color: string }> = {
  "Food & Groceries": { emoji: "🍔", color: "#FF6B6B" },
  Subscriptions: { emoji: "🎬", color: "#FFD93D" },
  Transport: { emoji: "🚗", color: "#4ECDC4" },
  Salary: { emoji: "💰", color: GREEN },
  Shopping: { emoji: "🛍️", color: "#C689C6" },
  Healthcare: { emoji: "💊", color: "#F87171" },
  Housing: { emoji: "🏠", color: "#60A5FA" },
  Utilities: { emoji: "⚡", color: "#FBBF24" },
  Investments: { emoji: "📈", color: "#9B59F5" },
  General: { emoji: "💸", color: MUTED },
};
function getMeta(cat: string) {
  return CATEGORY_META[cat] || CATEGORY_META["General"];
}

// ─── SMS Modal ────────────────────────────────────────────────────────────────

function SmsModal({
  visible,
  authorId,
  onClose,
  onSuccess,
}: {
  visible: boolean;
  authorId: string;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!text.trim()) return;
    setLoading(true);
    setResult(null);
    try {
      const tx = await ingestSms(text.trim(), authorId);
      if ((tx as any).deduplicated) {
        setResult("⚡ Already exists — skipped (duplicate)");
      } else {
        setResult(`✅ Parsed: ₹${tx.amount} ${tx.type} · ${tx.category}`);
        onSuccess();
      }
    } catch (e: any) {
      setResult(`❌ ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={smsS.overlay}>
        <View style={smsS.sheet}>
          <Text style={smsS.title}>📲 Paste Bank SMS</Text>
          <Text style={smsS.sub}>
            Paste the raw SMS from your bank. CashSync will parse it
            automatically.
          </Text>
          <TextInput
            style={smsS.input}
            multiline
            numberOfLines={5}
            placeholder={
              "e.g. Rs.350.00 debited from Axis Bank A/c XX1234 on 07-Mar at SWIGGY ref 123456"
            }
            placeholderTextColor="#3D4E68"
            value={text}
            onChangeText={setText}
            selectionColor={ACCENT}
          />
          {result && (
            <View
              style={[
                smsS.resultBox,
                {
                  borderColor: result.startsWith("✅")
                    ? GREEN + "44"
                    : RED + "44",
                },
              ]}
            >
              <Text style={{ color: "#fff", fontSize: 13 }}>{result}</Text>
            </View>
          )}
          <View style={smsS.btnRow}>
            <Pressable style={smsS.cancelBtn} onPress={onClose}>
              <Text style={{ color: MUTED, fontWeight: "600" }}>Cancel</Text>
            </Pressable>
            <Pressable
              style={smsS.submitBtn}
              onPress={handleSubmit}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={smsS.submitText}>Parse & Add</Text>
              )}
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const smsS = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "#000a", justifyContent: "flex-end" },
  sheet: {
    backgroundColor: "#1A2235",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    gap: 14,
    paddingBottom: 40,
  },
  title: { fontSize: 20, fontWeight: "800", color: "#fff" },
  sub: { fontSize: 13, color: TEXT_DIM, lineHeight: 19 },
  input: {
    backgroundColor: BG,
    borderWidth: 1.5,
    borderColor: BORDER,
    borderRadius: 14,
    padding: 16,
    color: "#fff",
    fontSize: 14,
    textAlignVertical: "top",
    minHeight: 110,
  },
  resultBox: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 12,
    backgroundColor: "#ffffff08",
  },
  btnRow: { flexDirection: "row", gap: 12 },
  cancelBtn: {
    flex: 1,
    paddingVertical: 16,
    backgroundColor: CARD_BG,
    borderRadius: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: BORDER,
  },
  submitBtn: {
    flex: 2,
    paddingVertical: 16,
    backgroundColor: ACCENT,
    borderRadius: 14,
    alignItems: "center",
  },
  submitText: { color: "#fff", fontWeight: "700", fontSize: 16 },
});

// ─── Rename Modal ─────────────────────────────────────────────────────────────

function RenameModal({
  tx,
  onClose,
  onSaved,
}: {
  tx: Transaction;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [title, setTitle] = useState(tx.title);
  const [note, setNote] = useState(tx.note || "");
  const [category, setCategory] = useState(tx.category);
  const [loading, setLoading] = useState(false);

  const save = async () => {
    setLoading(true);
    try {
      await updateTransaction(tx.id, { title, note, category });
      onSaved();
      onClose();
    } catch (_) {
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View style={smsS.overlay}>
        <View style={smsS.sheet}>
          <Text style={smsS.title}>✏️ Edit Transaction</Text>
          <Text style={[smsS.sub, { opacity: 0.6 }]}>
            Original: {tx.originalTitle || tx.title}
          </Text>

          <TextInput
            style={[smsS.input, { minHeight: 0 }]}
            value={title}
            onChangeText={setTitle}
            placeholder="Display name"
            placeholderTextColor="#3D4E68"
            selectionColor={ACCENT}
          />
          <TextInput
            style={[smsS.input, { minHeight: 0 }]}
            value={note}
            onChangeText={setNote}
            placeholder="Add a note…"
            placeholderTextColor="#3D4E68"
            selectionColor={ACCENT}
          />

          {/* Category picker */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 8, paddingBottom: 4 }}
          >
            {[
              "Food & Groceries",
              "Subscriptions",
              "Transport",
              "Salary",
              "Shopping",
              "Healthcare",
              "Utilities",
              "Investments",
              "General",
            ].map((c) => (
              <Pressable
                key={c}
                onPress={() => setCategory(c)}
                style={{
                  paddingHorizontal: 14,
                  paddingVertical: 8,
                  borderRadius: 20,
                  backgroundColor: category === c ? ACCENT + "33" : CARD_BG,
                  borderWidth: 1,
                  borderColor: category === c ? ACCENT : BORDER,
                }}
              >
                <Text
                  style={{
                    color: category === c ? ACCENT : TEXT_DIM,
                    fontWeight: "600",
                    fontSize: 12,
                  }}
                >
                  {getMeta(c).emoji} {c}
                </Text>
              </Pressable>
            ))}
          </ScrollView>

          <View style={smsS.btnRow}>
            <Pressable style={smsS.cancelBtn} onPress={onClose}>
              <Text style={{ color: MUTED, fontWeight: "600" }}>Cancel</Text>
            </Pressable>
            <Pressable style={smsS.submitBtn} onPress={save} disabled={loading}>
              {loading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={smsS.submitText}>Save</Text>
              )}
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ─── Main Explore Screen ──────────────────────────────────────────────────────

export default function ExploreScreen() {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterCat, setFilterCat] = useState("All");
  const [filterType, setFilterType] = useState("All");
  const [smsOpen, setSmsOpen] = useState(false);
  const [editTx, setEditTx] = useState<Transaction | null>(null);

  const fetch = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const opts: any = {};
      if (filterCat !== "All") opts.category = filterCat;
      if (filterType !== "All") opts.type = filterType;
      const res = await getTransactions(user.id, opts);
      setTransactions(res.transactions);
    } catch (_) {
    } finally {
      setLoading(false);
    }
  }, [user, filterCat, filterType]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return (
    <View style={{ flex: 1, backgroundColor: BG }}>
      <LinearGradient
        colors={[BG, "#111827"]}
        style={StyleSheet.absoluteFill}
      />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={s.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Header ── */}
        <View style={s.header}>
          <Text style={s.heading}>Transactions</Text>
          <Pressable style={s.smsBtn} onPress={() => setSmsOpen(true)}>
            <Text style={s.smsBtnText}>📲 Add SMS</Text>
          </Pressable>
        </View>

        {/* ── Type filter ── */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.pills}
          style={{ marginBottom: 12 }}
        >
          {TYPES.map((t) => (
            <Pressable
              key={t}
              onPress={() => setFilterType(t)}
              style={[s.pill, filterType === t && s.pillActive]}
            >
              <Text style={[s.pillText, filterType === t && s.pillTextActive]}>
                {t}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        {/* ── Category filter ── */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.pills}
          style={{ marginBottom: 20 }}
        >
          {CATEGORIES.map((c) => (
            <Pressable
              key={c}
              onPress={() => setFilterCat(c)}
              style={[s.pill, filterCat === c && s.pillActive]}
            >
              <Text style={[s.pillText, filterCat === c && s.pillTextActive]}>
                {c !== "All" ? getMeta(c).emoji + " " : ""}
                {c}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        {/* ── List ── */}
        {loading ? (
          <ActivityIndicator color={ACCENT} style={{ marginTop: 40 }} />
        ) : transactions.length === 0 ? (
          <View style={s.empty}>
            <Text style={{ fontSize: 42, marginBottom: 12 }}>🔍</Text>
            <Text style={{ color: MUTED, fontSize: 15 }}>
              No transactions found
            </Text>
          </View>
        ) : (
          transactions.map((tx) => (
            <Pressable key={tx.id} onLongPress={() => setEditTx(tx)}>
              <TxCard tx={tx} />
            </Pressable>
          ))
        )}

        {transactions.length > 0 && (
          <Text style={s.hint}>
            Long-press any transaction to rename or re-categorise
          </Text>
        )}
      </ScrollView>

      {/* Modals */}
      {user && (
        <SmsModal
          visible={smsOpen}
          authorId={user.id}
          onClose={() => setSmsOpen(false)}
          onSuccess={fetch}
        />
      )}
      {editTx && (
        <RenameModal
          tx={editTx}
          onClose={() => setEditTx(null)}
          onSaved={fetch}
        />
      )}
    </View>
  );
}

// ─── Transaction Card (detailed) ──────────────────────────────────────────────

function TxCard({ tx }: { tx: Transaction }) {
  const isCredit = tx.type === "INCOME";
  const meta = getMeta(tx.category);
  return (
    <View style={c.card}>
      <View style={[c.icon, { backgroundColor: meta.color + "22" }]}>
        <Text style={{ fontSize: 22 }}>{meta.emoji}</Text>
      </View>
      <View style={c.info}>
        <Text style={c.title} numberOfLines={1}>
          {tx.title}
        </Text>
        {tx.note ? (
          <Text style={c.note} numberOfLines={1}>
            {tx.note}
          </Text>
        ) : null}
        <View
          style={{
            flexDirection: "row",
            gap: 8,
            alignItems: "center",
            marginTop: 3,
          }}
        >
          <View style={c.catPill}>
            <Text style={c.catText}>{tx.category}</Text>
          </View>
          <Text style={c.date}>
            {new Date(tx.date).toLocaleDateString("en-IN", {
              day: "numeric",
              month: "short",
              year: "2-digit",
            })}
          </Text>
          {tx.source !== "MANUAL" && (
            <View style={[c.catPill, { backgroundColor: "#9B59F522" }]}>
              <Text style={[c.catText, { color: "#9B59F5" }]}>{tx.source}</Text>
            </View>
          )}
          {!tx.isPersonal && (
            <View style={[c.catPill, { backgroundColor: ACCENT + "22" }]}>
              <Text style={[c.catText, { color: ACCENT }]}>Shared</Text>
            </View>
          )}
        </View>
      </View>
      <Text style={[c.amount, { color: isCredit ? GREEN : "#fff" }]}>
        {isCredit ? "+" : "−"}₹{tx.amount.toLocaleString("en-IN")}
      </Text>
    </View>
  );
}

const c = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: CARD_BG,
    borderRadius: 18,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: BORDER,
  },
  icon: {
    width: 50,
    height: 50,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  info: { flex: 1 },
  title: { fontSize: 15, fontWeight: "700", color: "#fff", marginBottom: 2 },
  note: { fontSize: 12, color: TEXT_DIM, marginBottom: 2 },
  date: { fontSize: 11, color: MUTED },
  catPill: {
    backgroundColor: "#ffffff10",
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  catText: { fontSize: 10, color: TEXT_DIM, fontWeight: "600" },
  amount: { fontSize: 16, fontWeight: "700", marginLeft: 8 },
});

const s = StyleSheet.create({
  scroll: {
    paddingHorizontal: 18,
    paddingTop: Platform.OS === "web" ? 40 : 58,
    paddingBottom: 110,
    maxWidth: 680,
    alignSelf: "center",
    width: "100%",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  heading: { fontSize: 26, fontWeight: "800", color: "#fff" },
  smsBtn: {
    backgroundColor: GREEN + "22",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: GREEN + "33",
  },
  smsBtnText: { color: GREEN, fontWeight: "700", fontSize: 13 },
  pills: { gap: 8, paddingBottom: 4 },
  pill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: CARD_BG,
    borderWidth: 1,
    borderColor: BORDER,
  },
  pillActive: { backgroundColor: ACCENT + "22", borderColor: ACCENT },
  pillText: { fontSize: 13, color: TEXT_DIM, fontWeight: "600" },
  pillTextActive: { color: ACCENT },
  empty: { alignItems: "center", paddingVertical: 64 },
  hint: {
    textAlign: "center",
    color: MUTED,
    fontSize: 12,
    marginTop: 12,
    paddingBottom: 4,
  },
});
