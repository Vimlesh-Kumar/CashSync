import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
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
import {
  addSplits,
  createTransaction,
  FriendBalanceSummary,
  getFriendBalances,
  getTransactions,
  Transaction,
} from "@/src/features/transaction";
import { getAllUsers } from "@/src/features/user";
import { formatCurrency, formatCurrencyLabel } from "@/src/lib/currency";

function personName(user?: { id: string; name?: string; email: string }) {
  if (!user) return "User";
  return user.name || user.email.split("@")[0] || "User";
}

/**
 * Show a confirmation dialog before performing a destructive action. Uses native alert on mobile and `confirm` on web.
 * @param title 
 * @param message 
 * @param confirmLabel 
 * @returns 
 */
async function confirmAction(title: string, message: string, confirmLabel: string) {
  if (Platform.OS === "web") {
    return globalThis.confirm(`${title}\n\n${message}`);
  }

  return new Promise<boolean>((resolve) => {
    Alert.alert(title, message, [
      { text: "Cancel", style: "cancel", onPress: () => resolve(false) },
      { text: confirmLabel, style: "destructive", onPress: () => resolve(true) },
    ]);
  });
}

/**
 * Get a user-friendly error message from an error object.
 * @param error 
 * @param fallback 
 * @returns 
 */
function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message.trim()) return error.message;
  return fallback;
}

function showError(title: string, message: string) {
  if (Platform.OS === "web") {
    globalThis.alert(`${title}\n\n${message}`);
    return;
  }

  Alert.alert(title, message);
}

function CommonExpenseModal({
  visible,
  authorId,
  groups,
  friendCandidates,
  initialGroupId,
  onClose,
  onDone,
}: CommonExpenseModalProps) {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [mode, setMode] = useState<"GROUP" | "FRIEND">("GROUP");
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(initialGroupId ?? groups[0]?.id ?? null);
  const [groupMembers, setGroupMembers] = useState<GroupLedger["members"]>([]);
  const [selectedGroupUserIds, setSelectedGroupUserIds] = useState<string[]>([]);
  const [selectedFriendIds, setSelectedFriendIds] = useState<string[]>([]);
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setMode(initialGroupId ? "GROUP" : "GROUP");
    setSelectedGroupId(initialGroupId ?? groups[0]?.id ?? null);
    setSelectedFriendIds([]);
    setTitle("");
    setAmount("");
    setNote("");
  }, [visible, initialGroupId, groups]);

  useEffect(() => {
    if (!visible || mode !== "GROUP" || !selectedGroupId) return;

    setLoadingMembers(true);
    getGroupLedger(selectedGroupId)
      .then((ledger) => {
        setGroupMembers(ledger.members);
        setSelectedGroupUserIds(ledger.members.map((member) => member.userId));
      })
      .catch((error) => {
        console.error(error);
        showError("Group Load Failed", getErrorMessage(error, "Unable to load group members."));
      })
      .finally(() => setLoadingMembers(false));
  }, [visible, mode, selectedGroupId]);

  const toggleGroupMember = useCallback((userId: string) => {
    setSelectedGroupUserIds((current) =>
      current.includes(userId) ? current.filter((id) => id !== userId) : [...current, userId],
    );
  }, []);

  const toggleFriend = useCallback((userId: string) => {
    setSelectedFriendIds((current) =>
      current.includes(userId) ? current.filter((id) => id !== userId) : [...current, userId],
    );
  }, []);

  const submit = async () => {
    const parsedAmount = Number(amount);
    if (!title.trim() || !Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      showError("Invalid Expense", "Enter a title and a valid amount.");
      return;
    }

    const splitUserIds = mode === "GROUP"
      ? selectedGroupUserIds
      : Array.from(new Set([authorId, ...selectedFriendIds]));

    if (mode === "GROUP" && !selectedGroupId) {
      showError("Missing Group", "Choose a group for this expense.");
      return;
    }

    if (splitUserIds.length === 0 || (mode === "FRIEND" && selectedFriendIds.length === 0)) {
      showError("Missing People", "Choose at least one person for this expense.");
      return;
    }

    setSaving(true);
    try {
      const tx = await createTransaction({
        title: title.trim(),
        amount: parsedAmount,
        note: note.trim() || undefined,
        authorId,
        groupId: mode === "GROUP" ? selectedGroupId ?? undefined : undefined,
        isPersonal: false,
        reviewState: "SPLIT",
      });

      await addSplits(
        tx.id,
        splitUserIds.map((userId) => ({ userId })),
        "EQUAL",
        parsedAmount,
        mode === "GROUP" ? selectedGroupId : null,
      );

      onDone();
      onClose();
    } catch (error) {
      console.error(error);
      showError("Expense Failed", getErrorMessage(error, "Unable to save this expense."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalSheet}>
          <View style={styles.modalTopRow}>
            <Text style={styles.title}>Add Expense</Text>
            <Pressable onPress={onClose} hitSlop={8}>
              <Ionicons name="close" size={22} color={colors.textMuted} />
            </Pressable>
          </View>

          <View style={styles.segmentRow}>
            <Pressable
              style={[styles.segmentButton, mode === "GROUP" && styles.segmentButtonActive]}
              onPress={() => setMode("GROUP")}
            >
              <Text style={[styles.segmentText, mode === "GROUP" && styles.segmentTextActive]}>Group</Text>
            </Pressable>
            <Pressable
              style={[styles.segmentButton, mode === "FRIEND" && styles.segmentButtonActive]}
              onPress={() => setMode("FRIEND")}
            >
              <Text style={[styles.segmentText, mode === "FRIEND" && styles.segmentTextActive]}>Friends</Text>
            </Pressable>
          </View>

          {mode === "GROUP" ? (
            <>
              <Text style={styles.sheetLabel}>Choose group</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.inlineScroll}>
                {groups.map((group) => (
                  <Pressable
                    key={group.id}
                    onPress={() => setSelectedGroupId(group.id)}
                    style={[
                      styles.compactChip,
                      selectedGroupId === group.id && styles.compactChipActive,
                    ]}
                  >
                    <Text style={[styles.compactChipText, selectedGroupId === group.id && styles.compactChipTextActive]}>
                      {group.emoji ? `${group.emoji} ` : ""}{group.name}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
            </>
          ) : (
            <>
              <Text style={styles.sheetLabel}>Choose friends</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.inlineScroll}>
                {friendCandidates.map((friend) => {
                  const active = selectedFriendIds.includes(friend.id);
                  return (
                    <Pressable
                      key={friend.id}
                      onPress={() => toggleFriend(friend.id)}
                      style={[styles.compactChip, active && styles.compactChipActive]}
                    >
                      <Text style={[styles.compactChipText, active && styles.compactChipTextActive]}>
                        {personName(friend)}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </>
          )}

          <TextInput
            style={styles.input}
            placeholder="What was this for?"
            placeholderTextColor={colors.textMuted}
            value={title}
            onChangeText={setTitle}
          />
          <TextInput
            style={styles.input}
            placeholder="Amount"
            placeholderTextColor={colors.textMuted}
            value={amount}
            onChangeText={setAmount}
            keyboardType="decimal-pad"
          />
          <TextInput
            style={styles.input}
            placeholder="Add a note"
            placeholderTextColor={colors.textMuted}
            value={note}
            onChangeText={setNote}
          />

          {mode === "GROUP" && (
            <View style={{ gap: 8 }}>
              <Text style={styles.sheetLabel}>Split equally with</Text>
              {loadingMembers ? (
                <ActivityIndicator color={colors.accent} />
              ) : (
                <View style={styles.wrapRow}>
                  {groupMembers.map((member) => {
                    const active = selectedGroupUserIds.includes(member.userId);
                    return (
                      <Pressable
                        key={member.userId}
                        onPress={() => toggleGroupMember(member.userId)}
                        style={[styles.personPill, active && styles.personPillActive]}
                      >
                        <Text style={[styles.personPillText, active && styles.personPillTextActive]}>
                          {personName(member.user)}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              )}
            </View>
          )}

          {mode === "FRIEND" && (
            <Text style={styles.mutedText}>
              Expense will be split equally between you and the selected friend{selectedFriendIds.length === 1 ? "" : "s"}.
            </Text>
          )}

          <View style={styles.rowGap}>
            <Pressable style={styles.secondaryBtn} onPress={onClose}>
              <Text style={styles.secondaryBtnText}>Cancel</Text>
            </Pressable>
            <Pressable style={[styles.primaryBtn, { flex: 1.4, alignItems: "center" }]} onPress={submit} disabled={saving}>
              {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>Save Expense</Text>}
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function MemberDetailModal({
  visible,
  groupName,
  member,
  balance,
  onClose,
  onRemove,
  onToggleRole,
}: MemberDetailModalProps) {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  if (!member) return null;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalSheet}>
          <View style={styles.modalTopRow}>
            <View>
              <Text style={styles.title}>{personName(member.user)}</Text>
              <Text style={styles.subtitle}>{member.user.email}</Text>
            </View>
            <Pressable onPress={onClose} hitSlop={8}>
              <Ionicons name="close" size={22} color={colors.textMuted} />
            </Pressable>
          </View>
          <View style={styles.memberProfileCard}>
            <Text style={styles.memberProfileAmount}>
              {balanceLabel(balance?.net ?? 0, balance?.currency ?? "INR")}
            </Text>
            <Text style={styles.mutedText}>{member.role} in {groupName}</Text>
          </View>
          <Pressable style={styles.settingAction} onPress={onToggleRole}>
            <Text style={styles.settingActionText}>View settings</Text>
            <Text style={styles.settingActionSubtext}>Toggle role between admin and member</Text>
          </Pressable>
          <Pressable style={styles.settingAction} onPress={onRemove}>
            <Text style={[styles.settingActionText, { color: colors.danger }]}>Remove from group</Text>
            <Text style={styles.settingActionSubtext}>This removes the member from the shared circle.</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

function GroupSettingsModal({
  visible,
  group,
  ledger,
  userId,
  memberEmail,
  selectedUsers,
  inviteUser,
  contacts,
  contactsLoading,
  addingSelectedUsers,
  searchingUsers,
  onClose,
  onOpenEdit,
  onDeleteGroup,
  onLeaveGroup,
  onOpenMember,
  onMemberEmailChange,
  onFocusMemberInput,
  onLoadContacts,
  onRemoveSelectedUser,
  onAddMember,
  onInvite,
}: GroupSettingsModalProps) {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalSheet, { maxHeight: "88%" }]}>
          <View style={styles.modalTopRow}>
            <Text style={styles.title}>Group Settings</Text>
            <Pressable onPress={onClose} hitSlop={8}>
              <Ionicons name="close" size={22} color={colors.textMuted} />
            </Pressable>
          </View>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 14 }}>
            <View style={styles.settingsBlock}>
              <View style={styles.sectionHeader}>
                <View>
                  <Text style={styles.cardTitle}>{group.emoji ? `${group.emoji} ` : ""}{group.name}</Text>
                  <Text style={styles.mutedText}>Manage details and members for this group.</Text>
                </View>
                <Pressable style={styles.iconTextBtn} onPress={onOpenEdit}>
                  <Text style={styles.iconTextBtnLabel}>Edit</Text>
                </Pressable>
              </View>
            </View>

            <View style={styles.settingsBlock}>
              <View style={styles.sectionHeader}>
                <Text style={styles.cardTitle}>Add people to group</Text>
                {contacts.length === 0 && (
                  <Pressable onPress={onLoadContacts} disabled={contactsLoading}>
                    <Text style={styles.linkText}>{contactsLoading ? "Loading..." : "Sync Contacts"}</Text>
                  </Pressable>
                )}
              </View>
              <TextInput
                style={styles.input}
                value={memberEmail}
                onChangeText={onMemberEmailChange}
                onFocus={onFocusMemberInput}
                placeholder="Search by name, email or phone"
                placeholderTextColor={colors.textMuted}
                autoCapitalize="none"
              />
              {selectedUsers.length > 0 && (
                <View style={styles.wrapRow}>
                  {selectedUsers.map((selectedUser) => (
                    <Pressable key={selectedUser.id} onPress={() => onRemoveSelectedUser(selectedUser.id)} style={styles.personPillActive}>
                      <Text style={styles.personPillTextActive}>{personName(selectedUser)}</Text>
                    </Pressable>
                  ))}
                </View>
              )}
              {searchingUsers && <Text style={styles.mutedText}>Searching Cashsync users...</Text>}
              {inviteUser && (
                <View style={[styles.inviteCard, { backgroundColor: colors.accentSoft }]}>
                  <Text style={{ color: colors.text, fontSize: 13, fontWeight: "600" }}>
                    {inviteUser.identifier} is not on Cashsync yet.
                  </Text>
                  <Pressable onPress={() => onInvite(inviteUser.identifier, inviteUser.type)}>
                    <Text style={styles.linkText}>Invite via {inviteUser.type === "phone" ? "SMS" : "Email"}</Text>
                  </Pressable>
                </View>
              )}
              <View style={styles.rowGap}>
                <Pressable style={[styles.secondaryBtn, { flex: 1 }]} onPress={async () => {
                  await Clipboard.setStringAsync(`cashsync://groups/${group.id}`);
                  showError("Invite Link Copied", "Group invite link copied to clipboard.");
                }}>
                  <Text style={styles.secondaryBtnText}>Invite via Link</Text>
                </Pressable>
                <Pressable style={[styles.primaryBtn, { flex: 1, alignItems: "center" }]} onPress={onAddMember} disabled={addingSelectedUsers}>
                  {addingSelectedUsers ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>Add People</Text>}
                </Pressable>
              </View>
            </View>

            <View style={styles.settingsBlock}>
              <Text style={styles.cardTitle}>Members</Text>
              {ledger?.members.map((member) => {
                const balance = ledger.balances.find((item) => item.userId === member.userId);
                return (
                  <Pressable key={member.userId} style={styles.memberListRow} onPress={() => onOpenMember(member.userId)}>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={styles.memberName}>{personName(member.user)}</Text>
                      <Text style={styles.mutedText}>{member.role}</Text>
                    </View>
                    <Text
                      style={[
                        styles.memberAmountCompact,
                        { color: (balance?.net ?? 0) >= 0 ? colors.success : colors.danger },
                      ]}
                    >
                      {balanceLabel(balance?.net ?? 0, balance?.currency ?? ledger.currency)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <View style={styles.settingsBlock}>
              <Text style={styles.cardTitle}>Simplify group debt</Text>
              {!ledger || ledger.suggestedSettlements.length === 0 ? (
                <Text style={styles.mutedText}>No suggested settlements right now.</Text>
              ) : (
                ledger.suggestedSettlements.map((route, index) => (
                  <View key={`${route.fromUserId}-${route.toUserId}-${index}`} style={styles.memberListRow}>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={styles.memberName}>
                        {personName(ledger.members.find((m) => m.userId === route.fromUserId)?.user)} pays {personName(ledger.members.find((m) => m.userId === route.toUserId)?.user)}
                      </Text>
                      <Text style={styles.mutedText}>{formatCurrencyLabel(route.currency)}</Text>
                    </View>
                    <Text style={styles.memberAmountCompact}>{formatCurrency(route.amount, route.currency)}</Text>
                  </View>
                ))
              )}
            </View>

            <View style={styles.rowGap}>
              <Pressable style={[styles.secondaryBtn, { flex: 1 }]} onPress={onLeaveGroup}>
                <Text style={styles.secondaryBtnText}>Leave Group</Text>
              </Pressable>
              <Pressable style={[styles.secondaryBtn, { flex: 1, borderColor: colors.danger }]} onPress={onDeleteGroup}>
                <Text style={[styles.secondaryBtnText, { color: colors.danger }]}>Delete Group</Text>
              </Pressable>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
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

type FriendCandidate = {
  id: string;
  name?: string;
  email: string;
};

type CommonExpenseModalProps = Readonly<{
  visible: boolean;
  authorId: string;
  groups: GroupSummary[];
  friendCandidates: FriendCandidate[];
  initialGroupId?: string | null;
  onClose: () => void;
  onDone: () => void;
}>;

type GroupSettingsModalProps = Readonly<{
  visible: boolean;
  group: GroupSummary;
  ledger: GroupLedger | null;
  userId?: string;
  memberEmail: string;
  selectedUsers: GroupSearchUser[];
  inviteUser: { identifier: string; type: "email" | "phone" } | null;
  contacts: Contacts.Contact[];
  contactsLoading: boolean;
  addingSelectedUsers: boolean;
  searchingUsers: boolean;
  onClose: () => void;
  onOpenEdit: () => void;
  onDeleteGroup: () => void;
  onLeaveGroup: () => void;
  onOpenMember: (userId: string) => void;
  onMemberEmailChange: (value: string) => void;
  onFocusMemberInput: () => void;
  onLoadContacts: () => void;
  onRemoveSelectedUser: (userId: string) => void;
  onAddMember: () => void;
  onInvite: (identifier: string, type: "email" | "phone") => void;
}>;

type MemberDetailModalProps = Readonly<{
  visible: boolean;
  groupName: string;
  member?: GroupLedger["members"][number];
  balance?: GroupLedger["balances"][number];
  onClose: () => void;
  onRemove: () => void;
  onToggleRole: () => void;
}>;

function balanceLabel(amount: number, currency: string) {
  if (amount > 0) return `Gets back ${formatCurrency(amount, currency)}`;
  if (amount < 0) return `Owes ${formatCurrency(Math.abs(amount), currency)}`;
  return "All settled";
}

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
  const [allUsers, setAllUsers] = useState<FriendCandidate[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [ledger, setLedger] = useState<GroupLedger | null>(null);
  const [groupExpenses, setGroupExpenses] = useState<Transaction[]>([]);
  const [, setFriendBalances] = useState<FriendBalanceSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingLedger, setLoadingLedger] = useState(false);
  const [loadingExpenses, setLoadingExpenses] = useState(false);
  const [, setLoadingFriends] = useState(false);
  const [openCreate, setOpenCreate] = useState(false);
  const [openEdit, setOpenEdit] = useState(false);
  const [openSettings, setOpenSettings] = useState(false);
  const [openExpense, setOpenExpense] = useState(false);
  const [activeMemberId, setActiveMemberId] = useState<string | null>(null);
  const [memberEmail, setMemberEmail] = useState("");
  const [searchResults, setSearchResults] = useState<GroupSearchUser[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<GroupSearchUser[]>([]);
  const [addingSelectedUsers, setAddingSelectedUsers] = useState(false);
  const [searchingUsers, setSearchingUsers] = useState(false);
  const [contacts, setContacts] = useState<Contacts.Contact[]>([]);
  const [contactsLoading, setContactsLoading] = useState(false);
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [inviteUser, setInviteUser] = useState<{ identifier: string; type: "email" | "phone" } | null>(null);

  const handleDeleteGroup = async () => {
    if (!selectedGroupId) return;
    const confirmed = await confirmAction(
      "Delete Group",
      "Are you sure you want to delete this group? This cannot be undone.",
      "Delete",
    );
    if (!confirmed) return;

    try {
      await deleteGroup(selectedGroupId);
      setSelectedGroupId(null);
      await loadGroups();
    } catch (e) {
      console.error(e);
      showError("Delete Failed", getErrorMessage(e, "Unable to delete the group."));
    }
  };

  const handleUpdateMemberRole = async (userId: string, role: 'ADMIN' | 'MEMBER') => {
    if (!selectedGroupId) return;
    try {
      await updateGroupMember(selectedGroupId, userId, { role });
      await Promise.all([loadGroups(), loadLedger()]);
    } catch (e) {
      console.error(e);
      showError("Update Failed", getErrorMessage(e, "Unable to update the member role."));
    }
  };

  const handleRemoveMember = async (userId: string) => {
    if (!selectedGroupId) return;
    const confirmed = await confirmAction(
      "Remove Member",
      "Are you sure you want to remove this member?",
      "Remove",
    );
    if (!confirmed) return;

    try {
      await removeGroupMember(selectedGroupId, userId);
      await Promise.all([loadGroups(), loadLedger()]);
    } catch (e) {
      console.error(e);
      showError("Remove Failed", getErrorMessage(e, "Unable to remove the member."));
    }
  };

  const handleLeaveGroup = async () => {
    if (!selectedGroupId || !user?.id) return;
    const confirmed = await confirmAction(
      "Leave Group",
      "Are you sure you want to leave this group?",
      "Leave",
    );
    if (!confirmed) return;

    try {
      await removeGroupMember(selectedGroupId, user.id);
      setOpenSettings(false);
      setSelectedGroupId(null);
      await Promise.all([loadGroups(), loadLedger(), loadFriends(), loadGroupExpenses()]);
    } catch (error) {
      console.error(error);
      showError("Leave Failed", getErrorMessage(error, "Unable to leave the group."));
    }
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

  const loadUsers = useCallback(async () => {
    if (!user) return;
    try {
      const result = await getAllUsers();
      setAllUsers(
        (result as FriendCandidate[]).filter((candidate) => candidate.id !== user.id),
      );
    } catch (error) {
      console.error(error);
    }
  }, [user]);

  const loadGroupExpenses = useCallback(async () => {
    if (!user || !selectedGroupId) {
      setGroupExpenses([]);
      return;
    }

    setLoadingExpenses(true);
    try {
      const result = await getTransactions(user.id, { groupId: selectedGroupId, limit: 12 });
      setGroupExpenses(result.transactions);
    } finally {
      setLoadingExpenses(false);
    }
  }, [selectedGroupId, user]);

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

  useEffect(() => {
    void loadGroupExpenses();
  }, [loadGroupExpenses]);

  useFocusEffect(
    useCallback(() => {
      void Promise.all([loadGroups(), loadLedger(), loadFriends(), loadGroupExpenses(), loadUsers()]);
    }, [loadGroups, loadLedger, loadFriends, loadGroupExpenses, loadUsers]),
  );

  const addMemberByIdentifier = async (identifier: string, type: "email" | "phone") => {
    if (!selectedGroupId || !identifier.trim()) return;
    setInviteUser(null);
    try {
      await addGroupMember(selectedGroupId, type === "email"
        ? { emails: [identifier.trim()] }
        : { phones: [identifier.trim()] });
      setMemberEmail("");
      await Promise.all([loadGroups(), loadLedger(), loadFriends(), loadGroupExpenses()]);
    } catch (e: any) {
      if (e.message.includes("not found")) {
        setInviteUser({ identifier: identifier.trim(), type });
      } else {
        console.error(e);
        showError("Add Member Failed", getErrorMessage(e, "Unable to add this member."));
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
        await Promise.all([loadGroups(), loadLedger(), loadFriends(), loadGroupExpenses()]);
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
  }, [contacts, isInputFocused, ledger?.members, memberEmail, searchResults]);

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
          showError("Search Failed", getErrorMessage(error, "Unable to search users right now."));
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
    await Promise.all([loadGroups(), loadLedger(), loadFriends(), loadGroupExpenses()]);
  };

  const membersById = useMemo(() => {
    const map = new Map<string, { id: string; name?: string; email: string }>();
    ledger?.members.forEach((m) => map.set(m.user.id, m.user));
    return map;
  }, [ledger]);

  const activeMember = useMemo(
    () => ledger?.members.find((member) => member.userId === activeMemberId),
    [activeMemberId, ledger],
  );

  const activeMemberBalance = useMemo(
    () => ledger?.balances.find((balance) => balance.userId === activeMemberId),
    [activeMemberId, ledger],
  );

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
        <View style={styles.screenHeader}>
          <View style={styles.headerSide}>
            {selectedGroup ? (
              <Pressable style={styles.iconButton} onPress={() => {
                setSelectedGroupId(null);
                setOpenSettings(false);
              }}>
                <Ionicons name="chevron-back" size={20} color={colors.text} />
              </Pressable>
            ) : (
              <View style={styles.iconButtonGhost} />
            )}
          </View>
          <View style={styles.headerCenter}>
            <Text style={styles.title} numberOfLines={1}>
              {selectedGroup ? selectedGroup.name : "Groups"}
            </Text>
            <Text style={styles.subtitle}>
              {selectedGroup ? "Shared expenses and balances" : "Track shared circles like a modern split app"}
            </Text>
          </View>
          <View style={styles.headerActions}>
            <Pressable style={styles.iconButton} onPress={() => setOpenExpense(true)}>
              <Ionicons name="add" size={20} color={colors.text} />
            </Pressable>
            {selectedGroup ? (
              <Pressable style={styles.iconButton} onPress={() => setOpenSettings(true)}>
                <Ionicons name="settings-outline" size={18} color={colors.text} />
              </Pressable>
            ) : (
              <Pressable style={styles.iconButton} onPress={() => setOpenCreate(true)}>
                <Ionicons name="people-outline" size={18} color={colors.text} />
              </Pressable>
            )}
          </View>
        </View>

        {!selectedGroup ? (
          <>
            {loading ? (
              <ActivityIndicator color={colors.accent} />
            ) : groups.length === 0 ? (
              <View style={styles.heroCard}>
                <Text style={styles.heroTitle}>No groups yet</Text>
                <Text style={styles.heroSubtitle}>Create your first shared circle and start adding missing expenses fast.</Text>
                <Pressable style={styles.primaryBtn} onPress={() => setOpenCreate(true)}>
                  <Text style={styles.primaryBtnText}>Create Group</Text>
                </Pressable>
              </View>
            ) : (
              <View style={styles.listWrap}>
                {groups.map((group) => (
                  <Pressable key={group.id} style={styles.groupListCard} onPress={() => setSelectedGroupId(group.id)}>
                    <View style={styles.groupListTop}>
                      <View style={styles.groupBadge}>
                        <Text style={styles.groupBadgeText}>{group.emoji || group.name.slice(0, 1).toUpperCase()}</Text>
                      </View>
                      <Text style={styles.groupMeta}>{group.members.length} members</Text>
                    </View>
                    <Text style={styles.groupName}>{group.name}</Text>
                    <Text style={styles.mutedText} numberOfLines={2}>
                      {group.description || "Add expenses, settle balances, and keep everyone aligned."}
                    </Text>
                    <View style={styles.groupStatsRow}>
                      <View>
                        <Text style={styles.statLabel}>You owe</Text>
                        <Text style={[styles.statValue, { color: colors.danger }]}>{formatCurrency(group.stats.youOwe, group.stats.currency)}</Text>
                      </View>
                      <View>
                        <Text style={styles.statLabel}>Get back</Text>
                        <Text style={[styles.statValue, { color: colors.success }]}>{formatCurrency(group.stats.youAreOwed, group.stats.currency)}</Text>
                      </View>
                    </View>
                  </Pressable>
                ))}
              </View>
            )}
          </>
        ) : (
          <>
            <View style={styles.heroCard}>
              <Text style={styles.heroTitle}>{selectedGroup.emoji ? `${selectedGroup.emoji} ` : ""}{selectedGroup.name}</Text>
              <Text style={styles.heroSubtitle}>{selectedGroup.description || "Split expenses smoothly and keep balances clear for everyone."}</Text>
              <View style={styles.heroStatsRow}>
                <View style={styles.heroStatCard}>
                  <Text style={styles.statLabel}>You owe</Text>
                  <Text style={[styles.statValue, { color: colors.danger }]}>{formatCurrency(selectedGroup.stats.youOwe, selectedGroup.stats.currency)}</Text>
                </View>
                <View style={styles.heroStatCard}>
                  <Text style={styles.statLabel}>Get back</Text>
                  <Text style={[styles.statValue, { color: colors.success }]}>{formatCurrency(selectedGroup.stats.youAreOwed, selectedGroup.stats.currency)}</Text>
                </View>
              </View>
            </View>

            <View style={styles.card}>
              <View style={styles.sectionHeader}>
                <View>
                  <Text style={styles.cardTitle}>Recent expenses</Text>
                  <Text style={styles.mutedText}>The latest shared activity in this group.</Text>
                </View>
                <Pressable style={styles.iconTextBtn} onPress={() => setOpenExpense(true)}>
                  <Text style={styles.iconTextBtnLabel}>Add expense</Text>
                </Pressable>
              </View>
              {loadingExpenses ? (
                <ActivityIndicator color={colors.accent} />
              ) : groupExpenses.length === 0 ? (
                <Text style={styles.mutedText}>No group expenses yet. Tap add expense to create the first one.</Text>
              ) : (
                groupExpenses.map((expense) => (
                  <View key={expense.id} style={styles.expenseRow}>
                    <View style={styles.expenseAvatar}>
                      <Ionicons name="receipt-outline" size={16} color={colors.accent} />
                    </View>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={styles.memberName} numberOfLines={1}>{expense.title}</Text>
                      <Text style={styles.mutedText} numberOfLines={1}>
                        Paid by {personName(ledger?.members.find((member) => member.userId === expense.authorId)?.user)} • {new Date(expense.date).toLocaleDateString()}
                      </Text>
                    </View>
                    <Text style={styles.expenseAmount}>{formatCurrency(expense.amount, expense.currency)}</Text>
                  </View>
                ))
              )}
            </View>

            <View style={styles.card}>
              <View style={styles.sectionHeader}>
                <View>
                  <Text style={styles.cardTitle}>Simplified debt</Text>
                  <Text style={styles.mutedText}>Fastest way to settle the group.</Text>
                </View>
              </View>
              {loadingLedger ? (
                <ActivityIndicator color={colors.accent} />
              ) : !ledger || ledger.suggestedSettlements.length === 0 ? (
                <Text style={styles.mutedText}>No pending balances. Everyone is settled up.</Text>
              ) : (
                ledger.suggestedSettlements.map((route, i) => {
                  const from = personName(membersById.get(route.fromUserId));
                  const to = personName(membersById.get(route.toUserId));
                  return (
                    <View key={`${route.fromUserId}-${route.toUserId}-${i}`} style={styles.memberListRow}>
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <Text style={styles.memberName}>{from} pays {to}</Text>
                        <Text style={styles.mutedText}>{formatCurrencyLabel(route.currency)}</Text>
                      </View>
                      <View style={{ alignItems: "flex-end", gap: 8 }}>
                        <Text style={styles.memberAmountCompact}>{formatCurrency(route.amount, route.currency)}</Text>
                        {user?.id === route.fromUserId && (
                          <Pressable style={styles.iconTextBtn} onPress={() => settle(route.fromUserId, route.toUserId, route.amount, route.currency)}>
                            <Text style={styles.iconTextBtnLabel}>Settle</Text>
                          </Pressable>
                        )}
                      </View>
                    </View>
                  );
                })
              )}
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

      {user && (
        <CommonExpenseModal
          visible={openExpense}
          onClose={() => setOpenExpense(false)}
          authorId={user.id}
          groups={groups}
          friendCandidates={allUsers}
          initialGroupId={selectedGroupId}
          onDone={() => {
            void Promise.all([loadGroups(), loadLedger(), loadFriends(), loadGroupExpenses()]);
          }}
        />
      )}

      {selectedGroup && (
        <GroupSettingsModal
          visible={openSettings}
          onClose={() => setOpenSettings(false)}
          group={selectedGroup}
          ledger={ledger}
          userId={user?.id}
          memberEmail={memberEmail}
          selectedUsers={selectedUsers}
          inviteUser={inviteUser}
          contacts={contacts}
          contactsLoading={contactsLoading}
          addingSelectedUsers={addingSelectedUsers}
          searchingUsers={searchingUsers}
          onOpenEdit={() => {
            setOpenSettings(false);
            setOpenEdit(true);
          }}
          onDeleteGroup={handleDeleteGroup}
          onLeaveGroup={handleLeaveGroup}
          onOpenMember={(userId) => setActiveMemberId(userId)}
          onMemberEmailChange={setMemberEmail}
          onFocusMemberInput={() => setIsInputFocused(true)}
          onLoadContacts={loadContacts}
          onRemoveSelectedUser={removeSelectedUser}
          onAddMember={addMember}
          onInvite={sendInvite}
        />
      )}

      {selectedGroup && (
        <MemberDetailModal
          visible={!!activeMember}
          onClose={() => setActiveMemberId(null)}
          groupName={selectedGroup.name}
          member={activeMember}
          balance={activeMemberBalance}
          onRemove={async () => {
            if (!activeMember) return;
            await handleRemoveMember(activeMember.userId);
            setActiveMemberId(null);
          }}
          onToggleRole={async () => {
            if (!activeMember) return;
            await handleUpdateMemberRole(activeMember.userId, activeMember.role === "ADMIN" ? "MEMBER" : "ADMIN");
          }}
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
      paddingHorizontal: 16,
      paddingTop: Platform.OS === "web" ? 40 : 58,
      paddingBottom: 110,
      gap: 16,
      maxWidth: 760,
      width: "100%",
      alignSelf: "center",
    },
    screenHeader: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
    },
    headerSide: {
      width: 42,
    },
    headerCenter: {
      flex: 1,
      minWidth: 0,
    },
    headerActions: {
      flexDirection: "row",
      gap: 10,
    },
    iconButton: {
      width: 42,
      height: 42,
      borderRadius: 14,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: "center",
      justifyContent: "center",
    },
    iconButtonGhost: {
      width: 42,
      height: 42,
    },
    heroCard: {
      borderRadius: 28,
      padding: 20,
      gap: 14,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
    },
    heroTitle: {
      color: colors.text,
      fontSize: 24,
      fontWeight: "800",
      letterSpacing: -0.4,
    },
    heroSubtitle: {
      color: colors.textMuted,
      fontSize: 13,
      lineHeight: 19,
    },
    heroStatsRow: {
      flexDirection: "row",
      gap: 10,
    },
    heroStatCard: {
      flex: 1,
      minWidth: 0,
      borderRadius: 18,
      padding: 14,
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.border,
    },
    listWrap: {
      gap: 12,
    },
    groupListCard: {
      borderRadius: 22,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card,
      padding: 18,
      gap: 12,
    },
    groupListTop: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      gap: 12,
    },
    groupBadge: {
      width: 42,
      height: 42,
      borderRadius: 14,
      backgroundColor: colors.accentSoft,
      alignItems: "center",
      justifyContent: "center",
    },
    groupBadgeText: {
      color: colors.accent,
      fontWeight: "800",
      fontSize: 16,
    },
    groupStatsRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      gap: 12,
    },
    statLabel: {
      color: colors.textMuted,
      fontSize: 12,
      marginBottom: 4,
    },
    statValue: {
      fontSize: 15,
      fontWeight: "800",
    },
    modalTopRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 12,
    },
    segmentRow: {
      flexDirection: "row",
      backgroundColor: colors.background,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 4,
      gap: 4,
    },
    segmentButton: {
      flex: 1,
      borderRadius: 10,
      paddingVertical: 10,
      alignItems: "center",
    },
    segmentButtonActive: {
      backgroundColor: colors.accentSoft,
    },
    segmentText: {
      color: colors.textMuted,
      fontWeight: "700",
    },
    segmentTextActive: {
      color: colors.accent,
    },
    sheetLabel: {
      color: colors.textSecondary,
      fontSize: 13,
      fontWeight: "700",
    },
    inlineScroll: {
      gap: 8,
      paddingVertical: 2,
    },
    compactChip: {
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.input,
    },
    compactChipActive: {
      borderColor: colors.accent,
      backgroundColor: colors.accentSoft,
    },
    compactChipText: {
      color: colors.textMuted,
      fontWeight: "600",
    },
    compactChipTextActive: {
      color: colors.accent,
    },
    wrapRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
    },
    personPill: {
      borderRadius: 999,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.input,
      paddingHorizontal: 12,
      paddingVertical: 8,
    },
    personPillActive: {
      borderRadius: 999,
      borderWidth: 1,
      borderColor: colors.accent,
      backgroundColor: colors.accentSoft,
      paddingHorizontal: 12,
      paddingVertical: 8,
    },
    personPillText: {
      color: colors.textMuted,
      fontWeight: "600",
    },
    personPillTextActive: {
      color: colors.accent,
      fontWeight: "700",
    },
    expenseRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderBottomColor: `${colors.border}66`,
    },
    expenseAvatar: {
      width: 40,
      height: 40,
      borderRadius: 12,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.accentSoft,
    },
    expenseAmount: {
      color: colors.text,
      fontWeight: "800",
      fontSize: 14,
    },
    settingsBlock: {
      borderRadius: 18,
      borderWidth: 1,
      borderColor: `${colors.border}CC`,
      backgroundColor: colors.background,
      padding: 14,
      gap: 12,
    },
    iconTextBtn: {
      borderRadius: 999,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 12,
      paddingVertical: 8,
      backgroundColor: colors.input,
    },
    iconTextBtnLabel: {
      color: colors.text,
      fontWeight: "700",
      fontSize: 12,
    },
    linkText: {
      color: colors.accent,
      fontWeight: "700",
      fontSize: 13,
    },
    memberListRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderBottomColor: `${colors.border}55`,
    },
    memberAmountCompact: {
      maxWidth: 120,
      textAlign: "right",
      color: colors.text,
      fontWeight: "700",
      fontSize: 12,
    },
    memberProfileCard: {
      borderRadius: 18,
      padding: 16,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.background,
      gap: 6,
    },
    memberProfileAmount: {
      color: colors.text,
      fontSize: 20,
      fontWeight: "800",
    },
    settingAction: {
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.input,
      padding: 16,
      gap: 4,
    },
    settingActionText: {
      color: colors.text,
      fontWeight: "700",
      fontSize: 15,
    },
    settingActionSubtext: {
      color: colors.textMuted,
      fontSize: 12,
      lineHeight: 17,
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
