import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
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
import { getGroups, GroupSummary } from "@/src/features/group";
import {
  addSplits,
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
const SOURCES = ["All", "MANUAL", "SMS", "EMAIL", "API"];

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
  Investments: { icon: "trending-up", color: "#9B59F5" },
  General: { icon: "wallet", color: MUTED },
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
  const [loadingAuto, setLoadingAuto] = useState(false);
  const [loadingManual, setLoadingManual] = useState(false);
  const [manualOpen, setManualOpen] = useState(false);
  const [autoStatus, setAutoStatus] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);

  const looksLikeTransactionSms = (value: string) =>
    /(upi|debited|credited|sent|received|a\/c|ac\s*x?\d|bank|ref)/i.test(value);

  const parseAndIngest = async (
    rawSms: string,
    mode: "AUTO" | "MANUAL",
  ): Promise<boolean> => {
    try {
      const tx = await ingestSms(rawSms, authorId);
      if ((tx as any).deduplicated) {
        setResult("⚡ Already exists — skipped (duplicate)");
      } else {
        setResult(`✅ Parsed: ₹${tx.amount} ${tx.type} · ${tx.category}`);
        if (mode === "AUTO") {
          setAutoStatus("Auto-detected and added from clipboard.");
        }
        onSuccess();
      }
      return true;
    } catch (e: any) {
      setResult(`❌ ${e.message}`);
      if (mode === "AUTO") {
        setAutoStatus(
          "Found text, but parsing failed. Use manual fallback below.",
        );
      }
    }
    return false;
  };

  const handleAutoDetect = async () => {
    setLoadingAuto(true);
    setResult(null);
    setAutoStatus("Checking clipboard for a bank SMS...");
    try {
      const clipboardText = (await Clipboard.getStringAsync()).trim();
      if (!clipboardText) {
        setAutoStatus(
          "Clipboard is empty. Copy your bank SMS, then tap Auto Detect.",
        );
        return;
      }

      setText(clipboardText);
      if (!looksLikeTransactionSms(clipboardText)) {
        setAutoStatus(
          "Clipboard has text, but it does not look like a transaction SMS.",
        );
        return;
      }

      await parseAndIngest(clipboardText, "AUTO");
    } catch (_) {
      setAutoStatus(
        "Could not read clipboard on this device. Use manual fallback below.",
      );
    } finally {
      setLoadingAuto(false);
    }
  };

  const handleManualSubmit = async () => {
    const rawSms = text.trim();
    if (!rawSms) return;
    setLoadingManual(true);
    setResult(null);
    await parseAndIngest(rawSms, "MANUAL");
    setLoadingManual(false);
  };

  useEffect(() => {
    if (!visible) return;
    setResult(null);
    setAutoStatus(null);
    setManualOpen(false);
    void handleAutoDetect();
  }, [visible]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={smsS.overlay}>
        <View style={smsS.sheet}>
          <Text style={smsS.title}>
            <Ionicons name="chatbubble-ellipses" size={20} color={ACCENT} />{" "}
            Auto Detect Bank SMS
          </Text>
          <Text style={smsS.sub}>
            CashSync checks your clipboard first (mobile/web/tablet). Manual
            input stays available as fallback.
          </Text>
          {autoStatus && (
            <View style={[smsS.resultBox, { borderColor: ACCENT + "44" }]}>
              <Text style={{ color: "#fff", fontSize: 13 }}>{autoStatus}</Text>
            </View>
          )}
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
          <Pressable
            style={smsS.submitBtn}
            onPress={handleAutoDetect}
            disabled={loadingAuto}
          >
            {loadingAuto ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={smsS.submitText}>Auto Detect</Text>
            )}
          </Pressable>
          <Pressable
            style={smsS.toggleManual}
            onPress={() => setManualOpen((v) => !v)}
          >
            <Text style={smsS.toggleManualText}>
              {manualOpen ? "Hide manual fallback" : "Add message manually"}
            </Text>
          </Pressable>
          {manualOpen && (
            <>
              <TextInput
                style={smsS.input}
                multiline
                numberOfLines={5}
                placeholder={
                  "e.g. Sent Rs.25.00 from Kotak Bank AC X0149 to Q986578614@ybl on 08-03-26. UPI Ref 593237371464."
                }
                placeholderTextColor="#3D4E68"
                value={text}
                onChangeText={setText}
                selectionColor={ACCENT}
              />
              <Pressable
                style={smsS.submitBtn}
                onPress={handleManualSubmit}
                disabled={loadingManual}
              >
                {loadingManual ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={smsS.submitText}>Parse Manual Message</Text>
                )}
              </Pressable>
            </>
          )}
          <View style={smsS.btnRow}>
            <Pressable style={smsS.cancelBtn} onPress={onClose}>
              <Text style={{ color: MUTED, fontWeight: "600" }}>Cancel</Text>
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
  toggleManual: {
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: CARD_BG,
  },
  toggleManualText: { color: TEXT_DIM, fontSize: 12, fontWeight: "700" },
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
  const [isPersonal, setIsPersonal] = useState(tx.isPersonal);
  const [loading, setLoading] = useState(false);

  const save = async () => {
    setLoading(true);
    try {
      await updateTransaction(tx.id, { title, note, category, isPersonal });
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
          <Text style={smsS.title}>
            <Ionicons name="pencil" size={20} color={ACCENT} /> Edit Transaction
          </Text>
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
          <Pressable
            onPress={() => setIsPersonal((v) => !v)}
            style={[
              smsS.resultBox,
              {
                borderColor: isPersonal ? GREEN + "44" : ACCENT + "44",
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
              },
            ]}
          >
            <Text style={{ color: "#fff", fontSize: 13 }}>Personal Use</Text>
            <Text
              style={{ color: isPersonal ? GREEN : ACCENT, fontWeight: "700" }}
            >
              {isPersonal ? "ON" : "OFF"}
            </Text>
          </Pressable>

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
                <Ionicons
                  name={getMeta(c).icon}
                  size={14}
                  color={category === c ? ACCENT : TEXT_DIM}
                />
                <Text
                  style={{
                    color: category === c ? ACCENT : TEXT_DIM,
                    fontWeight: "600",
                    fontSize: 12,
                  }}
                >
                  {" "}
                  {c}
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

function SplitModal({
  tx,
  authorId,
  onClose,
  onSaved,
}: {
  tx: Transaction;
  authorId: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [groups, setGroups] = useState<GroupSummary[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(
    tx.groupId ?? null,
  );
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let mounted = true;
    getGroups(authorId)
      .then((res) => {
        if (!mounted) return;
        setGroups(res);
        if (!selectedGroupId && res.length > 0) {
          setSelectedGroupId(res[0]!.id);
        }
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, [authorId]);

  const selectedGroup = groups.find((g) => g.id === selectedGroupId) || null;

  useEffect(() => {
    if (!selectedGroup) {
      setSelectedMemberIds([]);
      return;
    }
    setSelectedMemberIds(selectedGroup.members.map((m) => m.user.id));
  }, [selectedGroupId, selectedGroup?.members.length]);

  const toggleMember = (id: string) => {
    setSelectedMemberIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const save = async () => {
    if (!selectedGroupId || !selectedMemberIds.length) return;

    setLoading(true);
    try {
      await addSplits(
        tx.id,
        selectedMemberIds.map((id) => ({ userId: id })),
        "EQUAL",
        tx.amount,
      );
      await updateTransaction(tx.id, {
        isPersonal: false,
        groupId: selectedGroupId,
      });
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
          <Text style={smsS.title}>
            <Ionicons name="people" size={20} color={ACCENT} /> Split
            Transaction
          </Text>
          <Text style={smsS.sub}>Pick a group and members by name.</Text>
          <Text style={[smsS.sub, { opacity: 0.7 }]}>
            Amount: ₹{tx.amount.toLocaleString("en-IN")} · Method: Equal split
          </Text>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 8, paddingBottom: 4 }}
          >
            {groups.map((group) => (
              <Pressable
                key={group.id}
                onPress={() => setSelectedGroupId(group.id)}
                style={{
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                  borderRadius: 20,
                  borderWidth: 1,
                  borderColor: selectedGroupId === group.id ? ACCENT : BORDER,
                  backgroundColor:
                    selectedGroupId === group.id ? ACCENT + "22" : CARD_BG,
                }}
              >
                <Text
                  style={{
                    color: selectedGroupId === group.id ? ACCENT : TEXT_DIM,
                    fontWeight: "700",
                    fontSize: 12,
                  }}
                >
                  {group.emoji ? `${group.emoji} ` : ""}
                  {group.name}
                </Text>
              </Pressable>
            ))}
          </ScrollView>

          {selectedGroup && (
            <View style={{ gap: 8 }}>
              <Text style={[smsS.sub, { marginTop: 4 }]}>Members</Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                {selectedGroup.members.map((member) => {
                  const selected = selectedMemberIds.includes(member.user.id);
                  return (
                    <Pressable
                      key={member.id}
                      onPress={() => toggleMember(member.user.id)}
                      style={{
                        paddingHorizontal: 12,
                        paddingVertical: 8,
                        borderRadius: 18,
                        borderWidth: 1,
                        borderColor: selected ? GREEN : BORDER,
                        backgroundColor: selected ? GREEN + "22" : CARD_BG,
                      }}
                    >
                      <Text
                        style={{
                          color: selected ? GREEN : TEXT_DIM,
                          fontSize: 12,
                          fontWeight: "700",
                        }}
                      >
                        {member.user.name ||
                          member.user.email.split("@")[0] ||
                          "Member"}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          )}

          {!selectedGroup && (
            <View style={[smsS.resultBox, { borderColor: RED + "44" }]}>
              <Text style={{ color: TEXT_DIM, fontSize: 12 }}>
                Create a group first in the Split tab, then split here.
              </Text>
            </View>
          )}

          <View style={smsS.btnRow}>
            <Pressable style={smsS.cancelBtn} onPress={onClose}>
              <Text style={{ color: MUTED, fontWeight: "600" }}>Cancel</Text>
            </Pressable>
            <Pressable
              style={smsS.submitBtn}
              onPress={save}
              disabled={loading || !selectedGroup || !selectedMemberIds.length}
            >
              {loading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={smsS.submitText}>Save Split</Text>
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
  const [filterSource, setFilterSource] = useState("All");
  const [search, setSearch] = useState("");
  const [dateRange, setDateRange] = useState<"ALL" | "7D" | "30D">("ALL");
  const [smsOpen, setSmsOpen] = useState(false);
  const [editTx, setEditTx] = useState<Transaction | null>(null);
  const [splitTx, setSplitTx] = useState<Transaction | null>(null);

  const fetch = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const opts: any = {};
      if (filterCat !== "All") opts.category = filterCat;
      if (filterType !== "All") opts.type = filterType;
      if (filterSource !== "All") opts.source = filterSource;
      if (search.trim()) opts.q = search.trim();
      if (dateRange !== "ALL") {
        const days = dateRange === "7D" ? 7 : 30;
        const from = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
        opts.from = from.toISOString();
      }
      const res = await getTransactions(user.id, opts);
      setTransactions(res.transactions);
    } catch (_) {
    } finally {
      setLoading(false);
    }
  }, [user, filterCat, filterType, filterSource, search, dateRange]);

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
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 6 }}
            >
              <Ionicons name="scan" size={14} color={GREEN} />
              <Text style={s.smsBtnText}>Auto Detect</Text>
            </View>
          </Pressable>
        </View>

        <TextInput
          style={s.search}
          value={search}
          onChangeText={setSearch}
          placeholder="Search merchant, title, notes"
          placeholderTextColor={MUTED}
          selectionColor={ACCENT}
        />

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

        {/* ── Source filter ── */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.pills}
          style={{ marginBottom: 12 }}
        >
          {SOURCES.map((source) => (
            <Pressable
              key={source}
              onPress={() => setFilterSource(source)}
              style={[s.pill, filterSource === source && s.pillActive]}
            >
              <Text
                style={[
                  s.pillText,
                  filterSource === source && s.pillTextActive,
                ]}
              >
                {source}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        {/* ── Date filter ── */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.pills}
          style={{ marginBottom: 12 }}
        >
          {["ALL", "7D", "30D"].map((window) => (
            <Pressable
              key={window}
              onPress={() => setDateRange(window as "ALL" | "7D" | "30D")}
              style={[s.pill, dateRange === window && s.pillActive]}
            >
              <Text
                style={[s.pillText, dateRange === window && s.pillTextActive]}
              >
                {window === "ALL" ? "All Dates" : `Last ${window}`}
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
              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 4 }}
              >
                {c !== "All" && (
                  <Ionicons
                    name={getMeta(c).icon}
                    size={14}
                    color={filterCat === c ? ACCENT : TEXT_DIM}
                  />
                )}
                <Text style={[s.pillText, filterCat === c && s.pillTextActive]}>
                  {c}
                </Text>
              </View>
            </Pressable>
          ))}
        </ScrollView>

        {/* ── List ── */}
        {loading ? (
          <ActivityIndicator color={ACCENT} style={{ marginTop: 40 }} />
        ) : transactions.length === 0 ? (
          <View style={s.empty}>
            <Ionicons
              name="search"
              size={42}
              color={MUTED}
              style={{ marginBottom: 12 }}
            />
            <Text style={{ color: MUTED, fontSize: 15 }}>
              No transactions found
            </Text>
          </View>
        ) : (
          transactions.map((tx) => (
            <Pressable
              key={tx.id}
              onLongPress={() => setEditTx(tx)}
              onPress={() => setSplitTx(tx)}
            >
              <TxCard tx={tx} />
            </Pressable>
          ))
        )}

        {transactions.length > 0 && (
          <Text style={s.hint}>
            Tap to split. Long-press to rename or re-categorise.
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
      {splitTx && (
        <SplitModal
          tx={splitTx}
          authorId={user!.id}
          onClose={() => setSplitTx(null)}
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
        <Ionicons name={meta.icon} size={24} color={meta.color} />
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
  search: {
    backgroundColor: CARD_BG,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 11,
    color: "#fff",
    marginBottom: 12,
  },
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
