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
import { getDashboard } from '../../src/services/inventoryService';

const INV = '#E65100';

function addDays(dateStr: string, n: number): string {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

export default function InventoryDashboardScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));

  const { data, isLoading, isRefetching, refetch } = useQuery({
    queryKey: ['inventory-dashboard', date],
    queryFn: () => getDashboard(date),
  });

  const profit = data ? parseFloat(data.profit) : 0;
  const profitColor = profit >= 0 ? '#2E7D32' : '#C62828';

  const goBack = () => setDate(prev => addDays(prev, -1));
  const goForward = () => {
    const next = addDays(date, 1);
    if (next <= new Date().toISOString().slice(0, 10)) setDate(next);
  };
  const isToday = date === new Date().toISOString().slice(0, 10);

  const formatDate = (d: string) => {
    const dt = new Date(d + 'T00:00:00');
    return dt.toLocaleDateString('en-NG', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={[s.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 10, left: 10, bottom: 10, right: 10 }} accessibilityRole="button" accessibilityLabel="Go back">
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 16 }}>
          <Text style={{ fontSize: FontSize.lg, fontWeight: '800', color: colors.textPrimary }} accessibilityRole="header">Daily Dashboard</Text>
          <Text style={{ fontSize: FontSize.xs, color: colors.textSecondary, marginTop: 2 }}>P&L · Stock · Alerts</Text>
        </View>
      </View>

      {/* Date nav */}
      <View style={[s.dateNav, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={goBack} style={s.navArrow} hitSlop={{ top: 10, left: 10, bottom: 10, right: 10 }} accessibilityRole="button" accessibilityLabel="Previous day">
          <Ionicons name="chevron-back" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={{ fontSize: FontSize.sm, fontWeight: '700', color: colors.textPrimary, textAlign: 'center', flex: 1 }}>
          {formatDate(date)}
        </Text>
        <TouchableOpacity onPress={goForward} style={[s.navArrow, { opacity: isToday ? 0.3 : 1 }]} disabled={isToday}
          hitSlop={{ top: 10, left: 10, bottom: 10, right: 10 }} accessibilityRole="button" accessibilityLabel="Next day">
          <Ionicons name="chevron-forward" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
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
          {/* P&L */}
          <Text style={[s.sectionLabel, { color: colors.textPrimary }]}>Profit & Loss</Text>
          <View style={s.row}>
            <StatCard label="Revenue" value={`₦${Number(data?.revenue ?? 0).toLocaleString()}`} icon="trending-up-outline" bg="#E8F5E9" iconColor="#2E7D32" colors={colors} />
            <StatCard label="Expenses" value={`₦${Number(data?.expenses ?? 0).toLocaleString()}`} icon="trending-down-outline" bg="#FFEBEE" iconColor="#C62828" colors={colors} />
          </View>
          <View style={[s.profitCard, { backgroundColor: profit >= 0 ? '#E8F5E9' : '#FFEBEE', ...Shadow.card(colors.black) }]}
            accessible={true} accessibilityLabel={`Net Profit: ${profit >= 0 ? '+' : ''}₦${Math.abs(profit).toLocaleString()}`} accessibilityRole="text">
            <Text style={{ fontSize: FontSize.sm, color: profitColor, fontWeight: '600' }}>Net Profit</Text>
            <Text style={{ fontSize: 28, fontWeight: '900', color: profitColor, marginTop: 4 }}>
              {profit >= 0 ? '+' : ''}₦{Math.abs(profit).toLocaleString()}
            </Text>
          </View>

          {/* Stock */}
          <Text style={[s.sectionLabel, { color: colors.textPrimary, marginTop: 20 }]}>Stock Snapshot</Text>
          <View style={s.row}>
            <StatCard label="Opening Stock" value={`${data?.opening_stock ?? 0} units`} icon="archive-outline" bg="#E3F2FD" iconColor="#1565C0" colors={colors} />
            <StatCard label="Closing Stock" value={`${data?.closing_stock ?? 0} units`} icon="checkmark-done-outline" bg="#FFF3E0" iconColor={INV} colors={colors} />
          </View>

          {/* Low stock alerts */}
          {(data?.low_stock_items ?? []).length > 0 && (
            <>
              <Text style={[s.sectionLabel, { color: colors.textPrimary, marginTop: 20 }]}>
                Low Stock Alerts <Text style={{ color: '#C62828' }}>({data!.low_stock_items.length})</Text>
              </Text>
              {data!.low_stock_items.map((item) => (
                <View key={item.id} style={[s.alertCard, { backgroundColor: '#FFF3E0', ...Shadow.card(colors.black) }]}
                  accessible={true} accessibilityLabel={`${item.name}: low stock, ${item.quantity} remaining`} accessibilityRole="text">
                  <Ionicons name="warning-outline" size={18} color={INV} accessible={false} importantForAccessibility="no" />
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={{ fontSize: FontSize.sm, fontWeight: '700', color: colors.textPrimary }}>{item.name}</Text>
                    <Text style={{ fontSize: FontSize.xs, color: INV, marginTop: 2 }}>Only {item.quantity} left in stock</Text>
                  </View>
                </View>
              ))}
            </>
          )}

          {/* Expiry alerts */}
          {(data?.expiring_soon_items ?? []).length > 0 && (
            <>
              <Text style={[s.sectionLabel, { color: colors.textPrimary, marginTop: 20 }]}>
                Expiry Alerts{' '}
                <Text style={{ color: data!.expiring_soon_items.some(i => i.urgent) ? '#C62828' : INV }}>
                  ({data!.expiring_soon_items.length})
                </Text>
              </Text>
              {data!.expiring_soon_items.map((item) => {
                const bg    = item.urgent ? '#FFEBEE' : '#FFF3E0';
                const color = item.urgent ? '#C62828' : INV;
                const icon  = item.urgent ? 'alert-circle-outline' : 'time-outline';
                const label = item.days_left === 0
                  ? 'Expires today!'
                  : item.days_left === 1
                    ? 'Expires tomorrow'
                    : `Expires in ${item.days_left} days`;
                const fmtDate = new Date(item.expiry_date + 'T00:00:00')
                  .toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' });
                return (
                  <View key={item.id} style={[s.alertCard, { backgroundColor: bg, ...Shadow.card(colors.black) }]}>
                    <Ionicons name={icon as any} size={18} color={color} />
                    <View style={{ flex: 1, marginLeft: 10 }}>
                      <Text style={{ fontSize: FontSize.sm, fontWeight: '700', color: colors.textPrimary }}>{item.name}</Text>
                      <Text style={{ fontSize: FontSize.xs, color, marginTop: 2 }}>
                        {label} · {fmtDate}
                      </Text>
                    </View>
                    {item.urgent && (
                      <View style={{ backgroundColor: '#C62828', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3 }}>
                        <Text style={{ fontSize: 10, color: '#fff', fontWeight: '800' }}>URGENT</Text>
                      </View>
                    )}
                  </View>
                );
              })}
            </>
          )}

          {/* Quick links */}
          <Text style={[s.sectionLabel, { color: colors.textPrimary, marginTop: 24 }]}>Quick Actions</Text>
          <View style={s.row}>
            <QuickLink icon="cart-outline" label="Record Sale" onPress={() => router.push('/inventory/new-sale' as any)} colors={colors} />
            <QuickLink icon="time-outline" label="Sales History" onPress={() => router.push('/inventory/sales' as any)} colors={colors} />
          </View>
          <View style={[s.row, { marginTop: 0 }]}>
            <QuickLink icon="receipt-outline" label="Log Expense" onPress={() => router.push('/inventory/expenses' as any)} colors={colors} />
            <QuickLink icon="people-outline" label="Customers" onPress={() => router.push('/inventory/customers' as any)} colors={colors} />
          </View>
          <View style={[s.row, { marginTop: 0 }]}>
            <QuickLink icon="podium-outline" label="Best Sellers" onPress={() => router.push('/inventory/best-sellers' as any)} colors={colors} />
            <QuickLink icon="bar-chart-outline" label="Analytics" onPress={() => router.push('/inventory/analytics' as any)} colors={colors} />
          </View>
          <View style={[s.row, { marginTop: 0 }]}>
            <QuickLink icon="business-outline" label="Business Profile" onPress={() => router.push('/inventory/business' as any)} colors={colors} />
            <View style={{ flex: 1 }} />
          </View>
        </ScrollView>
      )}
    </View>
  );
}

function StatCard({ label, value, icon, bg, iconColor, colors }: any) {
  return (
    <View style={[s.statCard, { backgroundColor: bg, flex: 1 }]} accessible={true} accessibilityLabel={`${label}: ${value}`} accessibilityRole="text">
      <Ionicons name={icon} size={20} color={iconColor} accessible={false} importantForAccessibility="no" />
      <Text style={{ fontSize: FontSize.xs, color: '#555', marginTop: 6 }}>{label}</Text>
      <Text style={{ fontSize: FontSize.md, fontWeight: '800', color: '#111', marginTop: 2 }}>{value}</Text>
    </View>
  );
}

function QuickLink({ icon, label, onPress, colors }: any) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.8}
      style={[s.quickLink, { backgroundColor: colors.surface, ...Shadow.card(colors.black), flex: 1 }]}
      accessibilityRole="button" accessibilityLabel={label}>
      <Ionicons name={icon} size={22} color={INV} />
      <Text style={{ fontSize: FontSize.xs, fontWeight: '700', color: colors.textPrimary, marginTop: 6, textAlign: 'center' }}>{label}</Text>
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 56, paddingBottom: 18, borderBottomWidth: 1,
  },
  dateNav: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 12, borderBottomWidth: 1,
  },
  navArrow: { padding: 4 },
  sectionLabel: { fontSize: FontSize.sm, fontWeight: '700', marginBottom: 10 },
  row: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  statCard: { borderRadius: Radius.lg, padding: 16 },
  profitCard: { borderRadius: Radius.lg, padding: 20, alignItems: 'center' },
  alertCard: { flexDirection: 'row', alignItems: 'center', borderRadius: Radius.lg, padding: 14, marginBottom: 8 },
  quickLink: { borderRadius: Radius.lg, padding: 16, alignItems: 'center' },
});
