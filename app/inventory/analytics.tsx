import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView,
  StyleSheet, ActivityIndicator, RefreshControl, Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../src/hooks/useTheme';
import { FontSize, Radius } from '../../src/theme';
import { getAnalytics, type AnalyticsPeriod, type AnalyticsPoint } from '../../src/services/inventoryService';

const INV = '#E65100';
const { width: SCREEN_W } = Dimensions.get('window');
const CHART_H = 180;

const TABS: { label: string; period: AnalyticsPeriod; days: number }[] = [
  { label: 'Daily',   period: 'daily',   days: 14 },
  { label: 'Weekly',  period: 'weekly',  days: 84 },
  { label: 'Monthly', period: 'monthly', days: 365 },
];

function BarChart({ data, colors }: { data: AnalyticsPoint[]; colors: any }) {
  if (data.length === 0) return null;

  const maxVal = Math.max(...data.map(d => Math.max(d.revenue, d.expense)), 1);
  const barW = Math.max(Math.floor((SCREEN_W - 64) / data.length) - 4, 10);

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
      <View style={{ paddingHorizontal: 8, paddingTop: 8 }}>
        {/* Bars */}
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', height: CHART_H, gap: 4 }}>
          {data.map((point, i) => {
            const revH = Math.max((point.revenue / maxVal) * CHART_H, 2);
            const expH = Math.max((point.expense / maxVal) * CHART_H, point.expense > 0 ? 2 : 0);
            return (
              <View key={i} style={{ alignItems: 'center', width: barW + 4 }}>
                <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 2 }}>
                  <View style={{ width: barW / 2, height: revH, backgroundColor: '#2E7D32', borderRadius: 3 }} />
                  <View style={{ width: barW / 2, height: expH, backgroundColor: '#C62828', borderRadius: 3, opacity: 0.8 }} />
                </View>
              </View>
            );
          })}
        </View>
        {/* Labels */}
        <View style={{ flexDirection: 'row', marginTop: 6, gap: 4 }}>
          {data.map((point, i) => (
            <Text key={i} style={{
              width: barW + 4, fontSize: 9, color: colors.textTertiary,
              textAlign: 'center',
            }} numberOfLines={1}>
              {point.label}
            </Text>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}

export default function AnalyticsScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const [tab, setTab] = useState(0);

  const { period, days } = TABS[tab];

  const { data, isLoading, isRefetching, refetch } = useQuery({
    queryKey: ['inventory-analytics', period, days],
    queryFn: () => getAnalytics(period, days),
  });

  const totalRevenue = (data ?? []).reduce((s, d) => s + d.revenue, 0);
  const totalExpense = (data ?? []).reduce((s, d) => s + d.expense, 0);
  const totalProfit  = totalRevenue - totalExpense;
  const profitColor  = totalProfit >= 0 ? '#2E7D32' : '#C62828';

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={[s.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 10, left: 10, bottom: 10, right: 10 }}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 16 }}>
          <Text style={{ fontSize: FontSize.lg, fontWeight: '800', color: colors.textPrimary }}>Revenue Analytics</Text>
          <Text style={{ fontSize: FontSize.xs, color: colors.textSecondary, marginTop: 2 }}>Revenue vs Expenses over time</Text>
        </View>
      </View>

      {/* Period tabs */}
      <View style={[s.tabRow, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        {TABS.map((t, i) => (
          <TouchableOpacity
            key={t.period}
            onPress={() => setTab(i)}
            style={[s.tab, tab === i && { borderBottomColor: INV, borderBottomWidth: 2 }]}
          >
            <Text style={{ fontSize: FontSize.sm, fontWeight: tab === i ? '700' : '400', color: tab === i ? INV : colors.textSecondary }}>
              {t.label}
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
          {/* Summary cards */}
          <View style={s.statsRow}>
            <View style={[s.statBox, { backgroundColor: '#E8F5E9' }]}>
              <Text style={{ fontSize: FontSize.xs, color: '#2E7D32' }}>Revenue</Text>
              <Text style={{ fontSize: FontSize.md, fontWeight: '800', color: '#2E7D32', marginTop: 2 }}>
                ₦{totalRevenue.toLocaleString()}
              </Text>
            </View>
            <View style={[s.statBox, { backgroundColor: '#FFEBEE' }]}>
              <Text style={{ fontSize: FontSize.xs, color: '#C62828' }}>Expenses</Text>
              <Text style={{ fontSize: FontSize.md, fontWeight: '800', color: '#C62828', marginTop: 2 }}>
                ₦{totalExpense.toLocaleString()}
              </Text>
            </View>
            <View style={[s.statBox, { backgroundColor: totalProfit >= 0 ? '#E8F5E9' : '#FFEBEE' }]}>
              <Text style={{ fontSize: FontSize.xs, color: profitColor }}>Profit</Text>
              <Text style={{ fontSize: FontSize.md, fontWeight: '800', color: profitColor, marginTop: 2 }}>
                {totalProfit >= 0 ? '+' : ''}₦{Math.abs(totalProfit).toLocaleString()}
              </Text>
            </View>
          </View>

          {/* Legend */}
          <View style={{ flexDirection: 'row', gap: 16, marginBottom: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <View style={{ width: 12, height: 12, borderRadius: 2, backgroundColor: '#2E7D32' }} />
              <Text style={{ fontSize: FontSize.xs, color: colors.textSecondary }}>Revenue</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <View style={{ width: 12, height: 12, borderRadius: 2, backgroundColor: '#C62828', opacity: 0.8 }} />
              <Text style={{ fontSize: FontSize.xs, color: colors.textSecondary }}>Expenses</Text>
            </View>
          </View>

          {/* Bar chart */}
          {(data ?? []).length === 0 ? (
            <View style={{ alignItems: 'center', paddingVertical: 48 }}>
              <Ionicons name="bar-chart-outline" size={56} color={colors.textTertiary} />
              <Text style={{ fontSize: FontSize.md, fontWeight: '700', color: colors.textPrimary, marginTop: 14 }}>No data yet</Text>
              <Text style={{ fontSize: FontSize.sm, color: colors.textSecondary, marginTop: 6, textAlign: 'center' }}>
                Record sales and expenses to see your trends here.
              </Text>
            </View>
          ) : (
            <View style={[s.chartBox, { backgroundColor: colors.surface }]}>
              <BarChart data={data ?? []} colors={colors} />
            </View>
          )}

          {/* Data table */}
          {(data ?? []).length > 0 && (
            <>
              <Text style={{ fontSize: FontSize.sm, fontWeight: '700', color: colors.textPrimary, marginTop: 20, marginBottom: 10 }}>
                Breakdown
              </Text>
              {[...(data ?? [])].reverse().slice(0, 10).map((point, i) => {
                const profit = point.revenue - point.expense;
                return (
                  <View key={i} style={[s.tableRow, { borderBottomColor: colors.border }]}>
                    <Text style={{ fontSize: FontSize.xs, color: colors.textSecondary, width: 70 }}>{point.label}</Text>
                    <Text style={{ fontSize: FontSize.xs, color: '#2E7D32', fontWeight: '700', flex: 1, textAlign: 'right' }}>
                      ₦{point.revenue.toLocaleString()}
                    </Text>
                    <Text style={{ fontSize: FontSize.xs, color: '#C62828', flex: 1, textAlign: 'right' }}>
                      ₦{point.expense.toLocaleString()}
                    </Text>
                    <Text style={{ fontSize: FontSize.xs, fontWeight: '700', color: profit >= 0 ? '#2E7D32' : '#C62828', flex: 1, textAlign: 'right' }}>
                      {profit >= 0 ? '+' : ''}₦{Math.abs(profit).toLocaleString()}
                    </Text>
                  </View>
                );
              })}
            </>
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
  statsRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  statBox: { flex: 1, borderRadius: Radius.lg, padding: 12 },
  chartBox: { borderRadius: Radius.lg, padding: 12, overflow: 'hidden' },
  tableRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 10, borderBottomWidth: 1,
  },
});
