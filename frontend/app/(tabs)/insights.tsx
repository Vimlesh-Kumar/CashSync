import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { useAuth } from '@/src/context/AuthContext';
import { useAppTheme } from '@/src/context/ThemeContext';
import { getBudgets } from '@/src/features/budget';
import { getStats, TransactionStats } from '@/src/features/transaction';
import { formatCurrency, normalizeCurrency } from '@/src/lib/currency';

export default function InsightsScreen() {
  const { user, signOut } = useAuth();
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [stats, setStats] = useState<TransactionStats | null>(null);
  const [budgets, setBudgets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);

    try {
      const [statsRes, budgetRes] = await Promise.all([
        getStats(user.id),
        getBudgets(user.id),
      ]);
      setStats(statsRes);
      setBudgets(budgetRes);
    } catch (err: any) {
      setError(err.message || 'Failed to load insights');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void load();
  }, [load]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const summaryCurrency = normalizeCurrency(stats?.currency || user?.defaultCurrency);

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <LinearGradient colors={colors.gradient} style={StyleSheet.absoluteFill} />
        <View style={styles.errorCard}>
          <Ionicons name="alert-circle" size={48} color={colors.danger} />
          <Text style={styles.errorText}>{error}</Text>
          <Text style={styles.errorSubtext}>This session may have expired or the user no longer exists.</Text>
          <Pressable 
            style={styles.retryBtn} 
            onPress={() => signOut()}
          >
            <Text style={styles.retryBtnText}>Sign Out & Reset</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <LinearGradient colors={colors.gradient} style={StyleSheet.absoluteFill} />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.heading}>Insights</Text>

        <View style={styles.grid}>
          <MetricCard title="Income" value={formatCurrency(stats?.income || 0, summaryCurrency)} color={colors.success} styles={styles} />
          <MetricCard title="Expense" value={formatCurrency(stats?.expense || 0, summaryCurrency)} color={colors.danger} styles={styles} />
          <MetricCard title="Net" value={formatCurrency(stats?.net || 0, summaryCurrency)} color={colors.accent} styles={styles} />
          <MetricCard title="Budgets" value={String(budgets.length)} color={colors.textMuted} styles={styles} />
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Top Categories</Text>
          {(stats?.topCategories || []).map((item) => (
            <View key={item.name} style={styles.row}>
              <Text style={styles.rowLabel}>{item.name}</Text>
              <Text style={styles.rowValue}>{formatCurrency(item.total, summaryCurrency)}</Text>
            </View>
          ))}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Budget Alerts</Text>
          {budgets.length === 0 ? (
            <Text style={{ color: colors.textMuted }}>No budgets configured yet.</Text>
          ) : (
            budgets.map((budget) => (
              <View key={budget.id} style={styles.row}>
                <Text style={styles.rowLabel}>{budget.name}</Text>
                <Text style={[styles.rowValue, { color: budget.alert ? colors.danger : colors.success }]}>
                  {budget.usage.toFixed(1)}%
                </Text>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}

type MetricCardProps = Readonly<{
  title: string;
  value: string;
  color: string;
  styles: ReturnType<typeof createStyles>;
}>;

function MetricCard({
  title,
  value,
  color,
  styles,
}: MetricCardProps) {
  return (
    <View style={styles.metricCard}>
      <Text style={styles.metricTitle}>{title}</Text>
      <Text style={[styles.metricValue, { color }]}>{value}</Text>
    </View>
  );
}

const createStyles = (colors: ReturnType<typeof useAppTheme>["colors"]) => StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll: {
    paddingHorizontal: 18,
    paddingTop: Platform.OS === 'web' ? 40 : 58,
    paddingBottom: 110,
    maxWidth: 760,
    width: '100%',
    alignSelf: 'center',
    gap: 12,
  },
  heading: { color: colors.text, fontSize: 27, fontWeight: '800', marginBottom: 8 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  metricCard: {
    width: '48%',
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
  },
  metricTitle: { color: colors.textMuted, fontSize: 12, marginBottom: 6 },
  metricValue: { fontSize: 19, fontWeight: '800' },
  card: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    gap: 8,
  },
  cardTitle: { color: colors.text, fontWeight: '700', fontSize: 16, marginBottom: 2 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: colors.border + '80',
    paddingVertical: 8,
  },
  rowLabel: { color: colors.textMuted, fontWeight: '600' },
  rowValue: { color: colors.text, fontWeight: '700' },
  errorCard: {
    backgroundColor: colors.card,
    borderRadius: 24,
    padding: 32,
    width: "90%",
    maxWidth: 400,
    alignItems: "center",
    gap: 16,
    borderWidth: 1,
    borderColor: colors.border,
    ...Platform.select({
      web: { boxShadow: "0 20px 50px rgba(0,0,0,0.5)" },
      default: { shadowColor: "#000", shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.3, shadowRadius: 20, elevation: 10 },
    }),
  },
  errorText: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "700",
    textAlign: "center",
  },
  errorSubtext: {
    color: colors.textMuted,
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
  },
  retryBtn: {
    backgroundColor: colors.accent,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 24,
    marginTop: 8,
    width: "100%",
    alignItems: "center",
  },
  retryBtnText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
  },
});
