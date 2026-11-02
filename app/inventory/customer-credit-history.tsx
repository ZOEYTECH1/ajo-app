/**
 * Customer Credit History
 * Paginated log of every charge/payment recorded against one customer's
 * credit balance -- the running `credit_balance` number itself has no
 * history of its own, this screen is the permanent record of how it got
 * there (mirrors how stock movements log every quantity change).
 */
import {
  View, Text, TouchableOpacity, ScrollView,
  StyleSheet, ActivityIndicator, RefreshControl,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useInfiniteQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../src/hooks/useTheme';
import { FontSize, Radius, Shadow } from '../../src/theme';
import { getCreditHistoryPage, type InventoryCreditEntry } from '../../src/services/inventoryService';

const INV = '#E65100';

export default function CustomerCreditHistoryScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { id, name } = useLocalSearchParams<{ id: string; name?: string }>();
  const custId = Number(id);

  const {
    data, isLoading, isRefetching, refetch,
    fetchNextPage, hasNextPage, isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ['inventory-customer-credit-history', custId],
    queryFn: ({ pageParam }) => getCreditHistoryPage(custId, pageParam as string | null),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.next ?? undefined,
    enabled: !!custId,
  });

  const entries = data?.pages.flatMap(p => p.results) ?? [];

  const fmt = (iso: string) =>
    new Date(iso).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' });

  const fmtTime = (iso: string) =>
    new Date(iso).toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit' });

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={[s.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 10, left: 10, bottom: 10, right: 10 }} accessibilityRole="button" accessibilityLabel="Go back">
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 16 }}>
          <Text style={{ fontSize: FontSize.lg, fontWeight: '800', color: colors.textPrimary }} accessibilityRole="header">Credit History</Text>
          <Text style={{ fontSize: FontSize.xs, color: colors.textSecondary, marginTop: 2 }}>
            {name ?? 'This customer'}
          </Text>
        </View>
      </View>

      {isLoading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color={INV} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: 16, paddingBottom: 60 }}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={INV} />}
        >
          {entries.length === 0 ? (
            <View style={{ alignItems: 'center', paddingVertical: 60 }}>
              <Ionicons name="time-outline" size={56} color={colors.border} />
              <Text style={{ fontSize: FontSize.md, fontWeight: '700', color: colors.textPrimary, marginTop: 16 }}>
                No credit activity yet
              </Text>
              <Text style={{ fontSize: FontSize.sm, color: colors.textSecondary, marginTop: 6, textAlign: 'center' }}>
                Charges and payments for this customer will appear here.
              </Text>
            </View>
          ) : (
            <>
              {entries.map(entry => (
                <CreditEntryCard key={entry.id} entry={entry} colors={colors} fmt={fmt} fmtTime={fmtTime} />
              ))}
              {hasNextPage && (
                <TouchableOpacity
                  onPress={() => fetchNextPage()}
                  disabled={isFetchingNextPage}
                  style={{ alignItems: 'center', paddingVertical: 20 }}
                  accessibilityRole="button"
                  accessibilityLabel="Load more credit history"
                >
                  {isFetchingNextPage
                    ? <ActivityIndicator color={INV} />
                    : <Text style={{ color: INV, fontWeight: '700', fontSize: FontSize.sm }}>Load More</Text>
                  }
                </TouchableOpacity>
              )}
            </>
          )}
        </ScrollView>
      )}
    </View>
  );
}

function CreditEntryCard({
  entry, colors, fmt, fmtTime,
}: {
  entry: InventoryCreditEntry;
  colors: any;
  fmt: (iso: string) => string;
  fmtTime: (iso: string) => string;
}) {
  const isCharge = entry.direction === 'charge';
  const accentColor = isCharge ? '#C62828' : '#2E7D32';
  const accentBg    = isCharge ? '#FFEBEE' : '#E8F5E9';
  const icon        = isCharge ? 'add-circle-outline' : 'checkmark-circle-outline';
  const amount = parseFloat(entry.amount || '0');
  const balanceAfter = parseFloat(entry.balance_after || '0');

  return (
    <View style={[s.card, { backgroundColor: colors.surface, borderColor: colors.border, ...Shadow.card(colors.black) }]}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <View style={[s.dirIcon, { backgroundColor: accentBg }]}>
          <Ionicons name={icon} size={20} color={accentColor} />
        </View>
        <View style={{ flex: 1, marginLeft: 10 }}>
          <Text style={{ fontSize: FontSize.xs, color: colors.textSecondary, fontWeight: '600' }}>
            {isCharge ? 'CHARGED' : 'PAYMENT RECEIVED'}
          </Text>
          <Text style={{ fontSize: FontSize.sm, fontWeight: '800', color: accentColor, marginTop: 1 }}>
            {isCharge ? '+' : '-'}₦{amount.toLocaleString('en-NG', { minimumFractionDigits: 2 })}
          </Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={{ fontSize: FontSize.xs, color: colors.textSecondary }}>{fmt(entry.recorded_at)}</Text>
          <Text style={{ fontSize: 10, color: colors.textTertiary, marginTop: 1 }}>{fmtTime(entry.recorded_at)}</Text>
        </View>
      </View>

      {!!entry.note && (
        <Text style={{ fontSize: FontSize.xs, color: colors.textSecondary, marginTop: 8, fontStyle: 'italic' }}>
          "{entry.note}"
        </Text>
      )}

      <View style={[s.balanceRow, { borderTopColor: colors.border }]}>
        <Text style={{ fontSize: FontSize.xs, color: colors.textSecondary }}>Balance after</Text>
        <Text style={{ fontSize: FontSize.xs, fontWeight: '700', color: colors.textPrimary }}>
          ₦{balanceAfter.toLocaleString('en-NG', { minimumFractionDigits: 2 })}
        </Text>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 56, paddingBottom: 16, borderBottomWidth: 1,
  },
  card: {
    borderRadius: Radius.lg, borderWidth: 1,
    padding: 14, marginBottom: 12,
  },
  dirIcon: {
    width: 40, height: 40, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center',
  },
  balanceRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginTop: 10, paddingTop: 8, borderTopWidth: StyleSheet.hairlineWidth,
  },
});
