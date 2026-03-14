import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import { LinearGradient } from "expo-linear-gradient";
import React, { useCallback, useEffect, useMemo, useState } from "react";
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
import { useAppTheme } from "@/src/context/ThemeContext";
import { getGroups, GroupSummary } from "@/src/features/group";
import {
  addSplits,
  createTransaction,
  getFriendBalances,
  getTransactions,
  ingestSms,
  Transaction,
  updateTransaction,
} from "@/src/features/transaction";
import { getAllUsers } from "@/src/features/user";
import { formatCurrency, normalizeCurrency, SUPPORTED_CURRENCIES } from "@/src/lib/currency";

const BG = "#0D1117";
const CARD_BG = "#161D2C";
const BORDER = "#1E2D46";
const ACCENT = "#4F8EF7";
const GREEN = "#34D399";
const RED = "#F87171";
const AMBER = "#FBBF24";
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
const REVIEW_STATES = ["ALL", "UNREVIEWED", "PERSONAL", "SPLIT"] as const;

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

function getReviewMeta(tx: Transaction) {
  if (tx.reviewState === "SPLIT") {
    const others = tx.splits.filter((split) => split.user.id !== tx.authorId).length;
    return {
      label: others > 0 ? `Split · ${others} ${others === 1 ? "person" : "people"}` : "Split",
      color: ACCENT,
      background: ACCENT + "22",
    };
  }

  if (tx.reviewState === "PERSONAL") {
    return {
      label: "Personal",
      color: GREEN,
      background: GREEN + "22",
    };
  }

  return {
    label: "Needs Label",
    color: AMBER,
    background: AMBER + "22",
  };
}

function displayPersonName(person: { name?: string; email: string }) {
  return person.name || person.email.split("@")[0] || "User";
}

function formatBalanceHint(net: number, currency: string) {
  if (net > 0) {
    return `Owes you ${formatCurrency(net, currency)}`;
  }
  if (net < 0) {
    return `You owe ${formatCurrency(Math.abs(net), currency)}`;
  }
  return "All settled";
}

// ─── SMS Modal ────────────────────────────────────────────────────────────────

type SmsModalProps = Readonly<{
  visible: boolean;
  authorId: string;
  onClose: () => void;
  onSuccess: () => void;
}>;

function SmsModal({
  visible,
  authorId,
  onClose,
  onSuccess,
}: SmsModalProps) {
  const [text, setText] = useState("");
  const [loadingAuto, setLoadingAuto] = useState(false);
  const [loadingManual, setLoadingManual] = useState(false);
  const [manualOpen, setManualOpen] = useState(false);
  const [autoStatus, setAutoStatus] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);

  const looksLikeTransactionSms = useCallback((value: string) =>
    /(upi|debited|credited|sent|received|a\/c|ac\s*x?\d|bank|ref)/i.test(value), []);

  const parseAndIngest = useCallback(async (
    rawSms: string,
    mode: "AUTO" | "MANUAL",
  ): Promise<boolean> => {
    try {
      const tx = await ingestSms(rawSms, authorId);
      if ((tx as any).deduplicated) {
        setResult("⚡ Already exists — skipped (duplicate)");
      } else {
        setResult(`✅ Parsed: ${formatCurrency(tx.amount, tx.currency)} ${tx.type} · ${tx.category}`);
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
  }, [authorId, onSuccess]);

  const handleAutoDetect = useCallback(async () => {
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
    } catch {
      setAutoStatus(
        "Could not read clipboard on this device. Use manual fallback below.",
      );
    } finally {
      setLoadingAuto(false);
    }
  }, [looksLikeTransactionSms, parseAndIngest]);

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
    handleAutoDetect();
  }, [visible, handleAutoDetect]);

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

type RenameModalProps = Readonly<{
  tx: Transaction;
  onClose: () => void;
  onSaved: () => void;
  onOpenSplit: (tx: Transaction) => void;
}>;

function RenameModal({
  tx,
  onClose,
  onSaved,
  onOpenSplit,
}: RenameModalProps) {
  const [title, setTitle] = useState(tx.title);
  const [note, setNote] = useState(tx.note || "");
  const [category, setCategory] = useState(tx.category);
  const [decision, setDecision] = useState<"PERSONAL" | "SPLIT" | null>(
    tx.reviewState === "UNREVIEWED" ? null : tx.reviewState,
  );
  const [loading, setLoading] = useState(false);

  const save = async () => {
    if (!decision) return;

    setLoading(true);
    try {
      if (decision === "SPLIT") {
        await updateTransaction(tx.id, { title, note, category });
        onClose();
        onOpenSplit({ ...tx, title, note, category });
        return;
      }

      await updateTransaction(tx.id, {
        title,
        note,
        category,
        isPersonal: true,
        reviewState: "PERSONAL",
        groupId: null,
      });
      onSaved();
      onClose();
    } catch {
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
          <Text style={smsS.sub}>
            Label this transaction as personal or split. Once saved, CashSync
            hides the other path from the list until you edit it again.
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
          <View style={r.choiceRow}>
            <Pressable
              onPress={() => setDecision("PERSONAL")}
              style={[
                r.choiceCard,
                decision === "PERSONAL" && {
                  borderColor: GREEN,
                  backgroundColor: GREEN + "14",
                },
              ]}
            >
              <Text
                style={[
                  r.choiceTitle,
                  decision === "PERSONAL" && { color: GREEN },
                ]}
              >
                Personal
              </Text>
              <Text style={r.choiceBody}>
                Track it as your own expense, income, or credit.
              </Text>
            </Pressable>

            <Pressable
              onPress={() => setDecision("SPLIT")}
              style={[
                r.choiceCard,
                decision === "SPLIT" && {
                  borderColor: ACCENT,
                  backgroundColor: ACCENT + "14",
                },
              ]}
            >
              <Text
                style={[
                  r.choiceTitle,
                  decision === "SPLIT" && { color: ACCENT },
                ]}
              >
                Split
              </Text>
              <Text style={r.choiceBody}>
                Share it with a group, one person, or multiple people.
              </Text>
            </Pressable>
          </View>

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

          <View
            style={[
              smsS.resultBox,
              {
                borderColor:
                  decision === "SPLIT" ? ACCENT + "44" : GREEN + "44",
              },
            ]}
          >
            <Text style={{ color: "#fff", fontSize: 13 }}>
              {decision === "SPLIT"
                ? "Split setup opens next, where you can choose a group or select people from your friends and user lists."
                : decision === "PERSONAL"
                  ? "Saving as personal clears any existing split and keeps it only in your private cashflow."
                  : "Choose a label to continue."}
            </Text>
          </View>

          <View style={smsS.btnRow}>
            <Pressable style={smsS.cancelBtn} onPress={onClose}>
              <Text style={{ color: MUTED, fontWeight: "600" }}>Cancel</Text>
            </Pressable>
            <Pressable
              style={[
                smsS.submitBtn,
                !decision && { opacity: 0.5 },
              ]}
              onPress={save}
              disabled={loading || !decision}
            >
              {loading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={smsS.submitText}>
                  {decision === "SPLIT" ? "Continue to Split" : "Save Personal"}
                </Text>
              )}
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

type SplitModalProps = Readonly<{
  tx: Transaction;
  authorId: string;
  onClose: () => void;
  onSaved: () => void;
}>;

function SplitModal({
  tx,
  authorId,
  onClose,
  onSaved,
}: SplitModalProps) {
  const [groups, setGroups] = useState<GroupSummary[]>([]);
  const [allUsers, setAllUsers] = useState<
    { id: string; name?: string; email: string }[]
  >([]);
  const [friendBalances, setFriendBalances] = useState<
    {
      userId: string;
      user: { id: string; name?: string; email: string };
      net: number;
    }[]
  >([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(
    tx.groupId ?? null,
  );
  const [shareMode, setShareMode] = useState<"GROUP" | "PERSON">(
    tx.groupId ? "GROUP" : "PERSON",
  );
  const [selectedPersonIds, setSelectedPersonIds] = useState<string[]>(
    tx.splits
      .filter((split) => split.user.id !== authorId)
      .map((split) => split.user.id),
  );
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let mounted = true;
    Promise.all([getGroups(authorId), getAllUsers(), getFriendBalances(authorId)])
      .then(([groupRes, userRes, friendRes]) => {
        if (!mounted) return;
        setGroups(groupRes);
        setAllUsers(
          userRes
            .filter((user: any) => user.id !== authorId)
            .map((user: any) => ({
              id: user.id,
              name: user.name ?? undefined,
              email: user.email,
            })),
        );
        setFriendBalances(
          friendRes.map((friend) => ({
            userId: friend.userId,
            user: friend.user,
            net: friend.net,
          })),
        );
        if (!selectedGroupId && groupRes.length > 0) {
          setSelectedGroupId(groupRes[0]!.id);
        }
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, [authorId, selectedGroupId]);

  const selectedGroup = groups.find((g) => g.id === selectedGroupId) || null;
  const groupMembers =
    selectedGroup?.members.filter((member) => member.user.id !== authorId) || [];
  const friendOptions = friendBalances.map((friend) => ({
    id: friend.userId,
    name: friend.user.name,
    email: friend.user.email,
    net: friend.net,
  }));
  const friendIds = new Set(friendOptions.map((person) => person.id));
  const userOptions = allUsers.filter((person) => !friendIds.has(person.id));
  const peopleOptions = [
    ...friendOptions.map((person) => ({
      ...person,
      source: "Friend" as const,
      hint: formatBalanceHint(person.net, tx.currency),
    })),
    ...userOptions.map((person) => ({
      ...person,
      source: "User" as const,
      hint: person.email,
    })),
  ];
  const selectedPeopleSummary =
    selectedPersonIds.length > 0
      ? `${selectedPersonIds.length} ${selectedPersonIds.length === 1 ? "person" : "people"} selected`
      : "Choose people";

  useEffect(() => {
    if (shareMode !== "GROUP") return;
    if (!selectedGroupId && groups.length > 0) {
      setSelectedGroupId(groups[0]!.id);
    }
  }, [shareMode, selectedGroupId, groups]);

  const togglePerson = (id: string) => {
    setSelectedPersonIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const splitUserIds = [
    authorId,
    ...(shareMode === "GROUP"
      ? groupMembers.map((member) => member.user.id)
      : selectedPersonIds),
  ];

  const save = async () => {
    if (splitUserIds.length <= 1) return;

    setLoading(true);
    try {
      await addSplits(
        tx.id,
        splitUserIds.map((id) => ({ userId: id })),
        "EQUAL",
        tx.amount,
        shareMode === "GROUP" ? selectedGroupId : null,
      );
      onSaved();
      onClose();
    } catch {
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
          <Text style={smsS.sub}>
            Choose whether this should be shared with a group or directly with
            people from your friend and user lists.
          </Text>
          <Text style={[smsS.sub, { opacity: 0.7 }]}>
            Amount: {formatCurrency(tx.amount, tx.currency)} · Method: Equal split
          </Text>

          <View style={r.choiceRow}>
            {[
              { id: "GROUP", label: "Group" },
              { id: "PERSON", label: "People" },
            ].map((option) => (
              <Pressable
                key={option.id}
                onPress={() => setShareMode(option.id as "GROUP" | "PERSON")}
                style={[
                  r.choicePill,
                  shareMode === option.id && r.choicePillActive,
                ]}
              >
                <Text
                  style={[
                    r.choiceTitle,
                    shareMode === option.id && r.choiceTitleActive,
                  ]}
                >
                  {option.label}
                </Text>
              </Pressable>
            ))}
          </View>

          {shareMode === "GROUP" && (
            <View style={{ gap: 8 }}>
              <Text style={r.sectionLabel}>Choose Group</Text>
              <View style={r.dropdown}>
                {groups.length > 0 ? (
                  groups.map((group) => {
                    const selected = selectedGroupId === group.id;
                    return (
                      <Pressable
                        key={group.id}
                        onPress={() => setSelectedGroupId(group.id)}
                        style={[
                          r.dropdownOption,
                          selected && r.dropdownOptionActive,
                        ]}
                      >
                        <View style={{ flex: 1 }}>
                          <Text
                            style={[
                              r.dropdownTitle,
                              selected && r.dropdownTitleActive,
                            ]}
                          >
                            {group.emoji ? `${group.emoji} ` : ""}
                            {group.name}
                          </Text>
                          <Text
                            style={[
                              r.dropdownMeta,
                              selected && r.dropdownMetaActive,
                            ]}
                          >
                            {group.members.length} people including you
                          </Text>
                        </View>
                        {selected && (
                          <Ionicons name="checkmark-circle" size={18} color={ACCENT} />
                        )}
                      </Pressable>
                    );
                  })
                ) : (
                  <Text style={r.emptyDropdownText}>No groups available yet.</Text>
                )}
              </View>
              {selectedGroup ? (
                <>
                  <Text style={[smsS.sub, { marginTop: 4 }]}>
                    Choose a group and CashSync will include everyone in it.
                  </Text>
                  <View
                    style={[
                      smsS.resultBox,
                      {
                        borderColor: ACCENT + "44",
                      },
                    ]}
                  >
                    <Text style={{ color: "#fff", fontSize: 13 }}>
                      {`${selectedGroup.name} will be split across ${selectedGroup.members.length} people including you.`}
                    </Text>
                  </View>
                </>
              ) : (
                <View style={[smsS.resultBox, { borderColor: RED + "44" }]}>
                  <Text style={{ color: TEXT_DIM, fontSize: 12 }}>
                    Create a group first in the Split tab, then split here.
                  </Text>
                </View>
              )}
            </View>
          )}

          {shareMode === "PERSON" && (
            <View style={{ gap: 12 }}>
              <Text style={[smsS.sub, { marginTop: 4 }]}>
                Choose one or more people from the dropdown below.
              </Text>
              <Text style={r.sectionLabel}>Choose People</Text>
              <View style={r.dropdown}>
                <View style={r.dropdownHeader}>
                  <Text style={r.dropdownHeaderText}>{selectedPeopleSummary}</Text>
                </View>
                {peopleOptions.map((person) => {
                  const selected = selectedPersonIds.includes(person.id);
                  return (
                    <Pressable
                      key={person.id}
                      onPress={() => togglePerson(person.id)}
                      style={[
                        r.dropdownOption,
                        selected && r.dropdownOptionActive,
                      ]}
                    >
                      <View style={{ flex: 1 }}>
                        <Text
                          style={[
                            r.dropdownTitle,
                            selected && r.dropdownTitleActive,
                          ]}
                        >
                          {displayPersonName(person)}
                        </Text>
                        <Text
                          style={[
                            r.dropdownMeta,
                            selected && r.dropdownMetaActive,
                          ]}
                        >
                          {person.source} · {person.hint}
                        </Text>
                      </View>
                      {selected && (
                        <Ionicons name="checkmark-circle" size={18} color={ACCENT} />
                      )}
                    </Pressable>
                  );
                })}
              </View>

              {peopleOptions.length === 0 && (
                <View style={[smsS.resultBox, { borderColor: RED + "44" }]}>
                  <Text style={{ color: TEXT_DIM, fontSize: 12 }}>
                    No people found yet. Add users to groups first, or create
                    more accounts to split with.
                  </Text>
                </View>
              )}

              <View
                style={[
                  smsS.resultBox,
                  {
                    borderColor: ACCENT + "44",
                  },
                ]}
              >
                <Text style={{ color: "#fff", fontSize: 13 }}>
                  {selectedPersonIds.length > 0
                    ? `CashSync will split this across ${selectedPersonIds.length + 1} people including you.`
                    : "Pick at least one person to continue."}
                </Text>
              </View>
            </View>
          )}

          <View style={smsS.btnRow}>
            <Pressable style={smsS.cancelBtn} onPress={onClose}>
              <Text style={{ color: MUTED, fontWeight: "600" }}>Cancel</Text>
            </Pressable>
            <Pressable
              style={smsS.submitBtn}
              onPress={save}
              disabled={
                loading
                || (shareMode === "GROUP" && !selectedGroup)
                || splitUserIds.length <= 1
              }
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

type CreateTransactionModalProps = Readonly<{
  visible: boolean;
  authorId: string;
  defaultCurrency: string;
  onClose: () => void;
  onSaved: () => void;
}>;

function CreateTransactionModal({
  visible,
  authorId,
  defaultCurrency,
  onClose,
  onSaved,
}: CreateTransactionModalProps) {
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [type, setType] = useState<"EXPENSE" | "INCOME" | "TRANSFER">("EXPENSE");
  const [category, setCategory] = useState("General");
  const [currency, setCurrency] = useState(normalizeCurrency(defaultCurrency));
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setCurrency(normalizeCurrency(defaultCurrency));
  }, [defaultCurrency, visible]);

  const submit = async () => {
    const parsedAmount = Number.parseFloat(amount);
    if (!title.trim() || Number.isNaN(parsedAmount) || parsedAmount <= 0) return;

    setLoading(true);
    try {
      await createTransaction({
        title: title.trim(),
        amount: parsedAmount,
        currency,
        type,
        category,
        authorId,
        isPersonal: true,
        reviewState: "PERSONAL",
      });
      setTitle("");
      setAmount("");
      setType("EXPENSE");
      setCategory("General");
      onSaved();
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={smsS.overlay}>
        <View style={smsS.sheet}>
          <Text style={smsS.title}>
            <Ionicons name="add-circle-outline" size={20} color={ACCENT} /> Add Transaction
          </Text>
          <TextInput
            style={[smsS.input, { minHeight: 0 }]}
            value={title}
            onChangeText={setTitle}
            placeholder="Merchant or title"
            placeholderTextColor="#3D4E68"
            selectionColor={ACCENT}
          />
          <TextInput
            style={[smsS.input, { minHeight: 0 }]}
            value={amount}
            onChangeText={setAmount}
            keyboardType="decimal-pad"
            placeholder="Amount"
            placeholderTextColor="#3D4E68"
            selectionColor={ACCENT}
          />

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
            {(["EXPENSE", "INCOME", "TRANSFER"] as const).map((option) => (
              <Pressable
                key={option}
                onPress={() => setType(option)}
                style={[r.choicePill, type === option && r.choicePillActive]}
              >
                <Text style={[r.choiceTitle, type === option && r.choiceTitleActive]}>{option}</Text>
              </Pressable>
            ))}
          </ScrollView>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
            {CATEGORIES.filter((c) => c !== "All").map((option) => (
              <Pressable
                key={option}
                onPress={() => setCategory(option)}
                style={[r.choicePill, category === option && r.choicePillActive]}
              >
                <Text style={[r.choiceTitle, category === option && r.choiceTitleActive]}>{option}</Text>
              </Pressable>
            ))}
          </ScrollView>

          <Text style={r.sectionLabel}>Currency</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
            {SUPPORTED_CURRENCIES.map((option) => (
              <Pressable
                key={option}
                onPress={() => setCurrency(option)}
                style={[r.choicePill, currency === option && r.choicePillActive]}
              >
                <Text style={[r.choiceTitle, currency === option && r.choiceTitleActive]}>{option}</Text>
              </Pressable>
            ))}
          </ScrollView>

          <View style={smsS.btnRow}>
            <Pressable style={smsS.cancelBtn} onPress={onClose}>
              <Text style={{ color: MUTED, fontWeight: "600" }}>Cancel</Text>
            </Pressable>
            <Pressable style={smsS.submitBtn} onPress={submit} disabled={loading}>
              {loading ? <ActivityIndicator color="#fff" size="small" /> : <Text style={smsS.submitText}>Save</Text>}
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
  const { colors } = useAppTheme();
  const styles = useMemo(() => createExploreStyles(colors), [colors]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterCat, setFilterCat] = useState("All");
  const [filterType, setFilterType] = useState("All");
  const [filterSource, setFilterSource] = useState("All");
  const [filterReviewState, setFilterReviewState] =
    useState<(typeof REVIEW_STATES)[number]>("ALL");
  const [search, setSearch] = useState("");
  const [dateRange, setDateRange] = useState<"ALL" | "7D" | "30D">("ALL");
  const [smsOpen, setSmsOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
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
      if (filterReviewState !== "ALL") opts.reviewState = filterReviewState;
      if (search.trim()) opts.q = search.trim();
      if (dateRange !== "ALL") {
        const days = dateRange === "7D" ? 7 : 30;
        const from = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
        opts.from = from.toISOString();
      }
      const res = await getTransactions(user.id, opts);
      setTransactions(res.transactions);
    } catch {
    } finally {
      setLoading(false);
    }
  }, [user, filterCat, filterType, filterSource, filterReviewState, search, dateRange]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <LinearGradient
        colors={[colors.background, colors.backgroundAlt]}
        style={StyleSheet.absoluteFill}
      />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Header ── */}
        <View style={styles.header}>
          <Text style={styles.heading}>Transactions</Text>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Pressable style={styles.smsBtn} onPress={() => setCreateOpen(true)}>
              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 6 }}
              >
                <Ionicons name="add" size={14} color={colors.accent} />
                <Text style={styles.smsBtnText}>Add</Text>
              </View>
            </Pressable>
            <Pressable style={styles.smsBtn} onPress={() => setSmsOpen(true)}>
              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 6 }}
              >
                <Ionicons name="scan" size={14} color={colors.success} />
                <Text style={styles.smsBtnText}>Auto Detect</Text>
              </View>
            </Pressable>
          </View>
        </View>

        <TextInput
          style={styles.search}
          value={search}
          onChangeText={setSearch}
          placeholder="Search merchant, title, notes"
          placeholderTextColor={colors.textMuted}
          selectionColor={colors.accent}
        />

        {/* ── Type filter ── */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.pills}
          style={{ marginBottom: 12 }}
        >
          {TYPES.map((t) => (
            <Pressable
              key={t}
              onPress={() => setFilterType(t)}
              style={[styles.pill, filterType === t && styles.pillActive]}
            >
              <Text style={[styles.pillText, filterType === t && styles.pillTextActive]}>
                {t}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        {/* ── Source filter ── */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.pills}
          style={{ marginBottom: 12 }}
        >
          {SOURCES.map((source) => (
            <Pressable
              key={source}
              onPress={() => setFilterSource(source)}
              style={[styles.pill, filterSource === source && styles.pillActive]}
            >
              <Text
                style={[
                  styles.pillText,
                  filterSource === source && styles.pillTextActive,
                ]}
              >
                {source}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.pills}
          style={{ marginBottom: 12 }}
        >
          {REVIEW_STATES.map((state) => (
            <Pressable
              key={state}
              onPress={() => setFilterReviewState(state)}
              style={[styles.pill, filterReviewState === state && styles.pillActive]}
            >
              <Text
                style={[
                  styles.pillText,
                  filterReviewState === state && styles.pillTextActive,
                ]}
              >
                {state === "ALL"
                  ? "All Labels"
                  : state === "UNREVIEWED"
                    ? "Needs Label"
                    : state}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        {/* ── Date filter ── */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.pills}
          style={{ marginBottom: 12 }}
        >
          {["ALL", "7D", "30D"].map((window) => (
            <Pressable
              key={window}
              onPress={() => setDateRange(window as "ALL" | "7D" | "30D")}
              style={[styles.pill, dateRange === window && styles.pillActive]}
            >
              <Text
                style={[styles.pillText, dateRange === window && styles.pillTextActive]}
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
          contentContainerStyle={styles.pills}
          style={{ marginBottom: 20 }}
        >
          {CATEGORIES.map((c) => (
            <Pressable
              key={c}
              onPress={() => setFilterCat(c)}
              style={[styles.pill, filterCat === c && styles.pillActive]}
            >
              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 4 }}
              >
                {c !== "All" && (
                  <Ionicons
                    name={getMeta(c).icon}
                    size={14}
                    color={filterCat === c ? colors.accent : colors.textMuted}
                  />
                )}
                <Text style={[styles.pillText, filterCat === c && styles.pillTextActive]}>
                  {c}
                </Text>
              </View>
            </Pressable>
          ))}
        </ScrollView>

        {/* ── List ── */}
        {loading ? (
          <ActivityIndicator color={colors.accent} style={{ marginTop: 40 }} />
        ) : transactions.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons
              name="search"
              size={42}
              color={colors.textMuted}
              style={{ marginBottom: 12 }}
            />
            <Text style={{ color: colors.textMuted, fontSize: 15 }}>
              No transactions found
            </Text>
          </View>
        ) : (
          transactions.map((tx) => (
            <Pressable key={tx.id} onPress={() => setEditTx(tx)}>
              <TxCard tx={tx} />
            </Pressable>
          ))
        )}

        {transactions.length > 0 && (
          <Text style={styles.hint}>
            Tap a transaction to label it as personal or split, then edit it
            anytime if someone tapped the wrong option.
          </Text>
        )}
      </ScrollView>

      {/* Modals */}
      {user && (
        <CreateTransactionModal
          visible={createOpen}
          authorId={user.id}
          defaultCurrency={user.defaultCurrency || "INR"}
          onClose={() => setCreateOpen(false)}
          onSaved={fetch}
        />
      )}
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
          onOpenSplit={(tx) => setSplitTx(tx)}
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

function TxCard({ tx }: Readonly<{ tx: Transaction }>) {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createTxCardStyles(colors), [colors]);
  const isCredit = tx.type === "INCOME";
  const meta = getMeta(tx.category);
  const review = getReviewMeta(tx);
  const helperText =
    tx.reviewState === "UNREVIEWED"
      ? "Tap to label as Personal or Split"
      : tx.reviewState === "SPLIT"
        ? "Tap to manage the split"
        : "Tap to edit this personal transaction";
  return (
    <View style={styles.card}>
      <View style={[styles.icon, { backgroundColor: meta.color + "22" }]}>
        <Ionicons name={meta.icon} size={24} color={meta.color} />
      </View>
      <View style={styles.info}>
        <Text style={styles.title} numberOfLines={1}>
          {tx.title}
        </Text>
        {tx.note ? (
          <Text style={styles.note} numberOfLines={1}>
            {tx.note}
          </Text>
        ) : null}
        <Text style={styles.helper}>{helperText}</Text>
        <View
          style={{
            flexDirection: "row",
            gap: 8,
            alignItems: "center",
            marginTop: 3,
          }}
        >
          <View style={styles.catPill}>
            <Text style={styles.catText}>{tx.category}</Text>
          </View>
          <Text style={styles.date}>
            {new Date(tx.date).toLocaleDateString("en-IN", {
              day: "numeric",
              month: "short",
              year: "2-digit",
            })}
          </Text>
          {tx.source !== "MANUAL" && (
            <View style={[styles.catPill, { backgroundColor: "#9B59F522" }]}>
              <Text style={[styles.catText, { color: "#9B59F5" }]}>{tx.source}</Text>
            </View>
          )}
          <View style={[styles.catPill, { backgroundColor: review.background }]}>
            <Text style={[styles.catText, { color: review.color }]}>{review.label}</Text>
          </View>
        </View>
      </View>
      <Text style={[styles.amount, { color: isCredit ? colors.success : colors.text }]}>
        {isCredit ? "+" : "−"}{formatCurrency(tx.amount, tx.currency)}
      </Text>
    </View>
  );
}

const createTxCardStyles = (colors: ReturnType<typeof useAppTheme>["colors"]) => StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.card,
    borderRadius: 18,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.border,
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
  title: { fontSize: 15, fontWeight: "700", color: colors.text, marginBottom: 2 },
  note: { fontSize: 12, color: colors.textSecondary, marginBottom: 2 },
  helper: { fontSize: 11, color: colors.textMuted, marginBottom: 2 },
  date: { fontSize: 11, color: colors.textMuted },
  catPill: {
    backgroundColor: colors.accentSoft,
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  catText: { fontSize: 10, color: colors.textSecondary, fontWeight: "600" },
  amount: { fontSize: 16, fontWeight: "700", marginLeft: 8 },
});

const r = StyleSheet.create({
  choiceRow: {
    flexDirection: "row",
    gap: 10,
  },
  choiceCard: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: CARD_BG,
    padding: 14,
    gap: 6,
  },
  choicePill: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: CARD_BG,
    paddingVertical: 12,
    alignItems: "center",
  },
  choicePillActive: {
    borderColor: ACCENT,
    backgroundColor: ACCENT + "14",
  },
  choiceTitle: {
    color: TEXT_DIM,
    fontSize: 14,
    fontWeight: "800",
  },
  choiceBody: {
    color: TEXT_DIM,
    fontSize: 12,
    lineHeight: 18,
  },
  choiceTitleActive: {
    color: ACCENT,
  },
  sectionLabel: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "700",
  },
  dropdown: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: CARD_BG,
    overflow: "hidden",
  },
  dropdownHeader: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
    backgroundColor: "#0D1526",
  },
  dropdownHeaderText: {
    color: "#D8E1F0",
    fontSize: 13,
    fontWeight: "600",
  },
  dropdownOption: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: BORDER,
  },
  dropdownOptionActive: {
    backgroundColor: ACCENT + "14",
  },
  dropdownTitle: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "700",
  },
  dropdownTitleActive: {
    color: ACCENT,
  },
  dropdownMeta: {
    marginTop: 2,
    color: TEXT_DIM,
    fontSize: 11,
  },
  dropdownMetaActive: {
    color: "#D8E1F0",
  },
  emptyDropdownText: {
    color: TEXT_DIM,
    fontSize: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  personChip: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: CARD_BG,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 2,
  },
  personChipActive: {
    borderColor: GREEN,
    backgroundColor: GREEN + "14",
  },
  personName: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "700",
  },
  personNameActive: {
    color: GREEN,
  },
  personMeta: {
    color: TEXT_DIM,
    fontSize: 11,
  },
  personMetaActive: {
    color: "#D7FCE6",
  },
});

const createExploreStyles = (colors: ReturnType<typeof useAppTheme>["colors"]) => StyleSheet.create({
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
  heading: { fontSize: 26, fontWeight: "800", color: colors.text },
  smsBtn: {
    backgroundColor: colors.success + "22",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: colors.success + "33",
  },
  smsBtnText: { color: colors.success, fontWeight: "700", fontSize: 13 },
  search: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 11,
    color: colors.text,
    marginBottom: 12,
  },
  pills: { gap: 8, paddingBottom: 4 },
  pill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pillActive: { backgroundColor: colors.accent + "22", borderColor: colors.accent },
  pillText: { fontSize: 13, color: colors.textMuted, fontWeight: "600" },
  pillTextActive: { color: colors.accent },
  empty: { alignItems: "center", paddingVertical: 64 },
  hint: {
    textAlign: "center",
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 12,
    paddingBottom: 4,
  },
});
