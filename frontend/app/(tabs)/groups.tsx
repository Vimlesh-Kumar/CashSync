import { LinearGradient } from "expo-linear-gradient";
import * as Contacts from "expo-contacts";
import { useFocusEffect } from "@react-navigation/native";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  BackHandler,
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
  deleteGroup,
  getGroupLedger,
  getGroups,
  GroupLedger,
  GroupSearchUser,
  GroupSummary,
  removeGroupMember,
  searchGroupUsers,
  settleGroupDebt,
  updateGroup,
  updateGroupMember,
} from "@/src/features/group";
import { FriendBalanceSummary, getFriendBalances } from "@/src/features/transaction";
import { formatCurrency, formatCurrencyLabel } from "@/src/lib/currency";

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

type EditGroupModalProps = Readonly<{
  visible: boolean;
  onClose: () => void;
  group: GroupSummary;
  onDone: () => void;
}>;

type MemberSuggestion = {
  key: string;
  name: string;
  email?: string;
  phone?: string;
  type: "db" | "contact";
  user?: GroupSearchUser;
};

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

function EditGroupModal({
  visible,
  onClose,
  group,
  onDone,
}: EditGroupModalProps) {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [name, setName] = useState(group.name);
  const [description, setDescription] = useState(group.description || "");
  const [emoji, setEmoji] = useState(group.emoji || "");

  const handleEmojiChange = (text: string) => {
    const segments = [...new Intl.Segmenter().segment(text)];
    setEmoji(segments.length > 0 ? segments[0]!.segment : "");
  };
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!name.trim()) return;
    setLoading(true);
    try {
      await updateGroup(group.id, {
        name: name.trim(),
        description: description.trim() || undefined,
        emoji: emoji.trim() || undefined,
      });
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
          <Text style={styles.title}>Edit Group</Text>
          <TextInput
            style={styles.input}
            placeholder="Name"
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
            placeholder="Emoji"
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
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>Save</Text>}
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
  const [openEdit, setOpenEdit] = useState(false);
  const [memberEmail, setMemberEmail] = useState("");
  const [searchResults, setSearchResults] = useState<GroupSearchUser[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<GroupSearchUser[]>([]);
  const [addingSelectedUsers, setAddingSelectedUsers] = useState(false);
  const [searchingUsers, setSearchingUsers] = useState(false);
  const [contacts, setContacts] = useState<Contacts.Contact[]>([]);
  const [contactsLoading, setContactsLoading] = useState(false);
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [inviteUser, setInviteUser] = useState<{ identifier: string; type: "email" | "phone" } | null>(null);

  const handleDeleteGroup = () => {
    if (!selectedGroupId) return;
    Alert.alert(
      "Delete Group",
      "Are you sure you want to delete this group? This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Delete", 
          style: "destructive", 
          onPress: async () => {
            try {
              await deleteGroup(selectedGroupId);
              setSelectedGroupId(null);
              await loadGroups();
            } catch (e) {
              console.error(e);
            }
          } 
        },
      ]
    );
  };

  const handleUpdateMemberRole = async (userId: string, role: 'ADMIN' | 'MEMBER') => {
    if (!selectedGroupId) return;
    try {
      await updateGroupMember(selectedGroupId, userId, { role });
      await Promise.all([loadGroups(), loadLedger()]);
    } catch (e) {
      console.error(e);
    }
  };

  const handleRemoveMember = (userId: string) => {
    if (!selectedGroupId) return;
    Alert.alert(
      "Remove Member",
      "Are you sure you want to remove this member?",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Remove", 
          style: "destructive", 
          onPress: async () => {
            try {
              await removeGroupMember(selectedGroupId, userId);
              await Promise.all([loadGroups(), loadLedger()]);
            } catch (e) {
              console.error(e);
            }
          } 
        },
      ]
    );
  };



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
      await addGroupMember(selectedGroupId, type === "email"
        ? { emails: [identifier.trim()] }
        : { phones: [identifier.trim()] });
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

  const toggleSelectedUser = useCallback((candidate: GroupSearchUser) => {
    setInviteUser(null);
    setSelectedUsers((current) => {
      const exists = current.some((item) => item.id === candidate.id);
      if (exists) {
        return current.filter((item) => item.id !== candidate.id);
      }
      return [...current, candidate];
    });
  }, []);

  const removeSelectedUser = useCallback((userId: string) => {
    setSelectedUsers((current) => current.filter((item) => item.id !== userId));
  }, []);

  const addMember = async () => {
    if (selectedUsers.length > 0) {
      if (!selectedGroupId) return;
      setAddingSelectedUsers(true);
      setInviteUser(null);
      try {
        await addGroupMember(selectedGroupId, { userIds: selectedUsers.map((candidate) => candidate.id) });
        setSelectedUsers([]);
        setMemberEmail("");
        setSearchResults([]);
        dismissMemberSearch();
        await Promise.all([loadGroups(), loadLedger(), loadFriends()]);
      } finally {
        setAddingSelectedUsers(false);
      }
      return;
    }

    const q = memberEmail.trim();
    if (searchResults.length > 0) {
      return;
    }

    if (q.includes("@")) return addMemberByIdentifier(q, "email");
    if (/^\+?[\d\s-]{8,}$/.test(q)) return addMemberByIdentifier(q, "phone");
    return addMemberByIdentifier(q, "email");
  };

  const suggestions = useMemo<MemberSuggestion[]>(() => {
    const q = memberEmail.trim().toLowerCase();
    const existingMemberIds = new Set(ledger?.members.map((m) => m.user.id) || []);
    const existingMemberEmails = new Set(ledger?.members.map((m) => m.user.email.toLowerCase()) || []);

    const dbUsers = searchResults
      .filter((userItem) => !existingMemberIds.has(userItem.id))
      .map((userItem) => ({
        key: `db:${userItem.id}`,
        name: userItem.name || [userItem.firstName, userItem.lastName].filter(Boolean).join(" ") || userItem.email.split("@")[0],
        email: userItem.email,
        phone: userItem.phone || undefined,
        type: "db" as const,
        user: userItem,
      }));

    let locale = contacts
      .flatMap(c => {
        const items: { key: string; email?: string; phone?: string; name: string; type: "contact" }[] = [];
        (c.emails || []).forEach(e => items.push({ key: `contact-email:${e.email || ""}`, email: e.email || "", name: c.name, type: "contact" as const }));
        (c.phoneNumbers || []).forEach(p => items.push({ key: `contact-phone:${p.number || ""}`, phone: p.number || "", name: c.name, type: "contact" as const }));
        return items;
      });

    if (!q && !isInputFocused) {
      return [];
    }

    if (dbUsers.length > 0) {
      return dbUsers.slice(0, q ? 5 : 8);
    }

    locale = locale.filter(c => {
      if (!q) return true;
      return (c.email?.toLowerCase().includes(q)) || (c.phone?.toLowerCase().includes(q)) || (c.name.toLowerCase().includes(q));
    });

    return [...dbUsers, ...locale]
      .filter((item) => !item.email || !existingMemberEmails.has(item.email.toLowerCase()))
      .filter((u, i, self) => self.findIndex(t => (t.email && t.email === u.email) || (t.phone && t.phone === u.phone) || t.key === u.key) === i)
      .slice(0, q ? 5 : 8);
  }, [contacts, isInputFocused, ledger?.members, memberEmail, searchResults, selectedUsers]);

  const dismissMemberSearch = useCallback(() => {
    setIsInputFocused(false);
    setSearchResults([]);
  }, []);

  useEffect(() => {
    const q = memberEmail.trim();
    if (!selectedGroupId || q.length < 2) {
      setSearchResults([]);
      setSearchingUsers(false);
      return;
    }

    const timeoutId = setTimeout(() => {
      setSearchingUsers(true);
      searchGroupUsers(q, { excludeGroupId: selectedGroupId, limit: 8 })
        .then(setSearchResults)
        .catch((error) => {
          console.error(error);
          setSearchResults([]);
        })
        .finally(() => setSearchingUsers(false));
    }, 250);

    return () => clearTimeout(timeoutId);
  }, [memberEmail, selectedGroupId]);

  useEffect(() => {
    if (!isInputFocused) return;

    const subscription = BackHandler.addEventListener("hardwareBackPress", () => {
      dismissMemberSearch();
      return true;
    });

    return () => subscription.remove();
  }, [dismissMemberSearch, isInputFocused]);

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

  const renderSuggestions = () => {
    if (suggestions.length === 0) return null;

    return (
      <View style={[styles.suggestionsList, { backgroundColor: colors.card, borderColor: colors.border }]}>
        {suggestions.map((s) => {
          const isSelected = s.type === "db" && s.user && selectedUsers.some((item) => item.id === s.user?.id);
          return (
            <Pressable
              key={s.key}
              style={[styles.suggestionItem, isSelected && styles.suggestionItemSelected]}
              onPress={() => s.user ? toggleSelectedUser(s.user) : s.email ? addMemberByIdentifier(s.email, "email") : addMemberByIdentifier(s.phone!, "phone")}
            >
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                <View style={[styles.avatar, { backgroundColor: s.type === "db" ? colors.accentSoft : colors.purpleSoft }]}>
                  <Text style={{ color: s.type === "db" ? colors.accent : colors.purple, fontSize: 10, fontWeight: "700" }}>
                    {s.type === "db" ? "DB" : "CO"}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.suggestionName}>{s.name || (s.email || s.phone || "").split("@")[0]}</Text>
                  <Text style={styles.suggestionEmail}>{s.email || s.phone}</Text>
                  {s.type === "db" && s.user && (
                    <Text style={styles.suggestionMeta}>
                      {isSelected ? "Selected" : ([s.user.firstName, s.user.lastName].filter(Boolean).join(" ") || "Cashsync user")}
                    </Text>
                  )}
                </View>
                {isSelected && <Text style={styles.selectedMark}>Selected</Text>}
              </View>
            </Pressable>
          );

        })}
      </View>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <LinearGradient colors={colors.gradient} style={StyleSheet.absoluteFill} />

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Groups</Text>
            <Text style={styles.subtitle}>Create groups, add people, and manage shared circles</Text>
          </View>
          <Pressable style={styles.addBtn} onPress={() => setOpenCreate(true)}>
            <Text style={styles.addBtnText}>+ Group</Text>
          </Pressable>
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

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Settle Up</Text>
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
                    <Text style={styles.mutedText}>{formatCurrencyLabel(route.currency)} {formatCurrency(route.amount, route.currency)}</Text>
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

        {loading ? (
          <ActivityIndicator color={colors.accent} />
        ) : groups.length === 0 ? (
          <View style={styles.card}><Text style={styles.mutedText}>No groups yet. Create your first one.</Text></View>
        ) : (
          <View style={styles.card}>
            <View style={styles.sectionHeader}>
              <View>
                <Text style={styles.cardTitle}>Groups</Text>
                <Text style={styles.mutedText}>Pick a group only when you need group-specific balances or member management.</Text>
              </View>
            </View>
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
          </View>
        )}

        {selectedGroup && (
          <>
            <View style={[styles.card, styles.memberSearchCard]}>
              <View style={styles.sectionHeader}>
                <View>
                  <Text style={styles.cardTitle}>Add People to {selectedGroup.name}</Text>
                  <Text style={styles.mutedText}>Search Cashsync users by name, email, or mobile. Contacts still help for invites.</Text>
                </View>
                {contacts.length === 0 && (
                  <Pressable onPress={loadContacts} disabled={contactsLoading}>
                    <Text style={{ color: colors.accent, fontSize: 13, fontWeight: "600" }}>
                      {contactsLoading ? "Loading..." : "Sync Contacts"}
                    </Text>
                  </Pressable>
                )}
              </View>
              <View style={styles.memberSearchWrap}>
                <TextInput
                  style={styles.input}
                  value={memberEmail}
                  onChangeText={setMemberEmail}
                  onFocus={() => setIsInputFocused(true)}
                  placeholder="Name, email, or phone"
                  placeholderTextColor={colors.textMuted}
                  autoCapitalize="none"
                />
                {selectedUsers.length > 0 && (
                  <View style={styles.selectedUsersWrap}>
                    <Text style={styles.selectedUsersLabel}>Selected people</Text>
                    <View style={styles.selectedUsersInline}>
                      {selectedUsers.map((selectedUser) => (
                        <Pressable key={selectedUser.id} onPress={() => removeSelectedUser(selectedUser.id)} hitSlop={8} style={styles.selectedUserPill}>
                          <View style={styles.selectedUserAvatar}>
                            <Text style={styles.selectedUserAvatarText}>
                              {(selectedUser.name || selectedUser.email).slice(0, 1).toUpperCase()}
                            </Text>
                          </View>
                          <Text style={styles.selectedUserName}>
                            {selectedUser.name || [selectedUser.firstName, selectedUser.lastName].filter(Boolean).join(" ") || selectedUser.email}
                          </Text>
                          <Text style={styles.selectedUserRemove}>x</Text>
                        </Pressable>
                      ))}
                    </View>
                  </View>
                )}
                {searchingUsers && memberEmail.trim().length >= 2 && (
                  <Text style={styles.searchStatus}>Searching Cashsync users...</Text>
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
              <Pressable style={styles.primaryBtn} onPress={addMember} disabled={addingSelectedUsers}>
                {addingSelectedUsers ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.primaryBtnText}>
                    {selectedUsers.length > 0
                      ? `Save ${selectedUsers.length} Selected`
                      : searchResults.length > 0
                        ? "Select From List"
                        : "Add Person"}
                  </Text>
                )}
              </Pressable>
            </View>

            <View style={styles.card}>
              <View style={styles.sectionHeader}>
                <Text style={styles.cardTitle}>{selectedGroup.name} Balances</Text>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <Pressable 
                    style={[styles.secondaryBtn, { paddingHorizontal: 10, paddingVertical: 6 }]} 
                    onPress={() => setOpenEdit(true)}
                  >
                    <Text style={[styles.secondaryBtnText, { fontSize: 12 }]}>Edit</Text>
                  </Pressable>
                  <Pressable 
                    style={[styles.secondaryBtn, { paddingHorizontal: 10, paddingVertical: 6, borderColor: colors.danger }]} 
                    onPress={handleDeleteGroup}
                  >
                    <Text style={[styles.secondaryBtnText, { fontSize: 12, color: colors.danger }]}>Delete</Text>
                  </Pressable>
                </View>
              </View>
              {ledger?.members.map((m) => {
                const b = ledger.balances.find((balance) => balance.userId === m.userId);
                const isMe = user?.id === m.userId;
                return (
                  <View key={m.userId} style={styles.balanceRow}>
                    <View style={{ flex: 1, gap: 2 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text style={styles.memberName}>{personName(m.user)}</Text>
                        <View style={[styles.roleBadge, { backgroundColor: m.role === 'ADMIN' ? colors.accentSoft : colors.border }]}>
                          <Text style={[styles.roleText, { color: m.role === 'ADMIN' ? colors.accent : colors.textMuted }]}>
                            {m.role}
                          </Text>
                        </View>
                      </View>
                      <Text style={[styles.mutedText, { color: (b?.net ?? 0) >= 0 ? colors.success : colors.danger }]}>
                        {(b?.net ?? 0) >= 0 ? "+" : ""}{formatCurrency(b?.net ?? 0, b?.currency ?? ledger.currency)}
                      </Text>
                    </View>
                    
                    {!isMe && (
                      <View style={{ flexDirection: 'row', gap: 8 }}>
                        <Pressable 
                          style={styles.actionIcon} 
                          onPress={() => handleUpdateMemberRole(m.userId, m.role === 'ADMIN' ? 'MEMBER' : 'ADMIN')}
                        >
                          <Text style={{ fontSize: 10, fontWeight: '700', color: colors.accent }}>ROLE</Text>
                        </Pressable>
                        <Pressable 
                          style={styles.actionIcon} 
                          onPress={() => handleRemoveMember(m.userId)}
                        >
                          <Text style={{ fontSize: 10, fontWeight: '700', color: colors.danger }}>REMOVE</Text>
                        </Pressable>
                      </View>
                    )}
                  </View>
                );
              })}
            </View>

          </>
        )}
      </ScrollView>

      {user && (
        <CreateGroupModal
          visible={openCreate}
          onClose={() => setOpenCreate(false)}
          ownerId={user.id}
          onDone={loadGroups}
        />
      )}

      {selectedGroup && (
        <EditGroupModal
          visible={openEdit}
          onClose={() => setOpenEdit(false)}
          group={selectedGroup}
          onDone={loadGroups}
        />
      )}


      <Modal
        visible={isInputFocused && suggestions.length > 0}
        transparent
        animationType="fade"
        onRequestClose={dismissMemberSearch}
      >
        <Pressable style={styles.searchModalOverlay} onPress={dismissMemberSearch}>
          <Pressable style={[styles.searchModalCard, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={() => {}}>
            {renderSuggestions()}
          </Pressable>
        </Pressable>
      </Modal>
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
    memberSearchCard: {
      position: "relative",
      zIndex: 30,
      elevation: 12,
    },
    memberSearchWrap: {
      position: "relative",
      zIndex: 40,
    },
    sectionHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      gap: 12,
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
      borderWidth: 1,
      borderRadius: 12,
      overflow: "hidden",
    },
    suggestionItem: {
      padding: 12,
      borderBottomWidth: 1,
      borderBottomColor: `${colors.border}33`,
    },
    suggestionItemSelected: {
      backgroundColor: colors.accentSoft,
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
    suggestionMeta: {
      color: colors.textMuted,
      fontSize: 10,
      marginTop: 2,
    },
    selectedMark: {
      color: colors.accent,
      fontSize: 11,
      fontWeight: "700",
    },
    searchModalOverlay: {
      flex: 1,
      backgroundColor: "rgba(9, 13, 20, 0.2)",
      justifyContent: "center",
      paddingHorizontal: 18,
    },
    searchModalCard: {
      borderWidth: 1,
      borderRadius: 16,
      maxWidth: 720,
      width: "100%",
      alignSelf: "center",
      maxHeight: "60%",
      overflow: "hidden",
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.14,
      shadowRadius: 18,
      elevation: 10,
    },
    searchStatus: {
      color: colors.textMuted,
      fontSize: 11,
      marginTop: 6,
      marginLeft: 2,
    },
    selectedUsersWrap: {
      gap: 8,
      marginTop: 10,
    },
    selectedUsersLabel: {
      color: colors.textMuted,
      fontSize: 11,
      fontWeight: "700",
      textTransform: "uppercase",
      letterSpacing: 0.6,
      marginBottom: 2,
    },
    selectedUsersInline: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 6,
    },
    selectedUserAvatar: {
      width: 24,
      height: 24,
      borderRadius: 12,
      backgroundColor: colors.accentSoft,
      alignItems: "center",
      justifyContent: "center",
    },
    selectedUserAvatarText: {
      color: colors.accent,
      fontSize: 11,
      fontWeight: "800",
    },
    selectedUserPill: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      backgroundColor: colors.input,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 999,
      paddingHorizontal: 10,
      paddingVertical: 6,
    },
    selectedUserName: {
      color: colors.text,
      fontSize: 12,
      fontWeight: "700",
    },
    selectedUserRemove: {
      color: colors.accent,
      fontSize: 12,
      fontWeight: "700",
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
    roleBadge: {
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 4,
    },
    roleText: {
      fontSize: 9,
      fontWeight: "800",
      textTransform: "uppercase",
    },
    actionIcon: {
      padding: 6,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.input,
      minWidth: 40,
      alignItems: "center",
      justifyContent: "center",
    },
  });
