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
import {
  getAnalytics,
  type AnalyticsPeriod,
  type AnalyticsPoint,
  type AnalyticsResponse,
} from '../../src/services/inventoryService';

const INV = '#E65100';
const { width: SCREEN_W } = Dimensions.get('window');
const CHART_H = 160;

const TABS: { label: string; period: AnalyticsPeriod; days: number }[] = [
  { label: 'Daily',   period: 'daily',   days: 14 },
  { label: 'Weekly',  period: 'weekly',  days: 84 },
  { label: 'Monthly', period: 'monthly', days: 365 },
];

type ChartMode = 'financial' | 'stock';

interface BarChartProps {
  data: AnalyticsPoint[];
  mode: ChartMode;
  colors: any;
}

function BarChart({ data, mode, colors }: BarChartProps) {
  if (data.length === 0) return null;

  const aVal = (p: AnalyticsPoint) => mode === 'financial' ? p.revenue : p.units_received;
  const bVal = (p: AnalyticsPoint) => mode === 'financial' ? p.expense : p.units_sold;
  const aColor = mode === 'financial' ? '#2E7D32' : '#1565C0';
  const bColor = mode === 'financial' ? '#C62828' : '#E65100';

  const maxVal = Math.max(...data.map(d => Math.max(aVal(d), bVal(d))), 1);
  const barW = Math.max(Math.floor((SCREEN_W - 64) / data.length) - 4, 10);

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
      <View style={{ paddingHorizontal: 8, paddingTop: 8 }}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', height: CHART_H, gap: 4 }}>
          {data.map((point, i) => {
            const aH = Math.max((aVal(point) / maxVal) * CHART_H, aVal(point) > 0 ? 2 : 0);
            const bH = Math.max((bVal(point) / maxVal) * CHART_H, bVal(point) > 0 ? 2 : 0);
            return (
              <View key={i} style={{ alignItems: 'center', width: barW + 4 }}>
                <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 2 }}>
                  <View style={{ width: barW / 2, height: aH, backgroundColor: aColor, borderRadius: 3 }} />
                  <View style={{ width: barW / 2, height: bH, backgroundColor: bColor, borderRadius: 3, opacity: 0.85 }} />
                </View>
              </View>
            );
          })}
        </View>
        <View style={{ flexDirection: 'row', marginTop: 6, gap: 4 }}>
          {data.map((point, i) => (
            <Text key={i} style={{ width: barW + 4, fontSize: 9, color: colors.textTertiary, textAlign: 'center' }} numberOfLines={1}>
              {point.label}
            </Text>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}

function Legend({ aLabel, bLabel, aColor, bColor }: { aLabel: string; bLabel: string; aColor: string; bColor: string }) {
  return (
    <View style={{ flexDirection: 'row', gap: 16, marginBottom: 12 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <View style={{ width: 12, height: 12, borderRadius: 2, backgroundColor: aColor }} />
        <Text style={{ fontSize: FontSize.xs, color: '#555' }}>{aLabel}</Text>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <View style={{ width: 12, height: 12, borderRadius: 2, backgroundColor: bColor, opacity: 0.85 }} />
        <Text style={{ fontSize: FontSize.xs, color: '#555' }}>{bLabel}</Text>
      </View>
    </View>
  );
}

export default function AnalyticsScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const [tab, setTab] = useState(0);

  const { period, days } = TABS[tab];

  const { data, isLoading, isRefetching, refetch } = useQuery<AnalyticsResponse>({
    queryKey: ['inventory-analytics', period, days],
    queryFn: () => getAnalytics(period, days),
  });

  const chart        = data?.chart ?? [];
  const summary      = data?.summary;
  const bestSellers  = data?.best_sellers ?? [];

  const totalRevenue = chart.reduce((s, d) => s + d.revenue, 0);
  const totalExpense = chart.reduce((s, d) => s + d.expense, 0);
  const totalProfit  = totalRevenue - totalExpense;
  const profitColor  = totalProfit >= 0 ? '#2E7D32' : '#C62828';
  const totalRecv    = chart.reduce((s, d) => s + d.units_received, 0);
  const totalSold    = chart.reduce((s, d) => s + d.units_sold, 0);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={[s.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 10, left: 10, bottom: 10, right: 10 }} accessibilityRole="button" accessibilityLabel="Go back">
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 16 }}>
          <Text style={{ fontSize: FontSize.lg, fontWeight: '800', color: colors.textPrimary }} accessibilityRole="header">Analytics</Text>
          <Text style={{ fontSize: FontSize.xs, color: colors.textSecondary, marginTop: 2 }}>Revenue, stock & best sellers</Text>
        </View>
      </View>

      {/* Period tabs */}
      <View style={[s.tabRow, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        {TABS.map((t, i) => (
          <TouchableOpacity
            key={t.period}
            onPress={() => setTab(i)}
            style={[s.tab, tab === i && { borderBottomColor: INV, borderBottomWidth: 2 }]}
            accessibilityRole="tab"
            accessibilityLabel={`${t.label} period`}
            accessibilityState={{ selected: tab === i }}
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
          {/* Stock value banner */}
          {summary && (
            <View style={[s.stockBanner, { backgroundColor: '#FFF3E0', borderColor: '#FFB74D' }]}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: FontSize.xs, fontWeight: '700', color: '#BF360C', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  Current Stock Value
                </Text>
                <Text style={{ fontSize: FontSize.xxl, fontWeight: '900', color: INV, marginTop: 4 }}>
                  ₦{summary.stock_value.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                </Text>
              </View>
              {summary.avg_profit_margin !== null && (
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={{ fontSize: FontSize.xs, color: '#BF360C' }}>Avg margin</Text>
                  <Text style={{ fontSize: FontSize.lg, fontWeight: '800', color: '#2E7D32' }}>
                    {summary.avg_profit_margin}%
                  </Text>
                </View>
              )}
            </View>
          )}

          {/* Financial summary cards */}
          <Text style={s.sectionTitle}>Financial Summary</Text>
          <View style={s.statsRow}>
            <View style={[s.statBox, { backgroundColor: '#E8F5E9' }]} accessible={true} accessibilityLabel={`Revenue: ₦${totalRevenue.toLocaleString()}`} accessibilityRole="text">
              <Text style={{ fontSize: FontSize.xs, color: '#2E7D32' }}>Revenue</Text>
              <Text style={{ fontSize: FontSize.md, fontWeight: '800', color: '#2E7D32', marginTop: 2 }}>
                ₦{totalRevenue.toLocaleString()}
              </Text>
            </View>
            <View style={[s.statBox, { backgroundColor: '#FFEBEE' }]} accessible={true} accessibilityLabel={`Expenses: ₦${totalExpense.toLocaleString()}`} accessibilityRole="text">
              <Text style={{ fontSize: FontSize.xs, color: '#C62828' }}>Expenses</Text>
              <Text style={{ fontSize: FontSize.md, fontWeight: '800', color: '#C62828', marginTop: 2 }}>
                ₦{totalExpense.toLocaleString()}
              </Text>
            </View>
            <View style={[s.statBox, { backgroundColor: totalProfit >= 0 ? '#E8F5E9' : '#FFEBEE' }]} accessible={true} accessibilityLabel={`Profit: ${totalProfit >= 0 ? '+' : ''}₦${Math.abs(totalProfit).toLocaleString()}`} accessibilityRole="text">
              <Text style={{ fontSize: FontSize.xs, color: profitColor }}>Profit</Text>
              <Text style={{ fontSize: FontSize.md, fontWeight: '800', color: profitColor, marginTop: 2 }}>
                {totalProfit >= 0 ? '+' : ''}₦{Math.abs(totalProfit).toLocaleString()}
              </Text>
            </View>
          </View>

          {/* Revenue vs Expenses chart */}
          {chart.length > 0 && (
            <View style={[s.chartBox, { backgroundColor: colors.surface }]}>
              <Legend aLabel="Revenue" bLabel="Expenses" aColor="#2E7D32" bColor="#C62828" />
              <BarChart data={chart} mode="financial" colors={colors} />
            </View>
          )}

          {/* Stock movement summary cards */}
          <Text style={[s.sectionTitle, { marginTop: 24 }]}>Stock Movement</Text>
          <View style={s.statsRow}>
            <View style={[s.statBox, { backgroundColor: '#E3F2FD' }]} accessible={true} accessibilityLabel={`Units received: ${totalRecv}`} accessibilityRole="text">
              <Text style={{ fontSize: FontSize.xs, color: '#1565C0' }}>Received</Text>
              <Text style={{ fontSize: FontSize.md, fontWeight: '800', color: '#1565C0', marginTop: 2 }}>{totalRecv}</Text>
              <Text style={{ fontSize: 9, color: '#64B5F6' }}>units in</Text>
            </View>
            <View style={[s.statBox, { backgroundColor: '#FFF3E0' }]} accessible={true} accessibilityLabel={`Units sold: ${totalSold}`} accessibilityRole="text">
              <Text style={{ fontSize: FontSize.xs, color: INV }}>Dispatched</Text>
              <Text style={{ fontSize: FontSize.md, fontWeight: '800', color: INV, marginTop: 2 }}>{totalSold}</Text>
              <Text style={{ fontSize: 9, color: '#FFCC80' }}>units out</Text>
            </View>
            <View style={[s.statBox, { backgroundColor: totalRecv >= totalSold ? '#E8F5E9' : '#FFEBEE' }]} accessible={true} accessibilityLabel={`Net stock change: ${totalRecv - totalSold}`} accessibilityRole="text">
              <Text style={{ fontSize: FontSize.xs, color: totalRecv >= totalSold ? '#2E7D32' : '#C62828' }}>Net</Text>
              <Text style={{ fontSize: FontSize.md, fontWeight: '800', color: totalRecv >= totalSold ? '#2E7D32' : '#C62828', marginTop: 2 }}>
                {totalRecv - totalSold >= 0 ? '+' : ''}{totalRecv - totalSold}
              </Text>
              <Text style={{ fontSize: 9, color: '#999' }}>units net</Text>
            </View>
          </View>

          {/* Stock movement chart */}
          {chart.length > 0 && (
            <View style={[s.chartBox, { backgroundColor: colors.surface }]}>
              <Legend aLabel="Received" bLabel="Dispatched" aColor="#1565C0" bColor="#E65100" />
              <BarChart data={chart} mode="stock" colors={colors} />
            </View>
          )}

          {chart.length === 0 && (
            <View style={{ alignItems: 'center', paddingVertical: 48 }}>
              <Ionicons name="bar-chart-outline" size={56} color={colors.textTertiary} />
              <Text style={{ fontSize: FontSize.md, fontWeight: '700', color: colors.textPrimary, marginTop: 14 }}>No data yet</Text>
              <Text style={{ fontSize: FontSize.sm, color: colors.textSecondary, marginTop: 6, textAlign: 'center' }}>
                Record sales, expenses, and stock movements to see trends here.
              </Text>
            </View>
          )}

          {/* Best sellers */}
          {bestSellers.length > 0 && (
            <>
              <Text style={[s.sectionTitle, { marginTop: 24 }]}>Best Sellers</Text>
              <View style={[s.card, { backgroundColor: colors.surface }]}>
                <View style={[s.tableHeader, { borderBottomColor: colors.border }]}>
                  <Text style={[s.tableHeaderCell, { flex: 2 }]}>Product</Text>
                  <Text style={[s.tableHeaderCell, { flex: 1, textAlign: 'right' }]}>Qty</Text>
                  <Text style={[s.tableHeaderCell, { flex: 1.5, textAlign: 'right' }]}>Revenue</Text>
                  <Text style={[s.tableHeaderCell, { flex: 1, textAlign: 'right' }]}>Margin</Text>
                </View>
                {bestSellers.map((bs, i) => (
                  <View key={i} style={[s.tableRow, { borderBottomColor: colors.border, borderBottomWidth: i < bestSellers.length - 1 ? 1 : 0 }]}>
                    <Text style={{ fontSize: FontSize.xs, color: colors.textPrimary, flex: 2 }} numberOfLines={1}>{bs.product_name}</Text>
                    <Text style={{ fontSize: FontSize.xs, color: '#1565C0', fontWeight: '700', flex: 1, textAlign: 'right' }}>{bs.total_qty}</Text>
                    <Text style={{ fontSize: FontSize.xs, color: '#2E7D32', fontWeight: '700', flex: 1.5, textAlign: 'right' }}>
                      ₦{Number(bs.total_revenue).toLocaleString()}
                    </Text>
                    <Text style={{ fontSize: FontSize.xs, flex: 1, textAlign: 'right', color: bs.profit_margin !== null ? (bs.profit_margin >= 0 ? '#2E7D32' : '#C62828') : colors.textTertiary }}>
                      {bs.profit_margin !== null ? `${bs.profit_margin}%` : '—'}
                    </Text>
                  </View>
                ))}
              </View>
            </>
          )}

          {/* Detailed breakdown table */}
          {chart.length > 0 && (
            <>
              <Text style={[s.sectionTitle, { marginTop: 24 }]}>Breakdown</Text>
              <View style={[s.card, { backgroundColor: colors.surface }]}>
                <View style={[s.tableHeader, { borderBottomColor: colors.border }]}>
                  <Text style={[s.tableHeaderCell, { width: 64 }]}>Period</Text>
                  <Text style={[s.tableHeaderCell, { flex: 1, textAlign: 'right' }]}>Revenue</Text>
                  <Text style={[s.tableHeaderCell, { flex: 1, textAlign: 'right' }]}>Expense</Text>
                  <Text style={[s.tableHeaderCell, { flex: 1, textAlign: 'right' }]}>Profit</Text>
                </View>
                {[...chart].reverse().slice(0, 10).map((point, i) => {
                  const profit = point.revenue - point.expense;
                  return (
                    <View key={i} style={[s.tableRow, { borderBottomColor: colors.border, borderBottomWidth: i < Math.min(chart.length, 10) - 1 ? 1 : 0 }]}>
                      <Text style={{ fontSize: FontSize.xs, color: colors.textSecondary, width: 64 }}>{point.label}</Text>
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
              </View>
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
  sectionTitle: {
    fontSize: FontSize.sm, fontWeight: '700', color: '#333', marginBottom: 10,
  },
  stockBanner: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: Radius.lg, padding: 16, marginBottom: 20, borderWidth: 1,
  },
  statsRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  statBox: { flex: 1, borderRadius: Radius.lg, padding: 12 },
  chartBox: { borderRadius: Radius.lg, padding: 12, overflow: 'hidden', marginBottom: 4 },
  card: { borderRadius: Radius.lg, overflow: 'hidden' },
  tableHeader: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 12, paddingVertical: 8, borderBottomWidth: 1,
  },
  tableHeaderCell: {
    fontSize: 10, fontWeight: '700', color: '#999', textTransform: 'uppercase', letterSpacing: 0.3,
  },
  tableRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 12, paddingVertical: 10,
  },
});
