import {
  View, Text, ScrollView, StyleSheet, StatusBar,
  TouchableOpacity, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useTheme } from '../src/hooks/useTheme';
import { useAuthStore } from '../src/store/useAppStore';
import { notificationService, type AppNotification } from '../src/services/notificationService';
import { FontSize, Radius } from '../src/theme';
import { Skeleton } from '../src/components';

// ─── Icon by notification type ─────────────────────────────────────────────────
function typeIcon(type: string, colors: any): { name: any; color: string; bg: string } {
  switch (type) {
    // ── Ajo group ──
    case 'payment_approved':  return { name: 'checkmark-circle', color: colors.successDark,   bg: colors.successLight };
    case 'payment_rejected':  return { name: 'close-circle',     color: colors.errorDark,     bg: colors.errorLight   };
    case 'payment_submitted': return { name: 'receipt',          color: colors.primary,       bg: colors.primaryTint  };
    case 'join_approved':     return { name: 'person-add',       color: colors.successDark,   bg: colors.successLight };
    case 'join_rejected':     return { name: 'person-remove',    color: colors.errorDark,     bg: colors.errorLight   };
    case 'member_joined':     return { name: 'people',           color: colors.primary,       bg: colors.primaryTint  };
    case 'removal_vote':      return { name: 'alert-circle',     color: colors.warningDark,   bg: colors.warningLight };
    case 'cycle_closed':      return { name: 'lock-closed',      color: colors.textSecondary, bg: colors.border       };
    case 'cycle_early_close': return { name: 'timer',            color: colors.warningDark,   bg: colors.warningLight };
    // ── Contributions (thrift) ──
    case 'thrift_join_approved':     return { name: 'checkmark-circle',      color: colors.successDark, bg: colors.successLight };
    case 'thrift_join_rejected':     return { name: 'close-circle',          color: colors.errorDark,   bg: colors.errorLight   };
    case 'thrift_member_joined':     return { name: 'person-add',            color: colors.primary,     bg: colors.primaryTint  };
    case 'thrift_amount_flagged':    return { name: 'flag',                  color: colors.warningDark, bg: colors.warningLight };
    case 'thrift_amount_updated':    return { name: 'create',                color: colors.primary,     bg: colors.primaryTint  };
    case 'thrift_payment_marked':    return { name: 'wallet',                color: colors.successDark, bg: colors.successLight };
    case 'thrift_payment_confirmed': return { name: 'checkmark-done-circle', color: colors.successDark, bg: colors.successLight };
    case 'thrift_payment_disputed':  return { name: 'alert-circle',          color: colors.warningDark, bg: colors.warningLight };
    case 'thrift_dispute_escalated': return { name: 'warning',               color: colors.errorDark,   bg: colors.errorLight   };
    case 'thrift_cycle_ended':       return { name: 'stop-circle',           color: colors.errorDark,   bg: colors.errorLight   };
    case 'thrift_cycle_restarted':   return { name: 'play-circle',           color: colors.successDark, bg: colors.successLight };
    case 'thrift_org_invite':        return { name: 'business',              color: colors.primary,     bg: colors.primaryTint  };
    case 'thrift_collector_report':  return { name: 'shield-outline',        color: colors.warningDark, bg: colors.warningLight };
    // ── Inventory ──
    case 'inventory_low_stock':      return { name: 'warning-outline',       color: '#E65100',          bg: '#FFF3E0'           };
    case 'inventory_out_of_stock':   return { name: 'close-circle-outline',  color: '#C62828',          bg: '#FFEBEE'           };
    case 'inventory_expiry_warning': return { name: 'time-outline',          color: '#F57F17',          bg: '#FFF9C4'           };
    case 'inventory_expiry_soon':    return { name: 'alert-circle',          color: '#C62828',          bg: '#FFEBEE'           };
    case 'inventory_staff_invite':   return { name: 'person-add-outline',    color: '#1565C0',          bg: '#E3F2FD'           };
    case 'inventory_transfer':       return { name: 'swap-horizontal-outline', color: '#1565C0',        bg: '#E3F2FD'           };
    default:                         return { name: 'notifications',         color: colors.primary,     bg: colors.primaryTint  };
  }
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)  return 'Just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

// ─── Single row ────────────────────────────────────────────────────────────────
const NotifRow: React.FC<{
  notif: AppNotification;
  onPress: (n: AppNotification) => void;
  colors: any;
}> = ({ notif, onPress, colors }) => {
  const icon = typeIcon(notif.notif_type, colors);
  return (
    <TouchableOpacity
      onPress={() => onPress(notif)}
      activeOpacity={0.7}
      style={[
        s.row,
        { backgroundColor: notif.is_read ? colors.surface : colors.primaryTint, borderBottomColor: colors.border },
      ]}
    >
      <View style={[s.iconWrap, { backgroundColor: icon.bg }]}>
        <Ionicons name={icon.name} size={20} color={icon.color} />
      </View>
      <View style={{ flex: 1, marginLeft: 12 }}>
        <Text
          style={{ fontSize: FontSize.sm, fontWeight: notif.is_read ? '500' : '700', color: colors.textPrimary }}
          numberOfLines={1}
        >
          {notif.title}
        </Text>
        <Text style={{ fontSize: FontSize.xs, color: colors.textSecondary, marginTop: 2, lineHeight: 16 }} numberOfLines={2}>
          {notif.body}
        </Text>
        <Text style={{ fontSize: 10, color: colors.textTertiary, marginTop: 4 }}>
          {timeAgo(notif.created_at)}
        </Text>
      </View>
      {!notif.is_read && (
        <View style={[s.dot, { backgroundColor: colors.primary }]} />
      )}
    </TouchableOpacity>
  );
};

// ─── Screen ────────────────────────────────────────────────────────────────────
export default function NotificationsRoute() {
  const { colors, isDark } = useTheme();
  const { user } = useAuthStore();
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['notifications'],
    queryFn: notificationService.getNotifications,
    enabled: !!user,
  });

  const notifications = data?.data ?? [];
  const unreadCount = data?.unreadCount ?? 0;

  const markReadMutation = useMutation({
    mutationFn: (id: number) => notificationService.markRead(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const markAllMutation = useMutation({
    mutationFn: notificationService.markAllRead,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const handlePress = (notif: AppNotification) => {
    if (!notif.is_read) markReadMutation.mutate(notif.id);
    const d = notif.action_data ?? {};

    // Ajo groups
    if (d.group_id)       { router.push(`/group/${d.group_id}` as any); return; }
    // Thrift groups
    if (d.thrift_group_id) { router.push(`/thrift/${d.thrift_group_id}` as any); return; }
    // Inventory — product-level (low stock, out of stock, expiry)
    if (d.category_id && d.product_id) {
      router.push(`/inventory/${d.category_id}/${d.product_id}` as any);
      return;
    }
    // Inventory — staff invite → staff management screen
    if (notif.notif_type === 'inventory_staff_invite') {
      router.push('/inventory/staff' as any);
      return;
    }
    // Inventory — transfer notification → transfer history
    if (notif.notif_type === 'inventory_transfer') {
      router.push('/inventory/transfers' as any);
      return;
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.background} />

      <View style={[s.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <Text style={{ fontSize: FontSize.lg, fontWeight: '800', color: colors.textPrimary }}>Alerts</Text>
        {unreadCount > 0 && (
          <TouchableOpacity
            onPress={() => markAllMutation.mutate()}
            disabled={markAllMutation.isPending}
            style={[s.markAllBtn, { borderColor: colors.border }]}
          >
            <Text style={{ fontSize: FontSize.xs, fontWeight: '600', color: colors.primary }}>Mark all read</Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} colors={[colors.primary]} />
        }
      >
        {isLoading ? (
          <View style={{ padding: 20, gap: 12 }}>
            {[1, 2, 3, 4].map((i) => (
              <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <Skeleton width={44} height={44} radius={22} />
                <View style={{ flex: 1, gap: 6 }}>
                  <Skeleton width="60%" height={14} radius={4} />
                  <Skeleton width="90%" height={11} radius={4} />
                </View>
              </View>
            ))}
          </View>
        ) : notifications.length === 0 ? (
          <View style={s.empty}>
            <Ionicons name="notifications-outline" size={56} color={colors.primaryTint} />
            <Text style={{ fontSize: FontSize.base, fontWeight: '700', color: colors.textSecondary, marginTop: 16 }}>
              No notifications yet
            </Text>
            <Text style={{ fontSize: FontSize.sm, color: colors.textTertiary, marginTop: 6, textAlign: 'center' }}>
              Payment updates, collector activity, cycle changes, and org alerts will appear here.
            </Text>
          </View>
        ) : (
          notifications.map((n) => (
            <NotifRow key={n.id} notif={n} onPress={handlePress} colors={colors} />
          ))
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
  markAllBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radius.full,
    borderWidth: 1,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 6,
    marginLeft: 8,
    flexShrink: 0,
  },
  empty: {
    alignItems: 'center',
    paddingTop: 100,
    paddingHorizontal: 40,
  },
});
