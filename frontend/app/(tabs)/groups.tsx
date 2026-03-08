import { LinearGradient } from 'expo-linear-gradient';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
} from 'react-native';

import { useAuth } from '@/src/context/AuthContext';
import {
  addGroupMember,
  createGroup,
  getGroupLedger,
  getGroups,
  GroupLedger,
  GroupSummary,
  settleGroupDebt,
} from '@/src/features/group';

const BG = '#0D1117';
const CARD_BG = '#161D2C';
const BORDER = '#1E2D46';
const ACCENT = '#4F8EF7';
const GREEN = '#34D399';
const RED = '#F87171';
const PURPLE = '#9B59F5';
const MUTED = '#4A5568';
const TEXT_DIM = '#8B9AB3';

function nameOf(user?: { id: string; name?: string; email: string }) {
  if (!user) return 'User';
  return user.name || user.email.split('@')[0] || 'User';
}

function CreateGroupModal({
  visible,
  onClose,
  ownerId,
  onDone,
}: {
  visible: boolean;
  onClose: () => void;
  ownerId: string;
  onDone: () => void;
}) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [emoji, setEmoji] = useState('');
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
      setName('');
      setDescription('');
      setEmoji('');
      onDone();
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={m.overlay}>
        <View style={m.sheet}>
          <Text style={m.title}>Create Group</Text>
          <TextInput
            style={m.input}
            placeholder="Name (Goa Trip)"
            placeholderTextColor={MUTED}
            value={name}
            onChangeText={setName}
          />
          <TextInput
            style={m.input}
            placeholder="Description"
            placeholderTextColor={MUTED}
            value={description}
            onChangeText={setDescription}
          />
          <TextInput
            style={m.input}
            placeholder="Emoji (optional)"
            placeholderTextColor={MUTED}
            value={emoji}
            onChangeText={setEmoji}
          />

          <View style={m.row}>
            <Pressable style={m.cancelBtn} onPress={onClose}>
              <Text style={m.cancelText}>Cancel</Text>
            </Pressable>
            <Pressable style={m.submitBtn} onPress={submit} disabled={loading}>
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={m.submitText}>Create</Text>}
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

export default function GroupsScreen() {
  const { user } = useAuth();
  const [groups, setGroups] = useState<GroupSummary[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [ledger, setLedger] = useState<GroupLedger | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingLedger, setLoadingLedger] = useState(false);
  const [openCreate, setOpenCreate] = useState(false);
  const [memberEmail, setMemberEmail] = useState('');

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
      if (!selectedGroupId && result.length) {
        setSelectedGroupId(result[0]!.id);
      }
    } finally {
      setLoading(false);
    }
  }, [user, selectedGroupId]);

  const loadLedger = useCallback(async () => {
    if (!selectedGroupId) {
      setLedger(null);
      return;
    }
    setLoadingLedger(true);
    try {
      const result = await getGroupLedger(selectedGroupId);
      setLedger(result);
    } finally {
      setLoadingLedger(false);
    }
  }, [selectedGroupId]);

  useEffect(() => {
    loadGroups();
  }, [loadGroups]);

  useEffect(() => {
    loadLedger();
  }, [loadLedger]);

  const addMember = async () => {
    if (!selectedGroupId || !memberEmail.trim()) return;
    try {
      await addGroupMember(selectedGroupId, { email: memberEmail.trim() });
      setMemberEmail('');
      await Promise.all([loadGroups(), loadLedger()]);
    } catch {
    }
  };

  const settle = async (fromUserId: string, toUserId: string, amount: number) => {
    if (!selectedGroupId) return;
    try {
      await settleGroupDebt(selectedGroupId, { fromUserId, toUserId, amount });
      await Promise.all([loadGroups(), loadLedger()]);
    } catch {
    }
  };

  const membersById = useMemo(() => {
    const map = new Map<string, { id: string; name?: string; email: string }>();
    ledger?.members.forEach((m) => map.set(m.user.id, m.user));
    return map;
  }, [ledger]);

  return (
    <View style={{ flex: 1, backgroundColor: BG }}>
      <LinearGradient colors={[BG, '#111827', BG]} style={StyleSheet.absoluteFill} />

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        <View style={s.header}>
          <View>
            <Text style={s.title}>Groups & Split</Text>
            <Text style={s.subtitle}>Optimized settle-up for every trip or household</Text>
          </View>
          <Pressable style={s.addBtn} onPress={() => setOpenCreate(true)}>
            <Text style={s.addBtnText}>+ Group</Text>
          </Pressable>
        </View>

        {loading ? (
          <ActivityIndicator color={ACCENT} />
        ) : groups.length === 0 ? (
          <View style={s.empty}>
            <Text style={{ color: TEXT_DIM }}>No groups yet. Create your first one.</Text>
          </View>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
            {groups.map((group) => (
              <Pressable
                key={group.id}
                onPress={() => setSelectedGroupId(group.id)}
                style={[s.groupCard, selectedGroupId === group.id && s.groupCardActive]}
              >
                <Text style={s.groupName}>
                  {group.emoji ? `${group.emoji} ` : ''}
                  {group.name}
                </Text>
                <Text style={s.groupMeta}>{group.members.length} members</Text>
                <Text style={[s.balanceLine, { color: RED }]}>You owe: Rs {group.stats.youOwe.toFixed(2)}</Text>
                <Text style={[s.balanceLine, { color: GREEN }]}>You are owed: Rs {group.stats.youAreOwed.toFixed(2)}</Text>
                <Text style={[s.balanceLine, { color: group.stats.net >= 0 ? GREEN : RED }]}>Net: Rs {group.stats.net.toFixed(2)}</Text>
              </Pressable>
            ))}
          </ScrollView>
        )}

        {selectedGroup && (
          <View style={s.card}>
            <Text style={s.cardTitle}>Add Member by Email</Text>
            <TextInput
              style={s.input}
              value={memberEmail}
              onChangeText={setMemberEmail}
              placeholder="member@email.com"
              placeholderTextColor={MUTED}
              autoCapitalize="none"
            />
            <Pressable style={s.primaryBtn} onPress={addMember}>
              <Text style={s.primaryBtnText}>Add Member</Text>
            </Pressable>
          </View>
        )}

        <View style={s.card}>
          <Text style={s.cardTitle}>Suggested Settlements</Text>
          {loadingLedger ? (
            <ActivityIndicator color={ACCENT} />
          ) : !ledger || ledger.suggestedSettlements.length === 0 ? (
            <Text style={{ color: TEXT_DIM, marginTop: 6 }}>No pending balances. Everyone is settled up.</Text>
          ) : (
            ledger.suggestedSettlements.map((route, i) => {
              const from = nameOf(membersById.get(route.fromUserId));
              const to = nameOf(membersById.get(route.toUserId));
              return (
                <View key={`${route.fromUserId}-${route.toUserId}-${i}`} style={s.routeRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.routeText}>{from} pays {to}</Text>
                    <Text style={s.routeAmount}>Rs {route.amount.toFixed(2)}</Text>
                  </View>
                  {user?.id === route.fromUserId && (
                    <Pressable
                      style={[s.primaryBtn, { paddingVertical: 10, paddingHorizontal: 14 }]}
                      onPress={() => settle(route.fromUserId, route.toUserId, route.amount)}
                    >
                      <Text style={s.primaryBtnText}>Settle</Text>
                    </Pressable>
                  )}
                </View>
              );
            })
          )}
        </View>

        <View style={s.card}>
          <Text style={s.cardTitle}>Member Balances</Text>
          {ledger?.balances.map((b) => {
            const person = membersById.get(b.userId);
            return (
              <View key={b.userId} style={s.balanceRow}>
                <Text style={s.memberName}>{nameOf(person)}</Text>
                <Text style={{ color: b.net >= 0 ? GREEN : RED, fontWeight: '700' }}>
                  {b.net >= 0 ? '+' : ''}Rs {b.net.toFixed(2)}
                </Text>
              </View>
            );
          })}
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

const m = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: '#000a', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: '#1A2235',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    paddingBottom: 40,
    gap: 12,
  },
  title: { color: '#fff', fontSize: 20, fontWeight: '800' },
  input: {
    backgroundColor: BG,
    borderColor: BORDER,
    borderWidth: 1,
    borderRadius: 12,
    color: '#fff',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  row: { flexDirection: 'row', gap: 10, marginTop: 8 },
  cancelBtn: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: CARD_BG,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelText: { color: MUTED, fontWeight: '700' },
  submitBtn: {
    flex: 1.6,
    borderRadius: 12,
    backgroundColor: ACCENT,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 13,
  },
  submitText: { color: '#fff', fontWeight: '700' },
});

const s = StyleSheet.create({
  scroll: {
    paddingHorizontal: 18,
    paddingTop: Platform.OS === 'web' ? 40 : 58,
    paddingBottom: 110,
    gap: 16,
    maxWidth: 760,
    width: '100%',
    alignSelf: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: { color: '#fff', fontSize: 27, fontWeight: '800', letterSpacing: -0.4 },
  subtitle: { color: MUTED, marginTop: 4, fontSize: 12 },
  addBtn: {
    backgroundColor: ACCENT + '22',
    borderWidth: 1,
    borderColor: ACCENT,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  addBtnText: { color: ACCENT, fontWeight: '700', fontSize: 13 },
  empty: {
    backgroundColor: CARD_BG,
    borderColor: BORDER,
    borderWidth: 1,
    borderRadius: 16,
    padding: 20,
  },
  groupCard: {
    width: 220,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: CARD_BG,
    padding: 14,
    gap: 6,
  },
  groupCardActive: {
    borderColor: ACCENT,
    backgroundColor: '#182841',
  },
  groupName: { color: '#fff', fontSize: 16, fontWeight: '700' },
  groupMeta: { color: TEXT_DIM, fontSize: 12 },
  balanceLine: { fontSize: 12, fontWeight: '600' },
  card: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: CARD_BG,
    padding: 16,
    gap: 10,
  },
  cardTitle: { color: '#fff', fontSize: 16, fontWeight: '700' },
  input: {
    backgroundColor: BG,
    borderColor: BORDER,
    borderWidth: 1,
    borderRadius: 12,
    color: '#fff',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  primaryBtn: {
    alignSelf: 'flex-start',
    backgroundColor: PURPLE,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  primaryBtnText: { color: '#fff', fontWeight: '700' },
  routeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: BORDER + '66',
  },
  routeText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  routeAmount: { color: TEXT_DIM, marginTop: 2, fontSize: 12 },
  balanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: BORDER + '66',
    paddingVertical: 10,
  },
  memberName: { color: '#fff', fontWeight: '600' },
});
