/**
 * Transfer History
 * Lists all stock transfers for the current location (both sent and received).
 */
import {
  View, Text, TouchableOpacity, ScrollView,
  StyleSheet, ActivityIndicator, RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useInfiniteQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../src/hooks/useTheme';
import { FontSize, Radius, Shadow } from '../../src/theme';
import { getTransfersPage, type InventoryTransfer } from '../../src/services/inventoryService';
import { useInventoryStore } from '../../src/store/useAppStore';

export default function TransfersScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { selectedBusinessId, selectedBusinessName } = useInventoryStore();

  const {
    data, isLoading, isRefetching, refetch,
    fetchNextPage, hasNextPage, isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ['inventory-transfers', selectedBusinessId],
    queryFn: ({ pageParam }) => getTransfersPage(pageParam as number),
    initialPageParam: 1,
    getNextPageParam: (lastPage, _allPages, lastPageParam) =>
      lastPage.next ? (lastPageParam as number) + 1 : undefined,
    enabled: !!selectedBusinessId,
  });

  const transfers = data?.pages.flatMap(p => p.results) ?? [];

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
          <Text style={{ fontSize: FontSize.lg, fontWeight: '800', color: colors.textPrimary }} accessibilityRole="header">Transfer History</Text>
          <Text style={{ fontSize: FontSize.xs, color: colors.textSecondary, marginTop: 2 }}>
            Stock moves for {selectedBusinessName ?? 'this location'}
          </Text>
        </View>
        <TouchableOpacity
          onPress={() => router.push('/inventory/transfer' as any)}
          style={{ backgroundColor: '#E3F2FD', borderRadius: Radius.md, padding: 8 }}
          hitSlop={{ top: 10, left: 10, bottom: 10, right: 10 }}
          accessibilityRole="button" accessibilityLabel="New transfer"
        >
          <Ionicons name="swap-horizontal-outline" size={20} color="#1565C0" />
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color="#1565C0" />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: 16, paddingBottom: 60 }}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
        >
          {transfers.length === 0 ? (
            <View style={{ alignItems: 'center', paddingVertical: 60 }}>
              <Ionicons name="swap-horizontal-outline" size={56} color={colors.border} />
              <Text style={{ fontSize: FontSize.md, fontWeight: '700', color: colors.textPrimary, marginTop: 16 }}>
                No transfers yet
              </Text>
              <Text style={{ fontSize: FontSize.sm, color: colors.textSecondary, marginTop: 6, textAlign: 'center' }}>
                Stock transfers between your locations will appear here.
              </Text>
              <TouchableOpacity
                onPress={() => router.push('/inventory/transfer' as any)}
                style={[s.newBtn, { backgroundColor: '#1565C0', marginTop: 20 }]}
                accessibilityRole="button" accessibilityLabel="New transfer"
              >
                <Ionicons name="add" size={16} color="#fff" />
                <Text style={{ color: '#fff', fontWeight: '700', fontSize: FontSize.sm, marginLeft: 6 }}>New Transfer</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              {transfers.map(t => (
                <TransferCard
                  key={t.id}
                  transfer={t}
                  currentBizId={selectedBusinessId!}
                  colors={colors}
                  fmt={fmt}
                  fmtTime={fmtTime}
                />
              ))}
              {hasNextPage && (
                <TouchableOpacity
                  onPress={() => fetchNextPage()}
                  disabled={isFetchingNextPage}
                  style={{ alignItems: 'center', paddingVertical: 20 }}
                  accessibilityRole="button"
                  accessibilityLabel="Load more transfers"
                >
                  {isFetchingNextPage
                    ? <ActivityIndicator color="#1565C0" />
                    : <Text style={{ color: '#1565C0', fontWeight: '700', fontSize: FontSize.sm }}>Load More</Text>
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

function TransferCard({
  transfer, currentBizId, colors, fmt, fmtTime,
}: {
  transfer: InventoryTransfer;
  currentBizId: number;
  colors: any;
  fmt: (iso: string) => string;
  fmtTime: (iso: string) => string;
}) {
  const isSent     = transfer.from_business === currentBizId;
  const dirLabel   = isSent ? 'Sent to' : 'Received from';
  const otherName  = isSent ? transfer.to_business_name : transfer.from_business_name;
  const totalQty   = transfer.items.reduce((s, i) => s + i.quantity, 0);
  const accentColor = isSent ? '#C62828' : '#1565C0';
  const accentBg    = isSent ? '#FFEBEE' : '#E3F2FD';
  const arrowIcon   = isSent ? 'arrow-up-circle-outline' : 'arrow-down-circle-outline';

  return (
    <View style={[s.card, { backgroundColor: colors.surface, borderColor: colors.border, ...Shadow.card(colors.black) }]}>
      {/* Top row */}
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
        <View style={[s.dirIcon, { backgroundColor: accentBg }]}>
          <Ionicons name={arrowIcon} size={20} color={accentColor} />
        </View>
        <View style={{ flex: 1, marginLeft: 10 }}>
          <Text style={{ fontSize: FontSize.xs, color: colors.textSecondary, fontWeight: '600' }}>
            {dirLabel.toUpperCase()}
          </Text>
          <Text style={{ fontSize: FontSize.sm, fontWeight: '700', color: colors.textPrimary, marginTop: 1 }}>
            {otherName}
          </Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={{ fontSize: FontSize.xs, color: colors.textSecondary }}>{fmt(transfer.transferred_at)}</Text>
          <Text style={{ fontSize: 10, color: colors.textTertiary, marginTop: 1 }}>{fmtTime(transfer.transferred_at)}</Text>
        </View>
      </View>

      {/* Items */}
      <View style={[s.itemsBox, { backgroundColor: colors.background, borderColor: colors.border }]}>
        {transfer.items.map((item, i) => (
          <View
            key={item.id}
            style={[s.itemRow, { borderBottomColor: colors.border, borderBottomWidth: i < transfer.items.length - 1 ? 1 : 0 }]}
          >
            <Ionicons name="cube-outline" size={13} color={colors.textSecondary} style={{ marginTop: 1 }} />
            <Text style={{ flex: 1, fontSize: FontSize.xs, color: colors.textPrimary, marginLeft: 6 }} numberOfLines={1}>
              {item.product_name}
            </Text>
            <Text style={{ fontSize: FontSize.xs, fontWeight: '700', color: accentColor }}>
              {item.quantity} units
            </Text>
          </View>
        ))}
      </View>

      {/* Footer */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 }}>
        <Text style={{ fontSize: FontSize.xs, color: colors.textSecondary }}>
          {transfer.items.length} {transfer.items.length === 1 ? 'product' : 'products'} · {totalQty} units total
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          {!!transfer.reference && (
            <View style={[s.refBadge, { backgroundColor: colors.background, borderColor: colors.border }]}>
              <Text style={{ fontSize: 10, color: colors.textSecondary, fontFamily: 'monospace' }}>
                {transfer.reference}
              </Text>
            </View>
          )}
          <View style={[s.statusBadge, { backgroundColor: '#E8F5E9' }]}>
            <Text style={{ fontSize: 10, fontWeight: '700', color: '#2E7D32' }}>
              {transfer.status.toUpperCase()}
            </Text>
          </View>
        </View>
      </View>

      {!!transfer.notes && (
        <Text style={{ fontSize: FontSize.xs, color: colors.textSecondary, marginTop: 8, fontStyle: 'italic' }}>
          "{transfer.notes}"
        </Text>
      )}
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
  itemsBox: {
    borderWidth: 1, borderRadius: Radius.md, overflow: 'hidden',
  },
  itemRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 10, paddingVertical: 8,
  },
  refBadge: {
    borderWidth: 1, borderRadius: 6,
    paddingHorizontal: 6, paddingVertical: 2,
  },
  statusBadge: {
    borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3,
  },
  newBtn: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 12, borderRadius: Radius.lg,
  },
});
