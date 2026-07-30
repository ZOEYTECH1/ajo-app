import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Linking } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../src/hooks/useTheme';
import { FontSize, Radius } from '../../src/theme';

const CONTACT_EMAIL = 'chibuzormekalam@gmail.com';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const { colors } = useTheme();
  return (
    <View style={{ marginBottom: 24 }}>
      <Text accessibilityRole="header" style={{ fontSize: FontSize.sm, fontWeight: '800', color: colors.textPrimary, marginBottom: 8 }}>{title}</Text>
      {children}
    </View>
  );
}

function Body({ text }: { text: string }) {
  const { colors } = useTheme();
  return <Text style={{ fontSize: FontSize.sm, color: colors.textSecondary, lineHeight: 22 }}>{text}</Text>;
}

function Bullet({ text }: { text: string }) {
  const { colors } = useTheme();
  return (
    <View style={{ flexDirection: 'row', marginBottom: 4 }}>
      <Text style={{ color: colors.textSecondary, marginRight: 8, lineHeight: 22 }}>•</Text>
      <Text style={{ fontSize: FontSize.sm, color: colors.textSecondary, lineHeight: 22, flex: 1 }}>{text}</Text>
    </View>
  );
}

export default function PrivacyRoute() {
  const { colors } = useTheme();
  const router = useRouter();

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Header */}
      <View style={[s.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 10, left: 10, bottom: 10, right: 10 }} accessibilityRole="button" accessibilityLabel="Go back">
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text accessibilityRole="header" style={{ fontSize: FontSize.md, fontWeight: '700', color: colors.textPrimary, marginLeft: 16 }}>
          Privacy & Terms
        </Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 60 }} showsVerticalScrollIndicator={false}>
        <Text style={{ fontSize: FontSize.xs, color: colors.textTertiary, marginBottom: 24 }}>
          Last updated: July 2026
        </Text>

        {/* Privacy Policy */}
        <Text accessibilityRole="header" style={{ fontSize: FontSize.lg, fontWeight: '900', color: colors.textPrimary, marginBottom: 20 }}>
          Privacy Policy
        </Text>

        <Section title="What We Collect">
          <Bullet text="Name, email, phone number — for your account" />
          <Bullet text="Profile photo — shown to group members" />
          <Bullet text="Payment amounts and receipt images — for the group audit trail" />
          <Bullet text="Inventory data (products, sales, expenses) — for your business tools" />
          <Bullet text="Device push token — to send you notifications" />
        </Section>

        <Section title="What We Never Collect">
          <Bullet text="Bank account numbers or card details" />
          <Bullet text="BVN or National ID" />
          <Bullet text="Your location" />
        </Section>

        <Section title="How We Use Your Data">
          <Body text="We use your data only to operate Ajo — to run your account, manage group memberships, send notifications, and provide inventory tools. We do not sell your data or use it for advertising." />
        </Section>

        <Section title="Receipt Images & OCR">
          <Body text="When you submit a payment, your receipt image is analysed by Google Cloud Vision (AI/OCR) to extract the amount. This helps group admins verify payments faster. The result is stored alongside your receipt and visible only to your group admin." />
        </Section>

        <Section title="Data Storage">
          <Bullet text="Database: Neon PostgreSQL (encrypted, cloud-hosted)" />
          <Bullet text="Images: Cloudinary (cloud storage)" />
          <Bullet text="All connections use HTTPS (TLS encryption)" />
          <Bullet text="Financial records kept for 7 years (Nigerian law)" />
          <Bullet text="OTP codes deleted within 10 minutes" />
        </Section>

        <Section title="Your Rights (NDPR & GDPR)">
          <Body text="You have the right to access, correct, or delete your personal data. To exercise these rights, contact us at the email below. We respond within 30 days." />
        </Section>

        <Section title="Third-Party Services">
          <Body text="Ajo uses Neon, Cloudinary, Google Firebase, Google Cloud Vision, Sentry, Upstash Redis, and Render for hosting. Each has their own privacy policy. We do not share your data with any other third parties." />
        </Section>

        {/* Divider */}
        <View style={{ height: 1, backgroundColor: colors.border, marginVertical: 28 }} />

        {/* Terms of Service */}
        <Text accessibilityRole="header" style={{ fontSize: FontSize.lg, fontWeight: '900', color: colors.textPrimary, marginBottom: 20 }}>
          Terms of Service
        </Text>

        <Section title="What Ajo Is">
          <Body text="Ajo is a digital record-keeping tool for savings groups. It records that contributions happened — it does NOT hold, move, or process money. All transactions happen between members in real life." />
        </Section>

        <Section title="Your Responsibilities">
          <Bullet text="Provide accurate registration information" />
          <Bullet text="Keep your login credentials secure" />
          <Bullet text="Use the app only for lawful purposes" />
          <Bullet text="Do not submit fraudulent receipts or manipulated images" />
          <Bullet text="Do not attempt to hack, reverse-engineer, or abuse the platform" />
        </Section>

        <Section title="Intellectual Property">
          <Body text="All code, design, and branding belongs to Ajo. Your uploaded content (photos, receipts) remains yours — you grant us a limited licence to store and display it solely for operating your account." />
        </Section>

        <Section title="Limitation of Liability">
          <Body text="Ajo is not liable for financial disputes between group members, losses arising from use of the app, or third-party service outages. Our maximum liability in any 12-month period is ₦10,000." />
        </Section>

        <Section title="Governing Law">
          <Body text="These terms are governed by the laws of the Federal Republic of Nigeria." />
        </Section>

        {/* Contact */}
        <View style={[s.contactCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={{ fontSize: FontSize.sm, fontWeight: '700', color: colors.textPrimary, marginBottom: 6 }}>
            Questions or data requests?
          </Text>
          <TouchableOpacity onPress={() => Linking.openURL(`mailto:${CONTACT_EMAIL}`)} accessibilityRole="link" accessibilityLabel={`Send email to ${CONTACT_EMAIL}`}>
            <Text style={{ fontSize: FontSize.sm, color: colors.primary }}>{CONTACT_EMAIL}</Text>
          </TouchableOpacity>
        </View>
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
    borderRadius: Radius.lg, borderWidth: 1,
    padding: 16, marginTop: 8,
  },
});
