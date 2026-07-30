import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView,
  StyleSheet, ActivityIndicator, RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../src/hooks/useTheme';
import { FontSize, Radius, Shadow } from '../../src/theme';
import { getBestSellers } from '../../src/services/inventoryService';

const INV = '#E65100';
const PERIODS = [
  { label: '7 days',  days: 7 },
  { label: '30 days', days: 30 },
  { label: '90 days', days: 90 },
];

export default function BestSellersScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const [days, setDays] = useState(30);

  const { data, isLoading, isRefetching, refetch } = useQuery({
    queryKey: ['inventory-best-sellers', days],
    queryFn: () => getBestSellers(days, 10),
  });

  const maxQty = Math.max(...(data ?? []).map(d => d.total_qty), 1);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={[s.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 10, left: 10, bottom: 10, right: 10 }} accessibilityRole="button" accessibilityLabel="Go back">
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 16 }}>
          <Text style={{ fontSize: FontSize.lg, fontWeight: '800', color: colors.textPrimary }} accessibilityRole="header">Best Sellers</Text>
          <Text style={{ fontSize: FontSize.xs, color: colors.textSecondary, marginTop: 2 }}>Top products by units sold</Text>
        </View>
      </View>

      {/* Period tabs */}
      <View style={[s.tabRow, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        {PERIODS.map(p => (
          <TouchableOpacity
            key={p.days}
            onPress={() => setDays(p.days)}
            style={[s.tab, days === p.days && { borderBottomColor: INV, borderBottomWidth: 2 }]}
            accessibilityRole="tab"
            accessibilityLabel={`${p.label} period`}
            accessibilityState={{ selected: days === p.days }}
          >
            <Text style={{ fontSize: FontSize.sm, fontWeight: days === p.days ? '700' : '400', color: days === p.days ? INV : colors.textSecondary }}>
              {p.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {isLoading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color={INV} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: 16, paddingBottom: 60 }}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={INV} />}
          showsVerticalScrollIndicator={false}
        >
          {(data ?? []).length === 0 ? (
            <View style={{ alignItems: 'center', paddingVertical: 48 }}>
              <Ionicons name="podium-outline" size={56} color={colors.textTertiary} />
              <Text style={{ fontSize: FontSize.md, fontWeight: '700', color: colors.textPrimary, marginTop: 14 }}>No sales in this period</Text>
              <Text style={{ fontSize: FontSize.sm, color: colors.textSecondary, marginTop: 6, textAlign: 'center' }}>
                Record sales to see your top products here.
              </Text>
            </View>
          ) : (
            (data ?? []).map((item, index) => {
              const barWidth = (item.total_qty / maxQty) * 100;
              const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`;
              return (
                <View key={item.product_name} style={[s.card, { backgroundColor: colors.surface, ...Shadow.card(colors.black) }]}>
                  <View style={s.cardRow}>
                    <Text style={{ fontSize: index < 3 ? 22 : FontSize.md, width: 36, textAlign: 'center', color: colors.textSecondary, fontWeight: '700' }}>
                      {medal}
                    </Text>
                    <View style={{ flex: 1, marginLeft: 8 }}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                        <Text style={{ fontSize: FontSize.sm, fontWeight: '700', color: colors.textPrimary, flex: 1 }} numberOfLines={1}>
                          {item.product_name}
                        </Text>
                        <Text style={{ fontSize: FontSize.sm, fontWeight: '800', color: INV, marginLeft: 8 }}>
                          {item.total_qty} sold
                        </Text>
                      </View>
                      {/* Bar */}
                      <View style={[s.barTrack, { backgroundColor: colors.border }]}>
                        <View style={[s.barFill, { width: `${barWidth}%` as any, backgroundColor: index === 0 ? '#F9A825' : INV }]} />
                      </View>
                      <Text style={{ fontSize: FontSize.xs, color: colors.textSecondary, marginTop: 4 }}>
                        Revenue: ₦{Number(item.total_revenue).toLocaleString()}
                      </Text>
                    </View>
                  </View>
                </View>
              );
            })
          )}
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
  tabRow: {
    flexDirection: 'row', paddingHorizontal: 20, borderBottomWidth: 1,
  },
  tab: { marginRight: 24, paddingVertical: 12 },
  card: { borderRadius: Radius.lg, padding: 14, marginBottom: 10 },
  cardRow: { flexDirection: 'row', alignItems: 'center' },
  barTrack: { height: 6, borderRadius: 3, overflow: 'hidden' },
  barFill: { height: 6, borderRadius: 3 },
});
