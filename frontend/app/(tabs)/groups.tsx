import { LinearGradient } from "expo-linear-gradient";
import * as Contacts from "expo-contacts";
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

  const handleEmojiChange = (text: string) => {
    // Limit to 1 visible grapheme cluster (handles multi-codepoint emojis ✈️, 🛍️, etc.)
    const segments = [...new Intl.Segmenter().segment(text)];
    setEmoji(segments.length > 0 ? segments[0]!.segment : "");
  };
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
            placeholder="Emoji (optional, e.g. 🏝️)"
            placeholderTextColor={colors.textMuted}
            value={emoji}
            onChangeText={handleEmojiChange}
            maxLength={8}
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
  const [contacts, setContacts] = useState<Contacts.Contact[]>([]);
  const [contactsLoading, setContactsLoading] = useState(false);
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [inviteUser, setInviteUser] = useState<{ identifier: string; type: "email" | "phone" } | null>(null);

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

  const loadContacts = useCallback(async () => {
    const { status } = await Contacts.requestPermissionsAsync();
    if (status !== "granted") return;
    setContactsLoading(true);
    try {
      const { data } = await Contacts.getContactsAsync({
        fields: [Contacts.Fields.Emails, Contacts.Fields.PhoneNumbers, Contacts.Fields.FirstName, Contacts.Fields.LastName],
      });
      setContacts(data.filter(c => (c.emails && c.emails.length > 0) || (c.phoneNumbers && c.phoneNumbers.length > 0)));
    } finally {
      setContactsLoading(false);
    }
  }, []);

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

  const addMemberByIdentifier = async (identifier: string, type: "email" | "phone") => {
    if (!selectedGroupId || !identifier.trim()) return;
    setInviteUser(null);
    try {
      await addGroupMember(selectedGroupId, { [type]: identifier.trim() });
      setMemberEmail("");
      await Promise.all([loadGroups(), loadLedger(), loadFriends()]);
    } catch (e: any) {
      if (e.message.includes("not found")) {
        setInviteUser({ identifier: identifier.trim(), type });
      } else {
        console.error(e);
      }
    }
  };

  const addMember = async () => {
    const q = memberEmail.trim();
    if (q.includes("@")) return addMemberByIdentifier(q, "email");
    if (/^\+?[\d\s-]{8,}$/.test(q)) return addMemberByIdentifier(q, "phone");
    return addMemberByIdentifier(q, "email");
  };

  const suggestions = useMemo(() => {
    const q = memberEmail.trim().toLowerCase();
    
    // 1. Existing friends
    let friends = friendBalances.map(f => ({ email: f.user.email, phone: undefined, name: f.user.name, type: "friend" as const }));

    // 2. Local contacts
    let locale = contacts
      .flatMap(c => {
        const items: { email?: string; phone?: string; name: string; type: "contact" }[] = [];
        (c.emails || []).forEach(e => items.push({ email: e.email || "", name: c.name, type: "contact" as const }));
        (c.phoneNumbers || []).forEach(p => items.push({ phone: p.number || "", name: c.name, type: "contact" as const }));
        return items;
      });

    if (q) {
      friends = friends.filter(f => f.email.toLowerCase().includes(q) || (f.name && f.name.toLowerCase().includes(q)));
      locale = locale.filter(c => (c.email?.toLowerCase().includes(q)) || (c.phone?.toLowerCase().includes(q)) || (c.name.toLowerCase().includes(q)));
    } else if (!isInputFocused) {
      return [];
    }

    // Filter out duplicates and already added members
    const existingMemberEmails = new Set(ledger?.members.map(m => m.user.email) || []);
    
    return [...friends, ...locale]
      .filter(u => !existingMemberEmails.has(u.email || ""))
      .filter((u, i, self) => self.findIndex(t => (t.email && t.email === u.email) || (t.phone && t.phone === u.phone)) === i) // Unique
      .slice(0, q ? 5 : 8);
  }, [memberEmail, friendBalances, contacts, isInputFocused, ledger?.members]);

  const sendInvite = (identifier: string, style: "email" | "phone") => {
    const msg = `Hey! Join me on Cashsync to split expenses easily. Download it now!`;
    if (style === "phone") {
      void import("react-native").then(({ Linking }) => {
        void Linking.openURL(`sms:${identifier}?body=${encodeURIComponent(msg)}`);
      });
    } else {
      void import("react-native").then(({ Linking }) => {
        void Linking.openURL(`mailto:${identifier}?subject=Join Cashsync&body=${encodeURIComponent(msg)}`);
      });
    }
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
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <Text style={styles.cardTitle}>Add Member</Text>
              {contacts.length === 0 && (
                <Pressable onPress={loadContacts} disabled={contactsLoading}>
                  <Text style={{ color: colors.accent, fontSize: 13, fontWeight: "600" }}>
                    {contactsLoading ? "Loading..." : "Sync Contacts"}
                  </Text>
                </Pressable>
              )}
            </View>
            <View style={{ position: "relative", zIndex: 10 }}>
              <TextInput
                style={styles.input}
                value={memberEmail}
                onChangeText={setMemberEmail}
                onFocus={() => setIsInputFocused(true)}
                onBlur={() => setTimeout(() => setIsInputFocused(false), 200)}
                placeholder="Name or email"
                placeholderTextColor={colors.textMuted}
                autoCapitalize="none"
              />
              {suggestions.length > 0 && (
                <View style={[styles.suggestionsList, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  {suggestions.map((s) => (
                    <Pressable
                      key={s.email || s.phone}
                      style={styles.suggestionItem}
                      onPress={() => s.email ? addMemberByIdentifier(s.email, "email") : addMemberByIdentifier(s.phone!, "phone")}
                    >
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                        <View style={[styles.avatar, { backgroundColor: s.type === "friend" ? colors.accentSoft : colors.purpleSoft }]}>
                          <Text style={{ color: s.type === "friend" ? colors.accent : colors.purple, fontSize: 10, fontWeight: "700" }}>
                            {s.type === "friend" ? "FR" : "CO"}
                          </Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.suggestionName}>{s.name || (s.email || s.phone || "").split("@")[0]}</Text>
                          <Text style={styles.suggestionEmail}>{s.email || s.phone}</Text>
                        </View>
                      </View>
                    </Pressable>
                  ))}
                </View>
              )}
            </View>

            {inviteUser && (
              <View style={[styles.inviteCard, { backgroundColor: colors.accentSoft }]}>
                <Text style={{ color: colors.text, fontSize: 13, fontWeight: "600" }}>
                  {inviteUser.identifier} is not on Cashsync yet.
                </Text>
                <Pressable onPress={() => sendInvite(inviteUser.identifier, inviteUser.type)}>
                  <Text style={{ color: colors.accent, fontWeight: "800", fontSize: 13, marginTop: 4 }}>
                    Invite via {inviteUser.type === "phone" ? "SMS" : "Email"} →
                  </Text>
                </Pressable>
              </View>
            )}
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
    suggestionsList: {
      position: "absolute",
      top: "100%",
      left: 0,
      right: 0,
      borderWidth: 1,
      borderRadius: 12,
      marginTop: 4,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 5,
      zIndex: 100,
    },
    suggestionItem: {
      padding: 12,
      borderBottomWidth: 1,
      borderBottomColor: `${colors.border}33`,
    },
    suggestionName: {
      color: colors.text,
      fontSize: 14,
      fontWeight: "600",
    },
    suggestionEmail: {
      color: colors.textMuted,
      fontSize: 11,
      marginTop: 2,
    },
    avatar: {
      width: 28,
      height: 28,
      borderRadius: 14,
      alignItems: "center",
      justifyContent: "center",
    },
    inviteCard: {
      padding: 12,
      borderRadius: 12,
      marginTop: 8,
      borderWidth: 1,
      borderColor: "rgba(79, 142, 247, 0.2)",
    },
  });
