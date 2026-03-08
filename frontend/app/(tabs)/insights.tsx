import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { useAuth } from '@/src/context/AuthContext';
import { getBudgets } from '@/src/features/budget';
import { getStats, TransactionStats } from '@/src/features/transaction';

const BG = '#0D1117';
const CARD_BG = '#161D2C';
const BORDER = '#1E2D46';
const ACCENT = '#4F8EF7';
const GREEN = '#34D399';
const RED = '#F87171';
const TEXT_DIM = '#8B9AB3';

export default function InsightsScreen() {
  const { user } = useAuth();
  const [stats, setStats] = useState<TransactionStats | null>(null);
  const [budgets, setBudgets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    Promise.all([getStats(user.id), getBudgets(user.id)])
      .then(([statsRes, budgetRes]) => {
        setStats(statsRes);
        setBudgets(budgetRes);
      })
      .finally(() => setLoading(false));
  }, [user]);

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: BG }]}> 
        <ActivityIndicator color={ACCENT} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: BG }}>
      <LinearGradient colors={[BG, '#111827', BG]} style={StyleSheet.absoluteFill} />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.heading}>Insights</Text>

        <View style={styles.grid}>
          <MetricCard title="Income" value={`₹${(stats?.income || 0).toLocaleString('en-IN')}`} color={GREEN} />
          <MetricCard title="Expense" value={`₹${(stats?.expense || 0).toLocaleString('en-IN')}`} color={RED} />
          <MetricCard title="Net" value={`₹${(stats?.net || 0).toLocaleString('en-IN')}`} color={ACCENT} />
          <MetricCard title="Budgets" value={String(budgets.length)} color={TEXT_DIM} />
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Top Categories</Text>
          {(stats?.topCategories || []).map((item) => (
            <View key={item.name} style={styles.row}>
              <Text style={styles.rowLabel}>{item.name}</Text>
              <Text style={styles.rowValue}>₹{item.total.toLocaleString('en-IN')}</Text>
            </View>
          ))}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Budget Alerts</Text>
          {budgets.length === 0 ? (
            <Text style={{ color: TEXT_DIM }}>No budgets configured yet.</Text>
          ) : (
            budgets.map((budget) => (
              <View key={budget.id} style={styles.row}>
                <Text style={styles.rowLabel}>{budget.name}</Text>
                <Text style={[styles.rowValue, { color: budget.alert ? RED : GREEN }]}>
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

function MetricCard({
  title,
  value,
  color,
}: {
  title: string;
  value: string;
  color: string;
}) {
  return (
    <View style={styles.metricCard}>
      <Text style={styles.metricTitle}>{title}</Text>
      <Text style={[styles.metricValue, { color }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
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
  heading: { color: '#fff', fontSize: 27, fontWeight: '800', marginBottom: 8 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  metricCard: {
    width: '48%',
    backgroundColor: CARD_BG,
    borderColor: BORDER,
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
  },
  metricTitle: { color: TEXT_DIM, fontSize: 12, marginBottom: 6 },
  metricValue: { fontSize: 19, fontWeight: '800' },
  card: {
    backgroundColor: CARD_BG,
    borderColor: BORDER,
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    gap: 8,
  },
  cardTitle: { color: '#fff', fontWeight: '700', fontSize: 16, marginBottom: 2 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: BORDER + '80',
    paddingVertical: 8,
  },
  rowLabel: { color: TEXT_DIM, fontWeight: '600' },
  rowValue: { color: '#fff', fontWeight: '700' },
});
