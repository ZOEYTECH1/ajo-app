import { useState } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView,
  StyleSheet, Linking, LayoutAnimation, Platform, UIManager,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../src/hooks/useTheme';
import { FontSize, Radius, Shadow } from '../../src/theme';

if (Platform.OS === 'android') {
  UIManager.setLayoutAnimationEnabledExperimental?.(true);
}

const SUPPORT_EMAIL = 'support@ajoapp.ng';
const WHATSAPP_NUMBER = '+2348000000000'; // placeholder

const FAQS: { q: string; a: string }[] = [
  {
    q: 'What is Ajo and how does it work?',
    a: 'Ajo is a digital record-keeping app for traditional Nigerian savings circles (Ajo/Esusu/Adashe). Members pool money in real life — the app records and verifies that contributions happened. It never holds or moves money.',
  },
  {
    q: 'Does Ajo hold or transfer my money?',
    a: 'No. Ajo only records contributions. All actual money exchanges happen directly between members as they always have. We create a tamper-evident audit trail so everyone can trust the records.',
  },
  {
    q: 'How do I join a group?',
    a: 'Ask your group admin for the 8-character invite code. On the home screen, tap "Join an Ajo Group" and enter the code. You\'ll be added instantly.',
  },
  {
    q: 'How do I record a contribution?',
    a: 'Open your group, tap "Submit Payment", enter the amount and optionally attach a photo proof (e.g. bank transfer screenshot). Your admin will approve or query it.',
  },
  {
    q: 'What happens if my payment is queried?',
    a: 'The admin marks your payment as disputed. You\'ll get a notification. You can resubmit with better proof or contact your admin directly to resolve it.',
  },
  {
    q: 'Can I use Ajo for my business inventory?',
    a: 'Yes. The Inventory tab lets you track products, record sales, log expenses, and view a daily profit & loss dashboard. It works for both retail shops and warehouses.',
  },
  {
    q: 'How does the low-stock alert work?',
    a: 'Each product has a low-stock threshold you can set. When stock falls at or below that number, you get a push notification and the product appears in the dashboard alert section.',
  },
  {
    q: 'How do expiry date alerts work?',
    a: 'Set an expiry date on any product when adding or editing it. You\'ll receive a push notification 30 days before expiry (warning) and again 7 days before (urgent). Expired products never trigger alerts.',
  },
  {
    q: 'Can I have multiple business locations?',
    a: 'Yes. Create separate locations (retail or warehouse) under Locations. Each has its own stock, sales, and staff. Managers can transfer stock between locations.',
  },
  {
    q: 'How do I invite staff to my business?',
    a: 'Go to the Inventory tab → Staff. Tap the + button and enter their registered Ajo email. They must already have an Ajo account. Choose their role: Staff, Manager, or Owner.',
  },
  {
    q: 'I forgot my password. How do I reset it?',
    a: 'On the login screen, tap "Forgot password?" and enter your email. You\'ll receive a reset link. Check your spam folder if it doesn\'t arrive within a minute.',
  },
  {
    q: 'How do I delete my account?',
    a: 'Go to your Profile screen and scroll to the bottom. Tap "Delete Account". This is permanent and cannot be undone — all your data will be removed.',
  },
];

function FAQItem({ q, a }: { q: string; a: string }) {
  const { colors } = useTheme();
  const [open, setOpen] = useState(false);

  const toggle = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setOpen(v => !v);
  };

  return (
    <TouchableOpacity
      onPress={toggle}
      activeOpacity={0.8}
      style={[s.faqCard, { backgroundColor: colors.surface, borderColor: open ? colors.primary : colors.border }]}
    >
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
        <Text style={{ flex: 1, fontSize: FontSize.sm, fontWeight: '700', color: colors.textPrimary, lineHeight: 20 }}>
          {q}
        </Text>
        <Ionicons
          name={open ? 'chevron-up' : 'chevron-down'}
          size={18}
          color={open ? colors.primary : colors.textTertiary}
          style={{ marginTop: 1 }}
        />
      </View>
      {open && (
        <Text style={{ fontSize: FontSize.sm, color: colors.textSecondary, lineHeight: 21, marginTop: 10 }}>
          {a}
        </Text>
      )}
    </TouchableOpacity>
  );
}

export default function HelpScreen() {
  const { colors } = useTheme();
  const router = useRouter();

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={[s.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 10, left: 10, bottom: 10, right: 10 }}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <View style={{ marginLeft: 16 }}>
          <Text style={{ fontSize: FontSize.lg, fontWeight: '800', color: colors.textPrimary }}>Help & Support</Text>
          <Text style={{ fontSize: FontSize.xs, color: colors.textSecondary, marginTop: 2 }}>Frequently asked questions</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 60 }} showsVerticalScrollIndicator={false}>
        {/* Contact cards */}
        <View style={{ flexDirection: 'row', gap: 10, marginBottom: 24 }}>
          <TouchableOpacity
            onPress={() => Linking.openURL(`mailto:${SUPPORT_EMAIL}`)}
            style={[s.contactCard, { backgroundColor: colors.surface, borderColor: colors.border, flex: 1 }]}
            activeOpacity={0.8}
          >
            <View style={[s.contactIcon, { backgroundColor: '#E8F5E9' }]}>
              <Ionicons name="mail-outline" size={22} color="#2E7D32" />
            </View>
            <Text style={{ fontSize: FontSize.xs, fontWeight: '700', color: colors.textPrimary, marginTop: 8 }}>Email us</Text>
            <Text style={{ fontSize: 10, color: colors.textSecondary, marginTop: 2 }}>support@ajoapp.ng</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => Linking.openURL(`https://wa.me/${WHATSAPP_NUMBER.replace('+', '')}`)}
            style={[s.contactCard, { backgroundColor: colors.surface, borderColor: colors.border, flex: 1 }]}
            activeOpacity={0.8}
          >
            <View style={[s.contactIcon, { backgroundColor: '#E8F5E9' }]}>
              <Ionicons name="logo-whatsapp" size={22} color="#25D366" />
            </View>
            <Text style={{ fontSize: FontSize.xs, fontWeight: '700', color: colors.textPrimary, marginTop: 8 }}>WhatsApp</Text>
            <Text style={{ fontSize: 10, color: colors.textSecondary, marginTop: 2 }}>Chat with support</Text>
          </TouchableOpacity>
        </View>

        <Text style={{ fontSize: FontSize.xs, fontWeight: '700', color: colors.textSecondary,
          textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12 }}>
          Frequently Asked Questions
        </Text>

        {FAQS.map((item, i) => (
          <FAQItem key={i} q={item.q} a={item.a} />
        ))}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 56, paddingBottom: 16, borderBottomWidth: 1,
  },
  contactCard: {
    borderWidth: 1, borderRadius: Radius.lg,
    padding: 16, alignItems: 'center',
  },
  contactIcon: {
    width: 44, height: 44, borderRadius: 22,
    alignItems: 'center', justifyContent: 'center',
  },
  faqCard: {
    borderWidth: 1.5, borderRadius: Radius.md,
    padding: 14, marginBottom: 8,
  },
});
