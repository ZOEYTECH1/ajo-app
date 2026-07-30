import React from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  RefreshControl, StatusBar, StyleSheet,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../src/hooks/useTheme';
import { groupService } from '../../../src/services/groupService';
import { FontSize, Radius, Shadow } from '../../../src/theme';
import { Skeleton, Pill } from '../../../src/components';

const formatAmt = (v: number) => `₦${v.toLocaleString()}`;

export default function CollectionHistoryRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const groupId = Number(id);
  const { colors, isDark } = useTheme();
  const router = useRouter();

  const { data: cycles, isLoading: cyclesLoading, isRefetching, refetch } = useQuery({
    queryKey: ['cycles', groupId],
    queryFn: () => groupService.getCycles(groupId),
    enabled: !!groupId,
  });

  const { data: payments, isLoading: paymentsLoading } = useQuery({
    queryKey: ['payments', groupId],
    queryFn: () => groupService.getPayments(groupId),
    enabled: !!groupId,
  });

  const { data: collectionOrder, isLoading: orderLoading } = useQuery({
    queryKey: ['collection-order', groupId],
    queryFn: () => groupService.getCollectionOrder(groupId),
    enabled: !!groupId,
  });

  const { data: group } = useQuery({
    queryKey: ['group', groupId],
    queryFn: () => groupService.getGroupDetail(groupId),
    enabled: !!groupId,
  });

  const isLoading = cyclesLoading || paymentsLoading || orderLoading;

  const sortedCycles = [...(cycles ?? [])].sort((a, b) => a.cycle_number - b.cycle_number);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.background} />

      {/* Header */}
      <View style={[s.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 10, left: 10, bottom: 10, right: 10 }} accessibilityRole="button" accessibilityLabel="Go back">
          <Ionicons name="arrow-back" size={24} color={colors.primary} />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 14 }}>
          <Text style={{ fontSize: FontSize.lg, fontWeight: '800', color: colors.textPrimary }} accessibilityRole="header">
            Collection History
          </Text>
          {!!group && (
            <Text style={{ fontSize: FontSize.xs, color: colors.textSecondary, marginTop: 1 }}>
              {group.name}
            </Text>
          )}
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: 60 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} colors={[colors.primary]} />
        }
      >
        {isLoading ? (
          <>
            <Skeleton width="100%" height={100} radius={Radius.lg} style={{ marginBottom: 12 }} />
            <Skeleton width="100%" height={100} radius={Radius.lg} style={{ marginBottom: 12 }} />
            <Skeleton width="100%" height={100} radius={Radius.lg} />
          </>
        ) : sortedCycles.length === 0 ? (
          <View style={{ alignItems: 'center', paddingVertical: 60 }}>
            <Ionicons name="time-outline" size={56} color={colors.textTertiary} />
            <Text style={{ fontSize: FontSize.md, fontWeight: '700', color: colors.textPrimary, marginTop: 16 }}>
              No cycles yet
            </Text>
            <Text style={{ fontSize: FontSize.sm, color: colors.textSecondary, marginTop: 6, textAlign: 'center' }}>
              Cycles will appear here once the group admin starts the first round.
            </Text>
          </View>
        ) : (
          sortedCycles.map((cycle) => {
            const slot = collectionOrder?.find((s) => s.collection_slot === cycle.cycle_number);
            const isActive = cycle.status === 'active';

            const cyclePayments = (payments ?? []).filter(
              (p) => p.cycle_number === cycle.cycle_number && p.status === 'approved',
            );
            const pot = cyclePayments.reduce((sum, p) => sum + parseFloat(p.amount_entered), 0);

            const startDate = new Date(cycle.start_date).toLocaleDateString('en-NG', {
              day: 'numeric', month: 'short', year: 'numeric',
            });
            const endDate = new Date(cycle.end_date).toLocaleDateString('en-NG', {
              day: 'numeric', month: 'short', year: 'numeric',
            });

            return (
              <View
                key={cycle.id}
                style={[
                  s.card,
                  {
                    backgroundColor: colors.surface,
                    borderLeftWidth: 4,
                    borderLeftColor: isActive ? colors.primary : colors.success,
                    ...Shadow.card(colors.black),
                  },
                ]}
              >
                {/* Top row */}
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                  <View style={[s.cycleBadge, { backgroundColor: isActive ? colors.primary : colors.successLight }]}>
                    <Text style={{ fontSize: FontSize.xs, fontWeight: '800', color: isActive ? '#FFF' : colors.success }}>
                      {cycle.cycle_number}
                    </Text>
                  </View>
                  <Text style={{ fontSize: FontSize.base, fontWeight: '700', color: colors.textPrimary, flex: 1, marginLeft: 10 }}>
                    Cycle {cycle.cycle_number}
                  </Text>
                  {isActive
                    ? <Pill label="Active" bg={colors.primaryTint} color={colors.primary} />
                    : <Pill label="Completed" bg={colors.successLight} color={colors.success} />}
                </View>

                {/* Collector */}
                <View style={[s.collectorRow, { backgroundColor: isActive ? colors.primaryTint : colors.successLight }]}>
                  <Ionicons
                    name={isActive ? 'time-outline' : 'trophy-outline'}
                    size={18}
                    color={isActive ? colors.primary : colors.success}
                  />
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={{ fontSize: FontSize.xs, color: isActive ? colors.primary : colors.success, fontWeight: '600' }}>
                      {isActive ? 'Collecting this cycle' : 'Collected by'}
                    </Text>
                    <Text style={{ fontSize: FontSize.sm, fontWeight: '800', color: isActive ? colors.primary : colors.success, marginTop: 2 }}>
                      {slot?.full_name ?? '—'}
                    </Text>
                  </View>
                  {pot > 0 && (
                    <Text style={{ fontSize: FontSize.base, fontWeight: '800', color: isActive ? colors.primary : colors.success }}>
                      {formatAmt(pot)}
                    </Text>
                  )}
                </View>

                {/* Meta */}
                <View style={{ flexDirection: 'row', marginTop: 12, gap: 16 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Ionicons name="calendar-outline" size={13} color={colors.textTertiary} />
                    <Text style={{ fontSize: FontSize.xs, color: colors.textSecondary, marginLeft: 4 }}>
                      {startDate} – {endDate}
                    </Text>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Ionicons name="people-outline" size={13} color={colors.textTertiary} />
                    <Text style={{ fontSize: FontSize.xs, color: colors.textSecondary, marginLeft: 4 }}>
                      {cyclePayments.length} paid
                    </Text>
                  </View>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 56,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  card: {
    borderRadius: Radius.lg,
    padding: 16,
    marginBottom: 14,
  },
  cycleBadge: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  collectorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: Radius.md,
  },
});
