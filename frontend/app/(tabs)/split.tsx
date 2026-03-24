import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect } from "@react-navigation/native";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { useAuth } from "@/src/context/AuthContext";
import { useAppTheme } from "@/src/context/ThemeContext";
import {
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

export default function SplitScreen() {
  const { user } = useAuth();
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const router = useRouter();
  const [groups, setGroups] = useState<GroupSummary[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [ledger, setLedger] = useState<GroupLedger | null>(null);
  const [friendBalances, setFriendBalances] = useState<FriendBalanceSummary[]>([]);
  const [loadingGroups, setLoadingGroups] = useState(true);
  const [loadingLedger, setLoadingLedger] = useState(false);
  const [loadingFriends, setLoadingFriends] = useState(false);

  const selectedGroup = useMemo(
    () => groups.find((group) => group.id === selectedGroupId) || null,
    [groups, selectedGroupId],
  );

  const loadGroups = useCallback(async () => {
    if (!user) return;
    setLoadingGroups(true);
    try {
      const result = await getGroups(user.id);
      setGroups(result);
      setSelectedGroupId((current) => current ?? result[0]?.id ?? null);
    } finally {
      setLoadingGroups(false);
    }
  }, [user]);

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

  const membersById = useMemo(() => {
    const map = new Map<string, { id: string; name?: string; email: string }>();
    ledger?.members.forEach((member) => map.set(member.user.id, member.user));
    return map;
  }, [ledger]);

  const settle = async (fromUserId: string, toUserId: string, amount: number, currency: string) => {
    if (!selectedGroupId) return;
    await settleGroupDebt(selectedGroupId, { fromUserId, toUserId, amount, currency });
    await Promise.all([loadGroups(), loadLedger(), loadFriends()]);
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <LinearGradient colors={colors.gradient} style={StyleSheet.absoluteFill} />

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Split</Text>
            <Text style={styles.subtitle}>Track who owes whom and settle up fast.</Text>
          </View>
          <Pressable style={styles.manageBtn} onPress={() => router.push("/(tabs)/groups")}>
            <Text style={styles.manageBtnText}>Manage Groups</Text>
          </Pressable>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Friends & Balances</Text>
          {loadingFriends ? (
            <ActivityIndicator color={colors.accent} />
          ) : friendBalances.length === 0 ? (
            <Text style={styles.mutedText}>No balances yet. Split a transaction and this list will fill in.</Text>
          ) : (
            friendBalances.map((friend) => (
              <View key={friend.userId} style={styles.row}>
                <View style={{ flex: 1, gap: 4 }}>
                  <Text style={styles.rowTitle}>{personName(friend.user)}</Text>
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
          <Text style={styles.cardTitle}>Choose Group</Text>
          {loadingGroups ? (
            <ActivityIndicator color={colors.accent} />
          ) : groups.length === 0 ? (
            <Text style={styles.mutedText}>Create a group first to settle balances inside it.</Text>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
              {groups.map((group) => (
                <Pressable
                  key={group.id}
                  onPress={() => setSelectedGroupId(group.id)}
                  style={[styles.groupChip, selectedGroupId === group.id && styles.groupChipActive]}
                >
                  <Text style={[styles.groupChipText, selectedGroupId === group.id && styles.groupChipTextActive]}>
                    {group.emoji ? `${group.emoji} ` : ""}{group.name}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Settle Up</Text>
          {loadingLedger ? (
            <ActivityIndicator color={colors.accent} />
          ) : !selectedGroup ? (
            <Text style={styles.mutedText}>Pick a group to see who should pay whom.</Text>
          ) : !ledger || ledger.suggestedSettlements.length === 0 ? (
            <Text style={styles.mutedText}>Everyone in {selectedGroup.name} is settled up.</Text>
          ) : (
            ledger.suggestedSettlements.map((route, index) => {
              const from = personName(membersById.get(route.fromUserId));
              const to = personName(membersById.get(route.toUserId));
              return (
                <View key={`${route.fromUserId}-${route.toUserId}-${index}`} style={styles.row}>
                  <View style={{ flex: 1, gap: 4 }}>
                    <Text style={styles.rowTitle}>{from} pays {to}</Text>
                    <Text style={styles.mutedText}>{formatCurrency(route.amount, route.currency)}</Text>
                  </View>
                  {user?.id === route.fromUserId ? (
                    <Pressable
                      style={styles.primaryBtn}
                      onPress={() => settle(route.fromUserId, route.toUserId, route.amount, route.currency)}
                    >
                      <Text style={styles.primaryBtnText}>Settle</Text>
                    </Pressable>
                  ) : (
                    <Text style={styles.mutedText}>Waiting</Text>
                  )}
                </View>
              );
            })
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Group Balances</Text>
          {loadingLedger ? (
            <ActivityIndicator color={colors.accent} />
          ) : !selectedGroup ? (
            <Text style={styles.mutedText}>Pick a group to see each member balance.</Text>
          ) : (
            ledger?.balances.map((balance) => {
              const person = membersById.get(balance.userId);
              return (
                <View key={balance.userId} style={styles.row}>
                  <Text style={styles.rowTitle}>{personName(person)}</Text>
                  <Text style={{ color: balance.net >= 0 ? colors.success : colors.danger, fontWeight: "700" }}>
                    {balance.net >= 0 ? "+" : ""}{formatCurrency(balance.net, balance.currency)}
                  </Text>
                </View>
              );
            })
          )}
        </View>
      </ScrollView>
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
      gap: 12,
    },
    title: { color: colors.text, fontSize: 27, fontWeight: "800", letterSpacing: -0.4 },
    subtitle: { color: colors.textMuted, marginTop: 4, fontSize: 12 },
    manageBtn: {
      backgroundColor: colors.accentSoft,
      borderWidth: 1,
      borderColor: colors.accent,
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: 10,
    },
    manageBtnText: { color: colors.accent, fontWeight: "700", fontSize: 13 },
    card: {
      borderRadius: 18,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card,
      padding: 16,
      gap: 10,
    },
    cardTitle: { color: colors.text, fontSize: 16, fontWeight: "700" },
    mutedText: { color: colors.textMuted, fontSize: 12 },
    row: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      borderBottomWidth: 1,
      borderBottomColor: `${colors.border}66`,
      paddingVertical: 10,
      gap: 12,
    },
    rowTitle: { color: colors.text, fontWeight: "600" },
    groupChip: {
      borderRadius: 999,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.input,
      paddingHorizontal: 14,
      paddingVertical: 10,
    },
    groupChipActive: {
      borderColor: colors.accent,
      backgroundColor: colors.accentSoft,
    },
    groupChipText: {
      color: colors.textMuted,
      fontWeight: "700",
      fontSize: 12,
    },
    groupChipTextActive: {
      color: colors.accent,
    },
    primaryBtn: {
      backgroundColor: colors.accent,
      borderRadius: 10,
      paddingHorizontal: 14,
      paddingVertical: 10,
    },
    primaryBtnText: { color: "#fff", fontWeight: "700" },
  });
