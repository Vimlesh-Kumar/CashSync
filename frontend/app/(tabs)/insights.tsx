import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
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
  const { user } = useAuth();
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [stats, setStats] = useState<TransactionStats | null>(null);
  const [budgets, setBudgets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const summaryCurrency = normalizeCurrency(stats?.currency || user?.defaultCurrency);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    try {
      const [statsRes, budgetRes] = await Promise.all([
        getStats(user.id),
        getBudgets(user.id),
      ]);
      setStats(statsRes);
      setBudgets(budgetRes);
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

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.accent} />
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
});
