import { useState } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView,
  StyleSheet, Alert, ActivityIndicator, Linking,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../src/hooks/useTheme';
import { FontSize, Radius, Shadow } from '../../src/theme';
import {
  getBusinesses,
  initiateInventorySubscription,
  verifyInventorySubscription,
} from '../../src/services/inventoryService';

const INV = '#E65100';
const MONTHLY_FEE = 2000;

const MONTH_OPTIONS = [
  { months: 1,  label: '1 Month',   saving: null },
  { months: 3,  label: '3 Months',  saving: null },
  { months: 6,  label: '6 Months',  saving: '₦0 saved' },
  { months: 12, label: '12 Months', saving: '₦0 saved' },
];

export default function InventorySubscriptionScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const qc = useQueryClient();
  const { bizId } = useLocalSearchParams<{ bizId: string }>();
  const bizIdNum = Number(bizId);

  const [selectedMonths, setSelectedMonths] = useState(1);
  const [pendingTxRef, setPendingTxRef]     = useState<string | null>(null);
  const [verifying, setVerifying]           = useState(false);

  const { data: businesses } = useQuery({
    queryKey: ['inventory-businesses'],
    queryFn: getBusinesses,
  });

  const biz = businesses?.find((b) => b.id === bizIdNum);

  const { mutate: initiate, isPending: initiating } = useMutation({
    mutationFn: () => initiateInventorySubscription(bizIdNum, selectedMonths),
    onSuccess: async (res) => {
      setPendingTxRef(res.subscription.tx_ref);
      try {
        await Linking.openURL(res.link);
      } catch {
        Alert.alert('Error', 'Could not open payment page. Copy the link and open it in your browser.');
      }
    },
    onError: (e: any) =>
      Alert.alert('Error', e?.response?.data?.detail || 'Could not initialize payment. Try again.'),
  });

  const handleVerify = async () => {
    const txId = pendingTxRef;
    if (!txId) {
      Alert.alert(
        'No pending payment',
        'Tap "Pay Now" first to open the payment page, then come back and tap Verify.',
      );
      return;
    }
    setVerifying(true);
    try {
      await verifyInventorySubscription(bizIdNum, txId);
      await qc.invalidateQueries({ queryKey: ['inventory-businesses'] });
      Alert.alert('Success', 'Subscription activated! You can now continue using inventory.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (e: any) {
      const msg = e?.response?.data?.detail || 'Could not verify payment. Wait a moment and try again.';
      Alert.alert('Verification failed', msg);
    } finally {
      setVerifying(false);
    }
  };

  const total = MONTHLY_FEE * selectedMonths;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Header */}
      <View style={[s.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity
          onPress={() => router.back()}
          hitSlop={{ top: 10, left: 10, bottom: 10, right: 10 }}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 16 }}>
          <Text style={{ fontSize: FontSize.lg, fontWeight: '800', color: colors.textPrimary }}>
            Renew Subscription
          </Text>
          {biz && (
            <Text style={{ fontSize: FontSize.xs, color: colors.textSecondary, marginTop: 2 }}>
              {biz.name}
            </Text>
          )}
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 60 }} showsVerticalScrollIndicator={false}>

        {/* Expiry notice */}
        {biz && !biz.is_subscription_active && (
          <View style={[s.expiredBanner, { backgroundColor: '#FFEBEE' }]}>
            <Ionicons name="alert-circle-outline" size={20} color="#C62828" />
            <Text style={{ fontSize: FontSize.sm, color: '#C62828', fontWeight: '600', marginLeft: 8, flex: 1 }}>
              Your subscription has expired. Renew to add products and record sales.
            </Text>
          </View>
        )}

        {/* What's included */}
        <View style={[s.card, { backgroundColor: colors.surface, borderColor: colors.border, ...Shadow.card(colors.black) }]}>
          <Text style={{ fontSize: FontSize.md, fontWeight: '800', color: colors.textPrimary, marginBottom: 12 }}>
            What's included
          </Text>
          {[
            'Add unlimited products & categories',
            'Record sales & expenses',
            'Track stock movements & daily P&L',
            'Expiry date alerts',
            'All branches under this business — free',
          ].map((item) => (
            <View key={item} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
              <Ionicons name="checkmark-circle" size={18} color="#2E7D32" />
              <Text style={{ fontSize: FontSize.sm, color: colors.textPrimary, marginLeft: 8 }}>{item}</Text>
            </View>
          ))}
        </View>

        {/* Duration picker */}
        <Text style={[s.sectionLabel, { color: colors.textSecondary }]}>Choose duration</Text>
        <View style={{ gap: 10 }}>
          {MONTH_OPTIONS.map((opt) => {
            const active = selectedMonths === opt.months;
            return (
              <TouchableOpacity
                key={opt.months}
                onPress={() => setSelectedMonths(opt.months)}
                style={[
                  s.monthOption,
                  {
                    backgroundColor: active ? '#FFF3E0' : colors.surface,
                    borderColor: active ? INV : colors.border,
                    ...Shadow.card(colors.black),
                  },
                ]}
                accessibilityRole="radio"
                accessibilityState={{ checked: active }}
              >
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: FontSize.md, fontWeight: '700', color: active ? INV : colors.textPrimary }}>
                    {opt.label}
                  </Text>
                  <Text style={{ fontSize: FontSize.sm, color: colors.textSecondary, marginTop: 2 }}>
                    ₦{(MONTHLY_FEE * opt.months).toLocaleString()} total
                  </Text>
                </View>
                {active && <Ionicons name="checkmark-circle" size={22} color={INV} />}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Total */}
        <View style={[s.totalRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={{ fontSize: FontSize.md, color: colors.textSecondary }}>Total</Text>
          <Text style={{ fontSize: FontSize.xl, fontWeight: '900', color: INV }}>
            ₦{total.toLocaleString()}
          </Text>
        </View>

        {/* Pay button */}
        <TouchableOpacity
          onPress={() => initiate()}
          disabled={initiating}
          style={[s.payBtn, { backgroundColor: INV, opacity: initiating ? 0.6 : 1 }]}
          accessibilityRole="button"
          accessibilityLabel="Pay now"
        >
          {initiating
            ? <ActivityIndicator color="#fff" />
            : (
              <>
                <Ionicons name="card-outline" size={20} color="#fff" style={{ marginRight: 8 }} />
                <Text style={{ color: '#fff', fontWeight: '800', fontSize: FontSize.md }}>
                  Pay ₦{total.toLocaleString()}
                </Text>
              </>
            )
          }
        </TouchableOpacity>

        {/* Verify step */}
        <View style={[s.verifyBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Ionicons name="information-circle-outline" size={18} color={colors.textSecondary} style={{ marginRight: 8, marginTop: 1 }} />
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: FontSize.sm, color: colors.textSecondary, lineHeight: 20 }}>
              After completing payment in the browser, come back and tap{' '}
              <Text style={{ fontWeight: '700', color: colors.textPrimary }}>Verify Payment</Text>{' '}
              to activate your subscription.
            </Text>
          </View>
        </View>

        <TouchableOpacity
          onPress={handleVerify}
          disabled={verifying}
          style={[s.verifyBtn, { borderColor: INV, opacity: verifying ? 0.6 : 1 }]}
          accessibilityRole="button"
          accessibilityLabel="Verify payment"
        >
          {verifying
            ? <ActivityIndicator color={INV} />
            : (
              <>
                <Ionicons name="checkmark-done-outline" size={20} color={INV} style={{ marginRight: 8 }} />
                <Text style={{ color: INV, fontWeight: '800', fontSize: FontSize.md }}>
                  Verify Payment
                </Text>
              </>
            )
          }
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 56, paddingBottom: 16, borderBottomWidth: 1,
  },
  expiredBanner: {
    flexDirection: 'row', alignItems: 'flex-start',
    padding: 12, borderRadius: Radius.md, marginBottom: 16,
  },
  card: {
    borderRadius: Radius.lg, padding: 16,
    borderWidth: 1, marginBottom: 20,
  },
  sectionLabel: {
    fontSize: FontSize.xs, fontWeight: '700',
    textTransform: 'uppercase', letterSpacing: 0.5,
    marginBottom: 10,
  },
  monthOption: {
    flexDirection: 'row', alignItems: 'center',
    padding: 14, borderRadius: Radius.md, borderWidth: 1.5,
  },
  totalRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 16, borderRadius: Radius.md, borderWidth: 1,
    marginTop: 16, marginBottom: 16,
  },
  payBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 16, borderRadius: Radius.lg, marginBottom: 16,
  },
  verifyBox: {
    flexDirection: 'row', alignItems: 'flex-start',
    padding: 12, borderRadius: Radius.md,
    borderWidth: 1, marginBottom: 12,
  },
  verifyBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 14, borderRadius: Radius.lg, borderWidth: 2,
  },
});
