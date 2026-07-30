import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView,
  TextInput, StyleSheet, Alert, ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../src/hooks/useTheme';
import { FontSize, Radius, Shadow } from '../../src/theme';
import { createCategory } from '../../src/services/inventoryService';

const TEMPLATES = [
  { emoji: '🛒', label: 'Provisions / Groceries' },
  { emoji: '👗', label: 'Clothes & Fashion' },
  { emoji: '📱', label: 'Electronics' },
  { emoji: '🍲', label: 'Food & Cooked Meals' },
  { emoji: '💄', label: 'Beauty & Cosmetics' },
  { emoji: '🏗️', label: 'Building Materials' },
  { emoji: '💊', label: 'Pharmacy / Medicine' },
  { emoji: '🚗', label: 'Auto Parts & Vehicles' },
  { emoji: '📚', label: 'Books & Stationery' },
  { emoji: '🌾', label: 'Farm Produce' },
  { emoji: '🪑', label: 'Furniture & Household' },
  { emoji: '📦', label: 'Other Goods' },
];

export default function CreateCategoryScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const qc = useQueryClient();
  const [customName, setCustomName] = useState('');
  const [showCustom, setShowCustom] = useState(false);

  const { mutate, isPending } = useMutation({
    mutationFn: (name: string) => createCategory({ name }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['inventory-categories'] });
      router.back();
    },
    onError: () => Alert.alert('Error', 'Could not save. Please try again.'),
  });

  const pick = (name: string) => {
    if (name === 'Other Goods') {
      setShowCustom(true);
      return;
    }
    mutate(name);
  };

  const saveCustom = () => {
    const n = customName.trim();
    if (!n) return Alert.alert('Required', 'Please enter what you sell.');
    mutate(n);
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Header */}
      <View style={[s.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 10, left: 10, bottom: 10, right: 10 }} accessibilityRole="button" accessibilityLabel="Go back">
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <View style={{ marginLeft: 16 }}>
          <Text style={{ fontSize: FontSize.lg, fontWeight: '800', color: colors.textPrimary }} accessibilityRole="header">
            What do you sell?
          </Text>
          <Text style={{ fontSize: FontSize.xs, color: colors.textSecondary, marginTop: 2 }}>
            Pick a category to get started
          </Text>
        </View>
      </View>

      {isPending ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color="#E65100" />
          <Text style={{ color: colors.textSecondary, marginTop: 12, fontSize: FontSize.sm }}>Saving…</Text>
        </View>
      ) : showCustom ? (
        /* ── Custom name input ── */
        <View style={{ padding: 24 }}>
          <Text style={{ fontSize: FontSize.md, fontWeight: '700', color: colors.textPrimary, marginBottom: 6 }}>
            What type of goods do you sell?
          </Text>
          <Text style={{ fontSize: FontSize.sm, color: colors.textSecondary, marginBottom: 20 }}>
            Write it in your own words — e.g. "Recharge cards", "Baby clothes", "Spare parts"
          </Text>
          <TextInput
            value={customName}
            onChangeText={setCustomName}
            placeholder="Enter what you sell..."
            placeholderTextColor={colors.textTertiary}
            autoFocus
            style={[s.textInput, { backgroundColor: colors.surface, borderColor: '#E65100', color: colors.textPrimary }]}
            accessibilityLabel="Category name"
          />
          <TouchableOpacity
            onPress={saveCustom}
            style={[s.bigBtn, { backgroundColor: '#E65100' }]}
            activeOpacity={0.85}
            accessibilityRole="button" accessibilityLabel="Add new category"
          >
            <Text style={{ color: '#fff', fontWeight: '800', fontSize: FontSize.md }}>Continue →</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setShowCustom(false)} style={{ marginTop: 16, alignItems: 'center' }} accessibilityRole="button" accessibilityLabel="Go back to categories">
            <Text style={{ color: colors.textSecondary, fontSize: FontSize.sm }}>← Go back</Text>
          </TouchableOpacity>
        </View>
      ) : (
        /* ── Template grid ── */
        <ScrollView contentContainerStyle={s.grid} showsVerticalScrollIndicator={false}>
          {TEMPLATES.map(({ emoji, label }) => (
            <TouchableOpacity
              key={label}
              onPress={() => pick(label)}
              style={[s.tile, { backgroundColor: colors.surface, ...Shadow.card(colors.black) }]}
              activeOpacity={0.78}
              accessibilityRole="button" accessibilityLabel={`Add new category: ${label}`}
            >
              <Text style={s.tileEmoji}>{emoji}</Text>
              <Text style={[s.tileLabel, { color: colors.textPrimary }]} numberOfLines={2}>
                {label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 56, paddingBottom: 18, borderBottomWidth: 1,
  },
  grid: {
    flexDirection: 'row', flexWrap: 'wrap',
    paddingHorizontal: 16, paddingTop: 20, paddingBottom: 60, gap: 12,
  },
  tile: {
    width: '47%', borderRadius: Radius.lg,
    paddingVertical: 22, paddingHorizontal: 12,
    alignItems: 'center',
  },
  tileEmoji: { fontSize: 36, marginBottom: 10 },
  tileLabel: { fontSize: FontSize.sm, fontWeight: '600', textAlign: 'center', lineHeight: 18 },
  textInput: {
    borderWidth: 2, borderRadius: Radius.md,
    paddingHorizontal: 16, paddingVertical: 14,
    fontSize: FontSize.md, marginBottom: 20,
  },
  bigBtn: {
    paddingVertical: 16, borderRadius: Radius.lg,
    alignItems: 'center', justifyContent: 'center',
  },
});
