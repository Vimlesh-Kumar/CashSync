import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect } from "@react-navigation/native";
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
import {
  addGroupMember,
  createGroup,
  getGroupLedger,
  getGroups,
  GroupLedger,
  GroupSummary,
  settleGroupDebt,
} from "@/src/features/group";
import { FriendBalanceSummary, getFriendBalances } from "@/src/features/transaction";
import { formatCurrency } from "@/src/lib/currency";

function personName(user?: { id: string; name?: string; email: string }) {
  if (!user) return "User";
  return user.name || user.email.split("@")[0] || "User";
}

type CreateGroupModalProps = Readonly<{
  visible: boolean;
  onClose: () => void;
  ownerId: string;
  onDone: () => void;
}>;

function CreateGroupModal({
  visible,
  onClose,
  ownerId,
  onDone,
}: CreateGroupModalProps) {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [emoji, setEmoji] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!name.trim()) return;
    setLoading(true);
    try {
      await createGroup({
        ownerId,
        name: name.trim(),
        description: description.trim() || undefined,
        emoji: emoji.trim() || undefined,
      });
      setName("");
      setDescription("");
      setEmoji("");
      onDone();
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalSheet}>
          <Text style={styles.title}>Create Group</Text>
          <TextInput
            style={styles.input}
            placeholder="Name (Goa Trip)"
            placeholderTextColor={colors.textMuted}
            value={name}
            onChangeText={setName}
          />
          <TextInput
            style={styles.input}
            placeholder="Description"
            placeholderTextColor={colors.textMuted}
            value={description}
            onChangeText={setDescription}
          />
          <TextInput
            style={styles.input}
            placeholder="Emoji (optional)"
            placeholderTextColor={colors.textMuted}
            value={emoji}
            onChangeText={setEmoji}
          />

          <View style={styles.rowGap}>
            <Pressable style={styles.secondaryBtn} onPress={onClose}>
              <Text style={styles.secondaryBtnText}>Cancel</Text>
            </Pressable>
            <Pressable style={[styles.primaryBtn, { flex: 1.6 }]} onPress={submit} disabled={loading}>
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>Create</Text>}
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

export default function GroupsScreen() {
  const { user } = useAuth();
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [groups, setGroups] = useState<GroupSummary[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [ledger, setLedger] = useState<GroupLedger | null>(null);
  const [friendBalances, setFriendBalances] = useState<FriendBalanceSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingLedger, setLoadingLedger] = useState(false);
  const [loadingFriends, setLoadingFriends] = useState(false);
  const [openCreate, setOpenCreate] = useState(false);
  const [memberEmail, setMemberEmail] = useState("");

  const selectedGroup = useMemo(
    () => groups.find((g) => g.id === selectedGroupId) || null,
    [groups, selectedGroupId],
  );

  const loadGroups = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const result = await getGroups(user.id);
      setGroups(result);
      if (!selectedGroupId && result.length > 0) setSelectedGroupId(result[0]!.id);
    } finally {
      setLoading(false);
    }
  }, [selectedGroupId, user]);

  const loadLedger = useCallback(async () => {
    if (!selectedGroupId) {
      setLedger(null);
      return;
    }
    setLoadingLedger(true);
    try {
      setLedger(await getGroupLedger(selectedGroupId, user?.id));
    } finally {
      setLoadingLedger(false);
    }
  }, [selectedGroupId, user?.id]);

  const loadFriends = useCallback(async () => {
    if (!user) return;
    setLoadingFriends(true);
    try {
      setFriendBalances(await getFriendBalances(user.id));
    } finally {
      setLoadingFriends(false);
    }
  }, [user]);

  useEffect(() => {
    void loadGroups();
  }, [loadGroups]);

  useEffect(() => {
    void loadLedger();
  }, [loadLedger]);

  useFocusEffect(
    useCallback(() => {
      void Promise.all([loadGroups(), loadLedger(), loadFriends()]);
    }, [loadGroups, loadLedger, loadFriends]),
  );

  const addMember = async () => {
    if (!selectedGroupId || !memberEmail.trim()) return;
    await addGroupMember(selectedGroupId, { email: memberEmail.trim() });
    setMemberEmail("");
    await Promise.all([loadGroups(), loadLedger(), loadFriends()]);
  };

  const settle = async (fromUserId: string, toUserId: string, amount: number, currency: string) => {
    if (!selectedGroupId) return;
    await settleGroupDebt(selectedGroupId, { fromUserId, toUserId, amount, currency });
    await Promise.all([loadGroups(), loadLedger(), loadFriends()]);
  };

  const membersById = useMemo(() => {
    const map = new Map<string, { id: string; name?: string; email: string }>();
    ledger?.members.forEach((m) => map.set(m.user.id, m.user));
    return map;
  }, [ledger]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <LinearGradient colors={colors.gradient} style={StyleSheet.absoluteFill} />

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Groups & Split</Text>
            <Text style={styles.subtitle}>Optimized settle-up for every trip or household</Text>
          </View>
          <Pressable style={styles.addBtn} onPress={() => setOpenCreate(true)}>
            <Text style={styles.addBtnText}>+ Group</Text>
          </Pressable>
        </View>

        {loading ? (
          <ActivityIndicator color={colors.accent} />
        ) : groups.length === 0 ? (
          <View style={styles.card}><Text style={styles.mutedText}>No groups yet. Create your first one.</Text></View>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
            {groups.map((group) => (
              <Pressable
                key={group.id}
                onPress={() => setSelectedGroupId(group.id)}
                style={[styles.groupCard, selectedGroupId === group.id && styles.groupCardActive]}
              >
                <Text style={styles.groupName}>{group.emoji ? `${group.emoji} ` : ""}{group.name}</Text>
                <Text style={styles.groupMeta}>{group.members.length} members</Text>
                <Text style={[styles.balanceLine, { color: colors.danger }]}>
                  You owe: {formatCurrency(group.stats.youOwe, group.stats.currency)}
                </Text>
                <Text style={[styles.balanceLine, { color: colors.success }]}>
                  You are owed: {formatCurrency(group.stats.youAreOwed, group.stats.currency)}
                </Text>
                <Text style={[styles.balanceLine, { color: group.stats.net >= 0 ? colors.success : colors.danger }]}>
                  Net: {formatCurrency(group.stats.net, group.stats.currency)}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        )}

        {selectedGroup && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Add Member by Email</Text>
            <TextInput
              style={styles.input}
              value={memberEmail}
              onChangeText={setMemberEmail}
              placeholder="member@email.com"
              placeholderTextColor={colors.textMuted}
              autoCapitalize="none"
            />
            <Pressable style={styles.primaryBtn} onPress={addMember}>
              <Text style={styles.primaryBtnText}>Add Member</Text>
            </Pressable>
          </View>
        )}

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Suggested Settlements</Text>
          {loadingLedger ? (
            <ActivityIndicator color={colors.accent} />
          ) : !ledger || ledger.suggestedSettlements.length === 0 ? (
            <Text style={styles.mutedText}>No pending balances. Everyone is settled up.</Text>
          ) : (
            ledger.suggestedSettlements.map((route, i) => {
              const from = personName(membersById.get(route.fromUserId));
              const to = personName(membersById.get(route.toUserId));
              return (
                <View key={`${route.fromUserId}-${route.toUserId}-${i}`} style={styles.balanceRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.memberName}>{from} pays {to}</Text>
                    <Text style={styles.mutedText}>{formatCurrency(route.amount, route.currency)}</Text>
                  </View>
                  {user?.id === route.fromUserId && (
                    <Pressable style={[styles.primaryBtn, { paddingHorizontal: 14, paddingVertical: 10 }]} onPress={() => settle(route.fromUserId, route.toUserId, route.amount, route.currency)}>
                      <Text style={styles.primaryBtnText}>Settle</Text>
                    </Pressable>
                  )}
                </View>
              );
            })
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Member Balances</Text>
          {ledger?.balances.map((b) => {
            const person = membersById.get(b.userId);
            return (
              <View key={b.userId} style={styles.balanceRow}>
                <Text style={styles.memberName}>{personName(person)}</Text>
                <Text style={{ color: b.net >= 0 ? colors.success : colors.danger, fontWeight: "700" }}>
                  {b.net >= 0 ? "+" : ""}{formatCurrency(b.net, b.currency)}
                </Text>
              </View>
            );
          })}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Friends & Balances</Text>
          {loadingFriends ? (
            <ActivityIndicator color={colors.accent} />
          ) : friendBalances.length === 0 ? (
            <Text style={styles.mutedText}>No friend balances yet. Split a bill and this list will show who owes whom.</Text>
          ) : (
            friendBalances.map((friend) => (
              <View key={friend.userId} style={styles.friendRow}>
                <View style={{ flex: 1, gap: 4 }}>
                  <Text style={styles.memberName}>{personName(friend.user)}</Text>
                  <Text style={styles.mutedText}>
                    {friend.groups.length > 0 ? friend.groups.slice(0, 2).join(" • ") : "Direct split"} • {friend.splitCount} open split{friend.splitCount === 1 ? "" : "s"}
                  </Text>
                </View>
                <Text style={{ color: friend.net >= 0 ? colors.success : colors.danger, fontWeight: "800" }}>
                  {friend.net >= 0
                    ? `Gets ${formatCurrency(friend.net, friend.currency)}`
                    : `Owes ${formatCurrency(Math.abs(friend.net), friend.currency)}`}
                </Text>
              </View>
            ))
          )}
        </View>
      </ScrollView>

      {user && (
        <CreateGroupModal
          visible={openCreate}
          onClose={() => setOpenCreate(false)}
          ownerId={user.id}
          onDone={loadGroups}
        />
      )}
    </View>
  );
}

const createStyles = (colors: ReturnType<typeof useAppTheme>["colors"]) =>
  StyleSheet.create({
    scroll: {
      paddingHorizontal: 18,
      paddingTop: Platform.OS === "web" ? 40 : 58,
      paddingBottom: 110,
      gap: 16,
      maxWidth: 760,
      width: "100%",
      alignSelf: "center",
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    title: { color: colors.text, fontSize: 27, fontWeight: "800", letterSpacing: -0.4 },
    subtitle: { color: colors.textMuted, marginTop: 4, fontSize: 12 },
    addBtn: {
      backgroundColor: colors.accentSoft,
      borderWidth: 1,
      borderColor: colors.accent,
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: 10,
    },
    addBtnText: { color: colors.accent, fontWeight: "700", fontSize: 13 },
    card: {
      borderRadius: 18,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card,
      padding: 16,
      gap: 10,
    },
    groupCard: {
      width: 220,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card,
      padding: 14,
      gap: 6,
    },
    groupCardActive: {
      borderColor: colors.accent,
      backgroundColor: colors.accentSoft,
    },
    groupName: { color: colors.text, fontSize: 16, fontWeight: "700" },
    groupMeta: { color: colors.textMuted, fontSize: 12 },
    balanceLine: { fontSize: 12, fontWeight: "600" },
    cardTitle: { color: colors.text, fontSize: 16, fontWeight: "700" },
    input: {
      backgroundColor: colors.input,
      borderColor: colors.border,
      borderWidth: 1,
      borderRadius: 12,
      color: colors.text,
      paddingHorizontal: 14,
      paddingVertical: 12,
    },
    primaryBtn: {
      alignSelf: "flex-start",
      backgroundColor: colors.accent,
      borderRadius: 10,
      paddingHorizontal: 14,
      paddingVertical: 11,
    },
    primaryBtnText: { color: "#fff", fontWeight: "700" },
    secondaryBtn: {
      flex: 1,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.input,
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 12,
    },
    secondaryBtnText: { color: colors.textMuted, fontWeight: "700" },
    modalOverlay: { flex: 1, backgroundColor: "#000a", justifyContent: "flex-end" },
    modalSheet: {
      backgroundColor: colors.card,
      borderTopLeftRadius: 28,
      borderTopRightRadius: 28,
      padding: 24,
      paddingBottom: 40,
      gap: 12,
    },
    rowGap: { flexDirection: "row", gap: 10, marginTop: 8 },
    balanceRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      borderBottomWidth: 1,
      borderBottomColor: `${colors.border}66`,
      paddingVertical: 10,
      gap: 12,
    },
    memberName: { color: colors.text, fontWeight: "600" },
    mutedText: { color: colors.textMuted, fontSize: 12 },
    friendRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      gap: 12,
      borderBottomWidth: 1,
      borderBottomColor: `${colors.border}66`,
      paddingVertical: 12,
    },
  });
