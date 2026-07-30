import { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StatusBar, StyleSheet,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../src/hooks/useTheme';
import { groupService, type CollectionSlot } from '../../../src/services/groupService';
import { FontSize, Radius, Shadow } from '../../../src/theme';
import { Button, LoadingOverlay, Skeleton, feedback } from '../../../src/components';

export default function CollectionOrderRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const groupId = Number(id);
  const { colors, isDark } = useTheme();
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data: slots, isLoading } = useQuery({
    queryKey: ['collection-order', groupId],
    queryFn: () => groupService.getCollectionOrder(groupId),
  });

  const [order, setOrder] = useState<CollectionSlot[]>([]);

  useEffect(() => {
    if (slots) setOrder([...slots]);
  }, [slots]);

  const moveUp = (index: number) => {
    if (index === 0) return;
    const next = [...order];
    [next[index - 1], next[index]] = [next[index], next[index - 1]];
    setOrder(next);
  };

  const moveDown = (index: number) => {
    if (index === order.length - 1) return;
    const next = [...order];
    [next[index], next[index + 1]] = [next[index + 1], next[index]];
    setOrder(next);
  };

  const saveMutation = useMutation({
    mutationFn: () =>
      groupService.updateCollectionOrder(groupId, order.map((s) => s.id)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['collection-order', groupId] });
      feedback('success');
      router.back();
    },
    onError: () => feedback('error'),
  });

  const isDirty = JSON.stringify(order.map((s) => s.id)) !== JSON.stringify(slots?.map((s) => s.id));

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.background} />
      <LoadingOverlay visible={saveMutation.isPending} message="Saving order…" />

      {/* Header */}
      <View style={[s.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 10, left: 10, right: 10, bottom: 10 }} accessibilityRole="button" accessibilityLabel="Go back">
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={{ fontSize: FontSize.lg, fontWeight: '800', color: colors.textPrimary }} accessibilityRole="header">
          Collection Order
        </Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={s.body} showsVerticalScrollIndicator={false}>
        <Text style={{ fontSize: FontSize.sm, color: colors.textSecondary, marginBottom: 16, lineHeight: 20 }}>
          Drag the order to set who collects the pot in each cycle. Cycle 1 collects first, then Cycle 2, and so on. The admin is set to collect first by default.
        </Text>

        {isLoading ? (
          <>
            <Skeleton width="100%" height={60} radius={Radius.lg} style={{ marginBottom: 8 }} />
            <Skeleton width="100%" height={60} radius={Radius.lg} style={{ marginBottom: 8 }} />
            <Skeleton width="100%" height={60} radius={Radius.lg} />
          </>
        ) : (
          <View style={[s.list, { backgroundColor: colors.surface, ...Shadow.soft(colors.black) }]}>
            {order.map((slot, idx) => (
              <View
                key={slot.id}
                style={[
                  s.row,
                  {
                    borderBottomColor: colors.border,
                    borderBottomWidth: idx < order.length - 1 ? 1 : 0,
                  },
                ]}
              >
                {/* Slot number */}
                <View style={[s.slotBadge, { backgroundColor: colors.primary }]}>
                  <Text style={{ fontSize: FontSize.xs, fontWeight: '800', color: '#FFF' }}>
                    {idx + 1}
                  </Text>
                </View>

                {/* Name */}
                <Text style={{ flex: 1, marginLeft: 12, fontSize: FontSize.sm, fontWeight: '600', color: colors.textPrimary }}>
                  {slot.full_name}
                </Text>

                {/* Up / Down buttons */}
                <View style={s.arrows}>
                  <TouchableOpacity
                    onPress={() => moveUp(idx)}
                    disabled={idx === 0}
                    style={[s.arrowBtn, { opacity: idx === 0 ? 0.25 : 1 }]}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    accessibilityRole="button"
                    accessibilityLabel={`Move ${slot.full_name} up`}
                  >
                    <Ionicons name="chevron-up" size={20} color={colors.primary} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => moveDown(idx)}
                    disabled={idx === order.length - 1}
                    style={[s.arrowBtn, { opacity: idx === order.length - 1 ? 0.25 : 1 }]}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    accessibilityRole="button"
                    accessibilityLabel={`Move ${slot.full_name} down`}
                  >
                    <Ionicons name="chevron-down" size={20} color={colors.primary} />
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}

        <Button
          label="Save Order"
          onPress={() => saveMutation.mutate()}
          loading={saveMutation.isPending}
          disabled={!isDirty || order.length === 0}
          style={{ marginTop: 24 }}
        />
        {!isDirty && (
          <Text style={{ fontSize: FontSize.xs, color: colors.textTertiary, textAlign: 'center', marginTop: 8 }}>
            No changes to save
          </Text>
        )}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 56,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  body: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 100,
  },
  list: {
    borderRadius: Radius.lg,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  slotBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  arrows: {
    flexDirection: 'row',
    gap: 4,
  },
  arrowBtn: {
    padding: 4,
  },
});
