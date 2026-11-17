import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, Alert, ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as WebBrowser from 'expo-web-browser';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../src/hooks/useTheme';
import { FontSize, Radius, Shadow } from '../../../src/theme';
import {
  getMyInvoices, getBillingStatus, generateMyInvoice, payInvoice, verifyInvoice,
  type ThriftInvoice,
} from '../../../src/services/billingService';
import { getPaymentRedirectUri } from '../../../src/lib/paymentRedirect';

const STATUS_META = {
  pending: { label: 'Unpaid',  color: '#E65100', bg: '#FFF3E0', icon: 'time-outline' },
  paid:    { label: 'Paid',    color: '#2E7D32', bg: '#E8F5E9', icon: 'checkmark-circle-outline' },
  overdue: { label: 'Overdue', color: '#C62828', bg: '#FFEBEE', icon: 'alert-circle-outline' },
};

function InvoiceCard({ invoice, onVerified }: {
  invoice: ThriftInvoice;
  onVerified: () => void;
}) {
  const { colors } = useTheme();
  const meta = STATUS_META[invoice.status];
  const totalFee = parseFloat(invoice.total_fee);
  const [verifyError, setVerifyError] = useState('');
  const [verified, setVerified] = useState(false);

  // Previously opened the payment link in an external browser (Linking.openURL)
  // and made the user manually copy-paste the transaction id. Switched to the
  // same pattern the Ajo Group subscription screen already uses: an in-app
  // auth session that captures Flutterwave's redirect itself and verifies
  // automatically, no manual step needed.
  const { mutate: verify, isPending: verifying } = useMutation({
    mutationFn: (txId: string) => verifyInvoice(invoice.id, txId.trim()),
    onSuccess: () => { setVerified(true); setVerifyError(''); onVerified(); },
    onError: (e: any) => setVerifyError(e?.response?.data?.detail ?? 'Verification failed. Please try again.'),
  });

  const { mutate: pay, isPending: paying } = useMutation({
    mutationFn: () => {
      const redirectUri = getPaymentRedirectUri();
      return payInvoice(invoice.id, redirectUri).then((data) => ({ ...data, redirectUri }));
    },
    onSuccess: async (data) => {
      const browserResult = await WebBrowser.openAuthSessionAsync(data.payment_link, data.redirectUri);
      if (browserResult.type !== 'success') return;

      const params = new URL(browserResult.url).searchParams;
      const transactionId = params.get('transaction_id');
      const payStatus = params.get('status');

      if (!transactionId || payStatus !== 'successful') {
        Alert.alert('Payment not completed', 'The payment was not completed successfully.');
        return;
      }
      verify(transactionId);
    },
    onError: () => Alert.alert('Error', 'Could not initiate payment. Please try again.'),
  });

  return (
    <View style={[s.card, { backgroundColor: colors.surface, ...Shadow.card(colors.black) }]}>
      {/* Month + status */}
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
        <Text style={{ fontSize: FontSize.md, fontWeight: '800', color: colors.textPrimary, flex: 1 }}>
          {invoice.month_label}
        </Text>
        <View style={[s.statusBadge, { backgroundColor: meta.bg }]}>
          <Ionicons name={meta.icon as any} size={12} color={meta.color} />
          <Text style={{ fontSize: 11, fontWeight: '700', color: meta.color, marginLeft: 4 }}>{meta.label}</Text>
        </View>
      </View>

      {/* Line items */}
      {invoice.line_items.map(item => (
        <View key={item.id} style={[s.lineItem, { borderBottomColor: colors.border }]}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: FontSize.sm, fontWeight: '600', color: colors.textPrimary }} numberOfLines={1}>
              {item.group_name}
            </Text>
            <Text style={{ fontSize: FontSize.xs, color: colors.textSecondary, marginTop: 2 }}>
              {item.member_count} payers × ₦{parseFloat(item.contribution_amount).toLocaleString()} = ₦{parseFloat(item.monthly_earnings).toLocaleString()} earnings
            </Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={{ fontSize: FontSize.xs, color: colors.textTertiary }}>{item.rate_percent}</Text>
            <Text style={{ fontSize: FontSize.sm, fontWeight: '700', color: colors.textPrimary }}>
              ₦{parseFloat(item.fee).toLocaleString()}
            </Text>
          </View>
        </View>
      ))}

      {/* Total */}
      <View style={[s.totalRow, { borderTopColor: colors.border }]}>
        <Text style={{ fontSize: FontSize.sm, fontWeight: '700', color: colors.textSecondary }}>Total due</Text>
        <Text style={{ fontSize: FontSize.lg, fontWeight: '900', color: colors.textPrimary }}>
          ₦{totalFee.toLocaleString()}
        </Text>
      </View>

      {invoice.status !== 'paid' && !verified && (
        <>
          <TouchableOpacity
            onPress={() => pay()}
            disabled={paying || verifying}
            style={[s.payBtn, { backgroundColor: colors.primary, opacity: (paying || verifying) ? 0.6 : 1 }]}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel={`Pay ₦${totalFee.toLocaleString()} for ${invoice.month_label}`}
          >
            {paying || verifying
              ? <ActivityIndicator size="small" color="#fff" />
              : (
                <>
                  <Ionicons name="card-outline" size={18} color="#fff" />
                  <Text style={{ color: '#fff', fontWeight: '800', fontSize: FontSize.sm, marginLeft: 8 }}>
                    Pay ₦{totalFee.toLocaleString()}
                  </Text>
                </>
              )
            }
          </TouchableOpacity>
          {verifying && (
            <Text style={{ fontSize: FontSize.xs, color: colors.textSecondary, textAlign: 'center', marginTop: 8 }}>
              Verifying your payment…
            </Text>
          )}
          {verifyError ? (
            <Text style={{ fontSize: FontSize.xs, color: colors.error, marginTop: 8, textAlign: 'center' }}>{verifyError}</Text>
          ) : null}
        </>
      )}

      {(invoice.status === 'paid' || verified) && (
        <View style={[s.paidRow, { backgroundColor: '#E8F5E9' }]}>
          <Ionicons name="checkmark-circle" size={16} color="#2E7D32" />
          <Text style={{ color: '#2E7D32', fontWeight: '600', fontSize: FontSize.xs, marginLeft: 6 }}>
            {verified ? 'Payment verified!' : `Paid ${invoice.paid_at ? new Date(invoice.paid_at).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' }) : ''}`}
          </Text>
        </View>
      )}
    </View>
  );
}

export default function BillingScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const qc = useQueryClient();

  const { data: invoices, isLoading, refetch } = useQuery({
    queryKey: ['thrift-invoices'],
    queryFn: getMyInvoices,
  });

  const { data: billingStatus } = useQuery({
    queryKey: ['thrift-billing-status'],
    queryFn: getBillingStatus,
  });
  const canGenerate = billingStatus?.can_generate_invoice ?? false;

  const { mutate: generate, isPending: generating } = useMutation({
    mutationFn: generateMyInvoice,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['thrift-invoices'] });
      qc.invalidateQueries({ queryKey: ['thrift-billing-status'] });
    },
    onError: (e: any) => Alert.alert('Error', e?.response?.data?.detail ?? 'Could not generate invoice.'),
  });

  const pendingCount = (invoices ?? []).filter(i => i.status !== 'paid').length;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={[s.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 10, left: 10, bottom: 10, right: 10 }} accessibilityRole="button" accessibilityLabel="Go back">
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <View style={{ marginLeft: 16, flex: 1 }}>
          <Text style={{ fontSize: FontSize.md, fontWeight: '800', color: colors.textPrimary }} accessibilityRole="header">My Platform Bills</Text>
          {pendingCount > 0 && (
            <Text style={{ fontSize: FontSize.xs, color: colors.error, marginTop: 2 }}>
              {pendingCount} unpaid {pendingCount === 1 ? 'invoice' : 'invoices'}
            </Text>
          )}
        </View>
        <TouchableOpacity
          onPress={() => generate()}
          disabled={generating || !canGenerate}
          style={[s.generateBtn, { backgroundColor: colors.primaryTint, opacity: canGenerate ? 1 : 0.5 }]}
          accessibilityRole="button"
          accessibilityLabel="Generate invoice"
        >
          {generating
            ? <ActivityIndicator size="small" color={colors.primary} />
            : <Text style={{ color: colors.primary, fontWeight: '700', fontSize: FontSize.xs }}>Generate Invoice</Text>
          }
        </TouchableOpacity>
      </View>

      {/* Rate info banner */}
      <View style={[s.rateBanner, { backgroundColor: colors.primaryTint }]}>
        <Ionicons name="information-circle-outline" size={16} color={colors.primary} />
        <Text style={{ fontSize: FontSize.xs, color: colors.primary, marginLeft: 8, flex: 1, lineHeight: 18 }}>
          Platform fee is 0.5%–1.5% of your circle's total recorded payments, based on volume. Generated automatically once a circle completes.
        </Text>
      </View>

      <ScrollView contentContainerStyle={[s.body, { paddingBottom: 60 }]} showsVerticalScrollIndicator={false}>
        {isLoading ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
        ) : (invoices ?? []).length === 0 ? (
          <View style={{ alignItems: 'center', paddingVertical: 40 }}>
            <Ionicons name="receipt-outline" size={56} color={colors.primaryTint} />
            <Text style={{ fontSize: FontSize.md, fontWeight: '700', color: colors.textPrimary, marginTop: 16 }}>
              No invoices yet
            </Text>
            <Text style={{ fontSize: FontSize.sm, color: colors.textSecondary, marginTop: 6, textAlign: 'center', lineHeight: 20 }}>
              An invoice generates automatically once a circle completes, or tap "Generate Invoice" once one has.
            </Text>
          </View>
        ) : (
          (invoices ?? []).map(inv => (
            <InvoiceCard
              key={inv.id}
              invoice={inv}
              onVerified={() => qc.invalidateQueries({ queryKey: ['thrift-invoices'] })}
            />
          ))
        )}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 56, paddingBottom: 16, borderBottomWidth: 1,
  },
  generateBtn: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: Radius.md },
  rateBanner: { flexDirection: 'row', alignItems: 'flex-start', padding: 12, paddingHorizontal: 20 },
  body: { padding: 20 },
  card: { borderRadius: Radius.lg, padding: 16, marginBottom: 14 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 4, borderRadius: Radius.md },
  lineItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1 },
  totalRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 12, borderTopWidth: 1, marginTop: 4 },
  payBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderRadius: Radius.lg, marginTop: 14 },
  paidRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, borderRadius: Radius.md, marginTop: 12 },
});
