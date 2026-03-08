import { LinearGradient } from 'expo-linear-gradient';
import React, { useCallback, useEffect, useState } from 'react';
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { createBudget, getBudgets } from '@/src/features/budget';
import { createCategory, getCategories } from '@/src/features/category';
import { useAuth } from '@/src/context/AuthContext';

const BG = '#0D1117';
const CARD_BG = '#161D2C';
const BORDER = '#1E2D46';
const ACCENT = '#4F8EF7';
const RED = '#F87171';
const TEXT_DIM = '#8B9AB3';

export default function ProfileScreen() {
  const { user, signOut } = useAuth();
  const [categories, setCategories] = useState<any[]>([]);
  const [budgets, setBudgets] = useState<any[]>([]);
  const [categoryName, setCategoryName] = useState('');
  const [budgetName, setBudgetName] = useState('Food Budget');
  const [budgetAmount, setBudgetAmount] = useState('5000');

  const load = useCallback(async () => {
    if (!user) return;
    const [cats, buds] = await Promise.all([
      getCategories(user.id),
      getBudgets(user.id),
    ]);
    setCategories(cats);
    setBudgets(buds);
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  if (!user) return null;

  return (
    <View style={{ flex: 1, backgroundColor: BG }}>
      <LinearGradient colors={[BG, '#111827', BG]} style={StyleSheet.absoluteFill} />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.heading}>Profile</Text>

        <View style={styles.card}>
          <Text style={styles.title}>{user.name || 'CashSync User'}</Text>
          <Text style={styles.subtitle}>{user.email}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.title}>Custom Categories</Text>
          <TextInput
            style={styles.input}
            placeholder="Category name"
            placeholderTextColor={TEXT_DIM}
            value={categoryName}
            onChangeText={setCategoryName}
          />
          <Pressable
            style={styles.primaryBtn}
            onPress={async () => {
              if (!categoryName.trim()) return;
              await createCategory({ userId: user.id, name: categoryName.trim() });
              setCategoryName('');
              await load();
            }}
          >
            <Text style={styles.primaryText}>Add Category</Text>
          </Pressable>

          {categories.map((category) => (
            <Text key={category.id} style={styles.listItem}>
              {category.icon ? `${category.icon} ` : ''}
              {category.name}
            </Text>
          ))}
        </View>

        <View style={styles.card}>
          <Text style={styles.title}>Monthly Budget</Text>
          <TextInput
            style={styles.input}
            placeholder="Budget name"
            placeholderTextColor={TEXT_DIM}
            value={budgetName}
            onChangeText={setBudgetName}
          />
          <TextInput
            style={styles.input}
            placeholder="Amount"
            placeholderTextColor={TEXT_DIM}
            keyboardType="numeric"
            value={budgetAmount}
            onChangeText={setBudgetAmount}
          />
          <Pressable
            style={styles.primaryBtn}
            onPress={async () => {
              const amount = Number.parseFloat(budgetAmount);
              if (!budgetName.trim() || Number.isNaN(amount) || amount <= 0) return;
              await createBudget({
                userId: user.id,
                name: budgetName.trim(),
                amount,
                monthStart: new Date().toISOString(),
              });
              await load();
            }}
          >
            <Text style={styles.primaryText}>Create Budget</Text>
          </Pressable>

          {budgets.map((budget) => (
            <Text key={budget.id} style={styles.listItem}>
              {budget.name}: ₹{budget.amount.toLocaleString('en-IN')} ({budget.usage.toFixed(1)}%)
            </Text>
          ))}
        </View>

        <Pressable style={styles.signOutBtn} onPress={signOut}>
          <Text style={styles.signOutText}>Sign Out</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingHorizontal: 18,
    paddingTop: Platform.OS === 'web' ? 40 : 58,
    paddingBottom: 110,
    maxWidth: 760,
    width: '100%',
    alignSelf: 'center',
    gap: 14,
  },
  heading: { color: '#fff', fontSize: 27, fontWeight: '800' },
  card: {
    backgroundColor: CARD_BG,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 14,
    padding: 14,
    gap: 10,
  },
  title: { color: '#fff', fontWeight: '700', fontSize: 16 },
  subtitle: { color: TEXT_DIM, fontSize: 13 },
  input: {
    backgroundColor: BG,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 10,
    color: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  primaryBtn: {
    backgroundColor: ACCENT,
    borderRadius: 10,
    paddingVertical: 11,
    alignItems: 'center',
  },
  primaryText: { color: '#fff', fontWeight: '700' },
  listItem: { color: TEXT_DIM, fontSize: 13 },
  signOutBtn: {
    backgroundColor: RED + '22',
    borderWidth: 1,
    borderColor: RED + '66',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  signOutText: { color: RED, fontWeight: '700' },
});
