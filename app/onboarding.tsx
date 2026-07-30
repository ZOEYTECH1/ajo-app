import React, { useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  FlatList,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Svg, { Circle, Line, Path, Rect } from 'react-native-svg';
import { useRouter } from 'expo-router';
import { useTheme } from '../src/hooks/useTheme';
import { FontSize, Radius } from '../src/theme';
import AjoLogo from '../src/components/AjoLogo';

const { width, height } = Dimensions.get('window');
const ILLUS_SIZE = Math.min(240, Math.max(160, Math.floor(height * 0.27)));

// ─── Back Arrow ───────────────────────────────────────────────────────────────
const BackArrow = ({ color }: { color: string }) => (
  <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
    <Path
      d="M19 12H5M5 12L12 19M5 12L12 5"
      stroke={color}
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

// ─── Slide 2: Record Keeper ───────────────────────────────────────────────────
const RecordKeeperIllustration = ({
  primary, tint, success, size = 260,
}: { primary: string; tint: string; success: string; size?: number }) => (
  <Svg width={size} height={size} viewBox="0 0 260 260">
    <Circle cx="130" cy="130" r="110" fill={tint} opacity={0.4} />
    {/* Document */}
    <Rect x="62" y="50" width="120" height="160" rx="12" fill={primary} />
    <Rect x="62" y="50" width="120" height="160" rx="12" fill="#FFFFFF" opacity={0.08} />
    {/* Header */}
    <Line x1="82" y1="80"  x2="162" y2="80"  stroke="#FFFFFF" strokeWidth="5" strokeLinecap="round" opacity={0.9} />
    <Line x1="82" y1="93"  x2="140" y2="93"  stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round" opacity={0.4} />
    {/* Row 1 — approved */}
    <Circle cx="82" cy="120" r="9" fill={success} />
    <Path d="M77,120 L81,124 L88,115" fill="none" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    <Line x1="99" y1="116" x2="168" y2="116" stroke="#FFFFFF" strokeWidth="4" strokeLinecap="round" opacity={0.65} />
    <Line x1="99" y1="126" x2="152" y2="126" stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round" opacity={0.35} />
    {/* Row 2 — approved */}
    <Circle cx="82" cy="152" r="9" fill={success} />
    <Path d="M77,152 L81,156 L88,147" fill="none" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    <Line x1="99" y1="148" x2="168" y2="148" stroke="#FFFFFF" strokeWidth="4" strokeLinecap="round" opacity={0.65} />
    <Line x1="99" y1="158" x2="158" y2="158" stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round" opacity={0.35} />
    {/* Row 3 — pending */}
    <Circle cx="82" cy="184" r="9" fill="#FFFFFF" opacity={0.25} />
    <Line x1="99" y1="180" x2="168" y2="180" stroke="#FFFFFF" strokeWidth="4" strokeLinecap="round" opacity={0.35} />
    <Line x1="99" y1="190" x2="145" y2="190" stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round" opacity={0.2} />
    {/* Lock badge — top-right corner */}
    <Circle cx="176" cy="62" r="22" fill="#FFFFFF" />
    <Rect x="166" y="64" width="20" height="13" rx="3" fill={primary} />
    <Path d="M169,64 L169,59 Q176,52 183,59 L183,64" fill="none" stroke={primary} strokeWidth="3" strokeLinecap="round" />
    <Circle cx="176" cy="70" r="2.5" fill="#FFFFFF" />
  </Svg>
);

// ─── Slide 3: Trust ───────────────────────────────────────────────────────────
const TransparencyIllustration = ({
  primary, tint, success, size = 260,
}: { primary: string; tint: string; success: string; size?: number }) => (
  <Svg width={size} height={size} viewBox="0 0 260 260">
    <Circle cx="130" cy="130" r="110" fill={tint} opacity={0.4} />
    {/* Left member */}
    <Circle cx="72" cy="72" r="14" fill={primary} opacity={0.6} />
    <Path d="M52,106 Q52,90 72,90 Q92,90 92,106 Z" fill={primary} opacity={0.6} />
    {/* Centre member */}
    <Circle cx="130" cy="56" r="17" fill={primary} opacity={0.9} />
    <Path d="M108,97 Q108,78 130,78 Q152,78 152,97 Z" fill={primary} opacity={0.9} />
    {/* Right member */}
    <Circle cx="188" cy="72" r="14" fill={primary} opacity={0.6} />
    <Path d="M168,106 Q168,90 188,90 Q208,90 208,106 Z" fill={primary} opacity={0.6} />
    {/* Connector lines */}
    <Line x1="84"  y1="100" x2="100" y2="116" stroke={primary} strokeWidth="2" strokeLinecap="round" opacity={0.3} />
    <Line x1="130" y1="97"  x2="130" y2="116" stroke={primary} strokeWidth="2" strokeLinecap="round" opacity={0.3} />
    <Line x1="176" y1="100" x2="160" y2="116" stroke={primary} strokeWidth="2" strokeLinecap="round" opacity={0.3} />
    {/* Shared ledger */}
    <Rect x="72" y="116" width="116" height="104" rx="12" fill={primary} />
    <Rect x="72" y="116" width="116" height="104" rx="12" fill="#FFFFFF" opacity={0.08} />
    <Line x1="90" y1="144" x2="162" y2="144" stroke="#FFFFFF" strokeWidth="5" strokeLinecap="round" opacity={0.9} />
    <Line x1="90" y1="162" x2="148" y2="162" stroke="#FFFFFF" strokeWidth="4" strokeLinecap="round" opacity={0.5} />
    <Line x1="90" y1="178" x2="154" y2="178" stroke="#FFFFFF" strokeWidth="4" strokeLinecap="round" opacity={0.4} />
    {/* Shield badge — bottom-right */}
    <Circle cx="174" cy="212" r="24" fill="#FFFFFF" />
    <Path d="M174,197 L186,202 L186,214 Q186,224 174,228 Q162,224 162,214 L162,202 Z" fill={success} />
    <Path d="M167,212 L172,218 L182,205" fill="none" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

// ─── Slide 4: Join or Create ──────────────────────────────────────────────────
const JoinIllustration = ({ primary, tint, size = 260 }: { primary: string; tint: string; size?: number }) => (
  <Svg width={size} height={size} viewBox="0 0 260 260">
    <Circle cx="130" cy="130" r="110" fill={tint} opacity={0.4} />
    <Circle cx="130" cy="130" r="72" fill="none" stroke={primary} strokeWidth="3" opacity={0.3} />
    <Circle cx="130" cy="130" r="88" fill="none" stroke={primary} strokeWidth="2" opacity={0.15} />
    <Circle cx="130" cy="58"  r="20" fill={primary} />
    <Path d="M108,98 Q108,78 130,78 Q152,78 152,98 Z" fill={primary} />
    <Circle cx="192" cy="92"  r="16" fill={primary} opacity={0.7} />
    <Path d="M173,124 Q173,108 192,108 Q211,108 211,124 Z" fill={primary} opacity={0.7} />
    <Circle cx="192" cy="168" r="16" fill={primary} opacity={0.7} />
    <Path d="M173,200 Q173,184 192,184 Q211,184 211,200 Z" fill={primary} opacity={0.7} />
    <Circle cx="68"  cy="92"  r="16" fill={primary} opacity={0.7} />
    <Path d="M49,124 Q49,108 68,108 Q87,108 87,124 Z" fill={primary} opacity={0.7} />
    <Circle cx="68"  cy="168" r="16" fill={primary} opacity={0.7} />
    <Path d="M49,200 Q49,184 68,184 Q87,184 87,200 Z" fill={primary} opacity={0.7} />
    <Circle cx="130" cy="148" r="22" fill={primary} />
    <Line x1="130" y1="138" x2="130" y2="158" stroke="#FFFFFF" strokeWidth="4" strokeLinecap="round" />
    <Line x1="120" y1="148" x2="140" y2="148" stroke="#FFFFFF" strokeWidth="4" strokeLinecap="round" />
  </Svg>
);

// ─── Slide content ────────────────────────────────────────────────────────────
const SLIDES = [
  {
    id: '1',
    title: 'Welcome to\nAjo',
    subtitle: 'Your circle. Your money. Your record. A trusted digital ledger for your savings group.',
  },
  {
    id: '2',
    title: 'We only\nkeep records',
    subtitle: 'Ajo never holds or moves a single naira. Members pay each other directly — we document every contribution with permanent proof.',
  },
  {
    id: '3',
    title: 'Built on\ntrust',
    subtitle: 'Every record is permanent and tamper-proof. No member, no admin can alter what Ajo has sealed. Your group\'s truth, forever.',
  },
  {
    id: '4',
    title: 'Join or\ncreate',
    subtitle: 'Start a new Ajo group or join an existing one — set up in minutes, running for life.',
  },
] as const;

export default function OnboardingScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const [index, setIndex] = useState(0);
  const scrollX = useRef(new Animated.Value(0)).current;
  const flatRef = useRef<FlatList>(null);
  const isLast = index === SLIDES.length - 1;

  const goTo = (i: number) => {
    flatRef.current?.scrollToOffset({ offset: i * width, animated: true });
    setIndex(i);
  };

  const handleNext = () => (isLast ? router.replace('/login') : goTo(index + 1));
  const handleSkip = () => router.replace('/login');

  const illustrations: Record<string, React.ReactNode> = {
    '1': <AjoLogo width={ILLUS_SIZE} height={ILLUS_SIZE} />,
    '2': <RecordKeeperIllustration primary={colors.primary} tint={colors.primaryTint} success={colors.success} size={ILLUS_SIZE} />,
    '3': <TransparencyIllustration primary={colors.primary} tint={colors.primaryTint} success={colors.success} size={ILLUS_SIZE} />,
    '4': <JoinIllustration primary={colors.primary} tint={colors.primaryTint} size={ILLUS_SIZE} />,
  };

  return (
    <View style={[s.container, { backgroundColor: colors.background }]}>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor={colors.background}
      />

      {/* Header */}
      <View style={s.header}>
        {index > 0 ? (
          <TouchableOpacity
            style={[s.iconBtn, { backgroundColor: colors.surface }]}
            onPress={() => goTo(index - 1)}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <BackArrow color={colors.primary} />
          </TouchableOpacity>
        ) : (
          <View style={{ width: 44 }} />
        )}

        {!isLast && (
          <TouchableOpacity
            style={[s.skipBtn, { backgroundColor: colors.primaryTint }]}
            onPress={handleSkip}
            accessibilityRole="button"
            accessibilityLabel="Skip onboarding"
          >
            <Text style={[s.skipText, { color: colors.primary }]}>Skip</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Slides */}
      <Animated.FlatList
        style={{ flex: 1 }}
        ref={flatRef}
        data={SLIDES}
        horizontal
        pagingEnabled
        scrollEnabled={false}
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => item.id}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { x: scrollX } } }],
          { useNativeDriver: false },
        )}
        renderItem={({ item, index: i }) => {
          const inputRange = [(i - 1) * width, i * width, (i + 1) * width];
          const translateX = scrollX.interpolate({ inputRange, outputRange: [width * 0.35, 0, -width * 0.35] });
          const opacity = scrollX.interpolate({ inputRange, outputRange: [0, 1, 0] });
          const textTranslateY = scrollX.interpolate({ inputRange, outputRange: [50, 0, -50] });

          return (
            <View style={s.slide}>
              <Animated.View style={[s.illustrationWrap, { transform: [{ translateX }] }]}>
                {illustrations[item.id]}
              </Animated.View>
              <Animated.View style={{ opacity, transform: [{ translateY: textTranslateY }] }}>
                <Text accessibilityRole="header" style={[s.title, { color: colors.textPrimary }]}>{item.title}</Text>
                <Text style={[s.subtitle, { color: colors.textSecondary }]}>{item.subtitle}</Text>
              </Animated.View>
            </View>
          );
        }}
      />

      {/* Bottom */}
      <View style={s.bottom}>
        <View style={s.dots}>
          {SLIDES.map((_, i) => {
            const inputRange = [(i - 1) * width, i * width, (i + 1) * width];
            const dotWidth = scrollX.interpolate({ inputRange, outputRange: [8, 24, 8], extrapolate: 'clamp' });
            const dotOpacity = scrollX.interpolate({ inputRange, outputRange: [0.3, 1, 0.3], extrapolate: 'clamp' });
            return (
              <Animated.View
                key={i}
                style={[s.dot, { width: dotWidth, opacity: dotOpacity, backgroundColor: colors.primary }]}
              />
            );
          })}
        </View>

        <TouchableOpacity
          style={[s.btn, { backgroundColor: isLast ? colors.success : colors.primary }]}
          onPress={handleNext}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel={isLast ? 'Get started' : 'Continue'}
          accessibilityHint={isLast ? 'Double tap to get started' : 'Double tap to go to the next slide'}
        >
          <Text style={s.btnText}>{isLast ? 'Get Started' : 'Continue'}</Text>
        </TouchableOpacity>

        {isLast && (
          <TouchableOpacity onPress={handleSkip} style={{ marginTop: 16 }} accessibilityRole="link" accessibilityLabel="Go to login">
            <Text style={[s.loginLink, { color: colors.textSecondary }]}>
              Already have an account?{' '}
              <Text style={{ color: colors.primary, fontWeight: '700' }}>Log in</Text>
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container:        { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 54,
    height: 100,
    zIndex: 10,
  },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  skipBtn: {
    paddingVertical: 8,
    paddingHorizontal: 18,
    borderRadius: Radius.full,
  },
  skipText:         { fontSize: FontSize.sm, fontWeight: '700' },
  slide: {
    width,
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingTop: height * 0.04,
    paddingBottom: 32,
  },
  illustrationWrap: {
    width: ILLUS_SIZE,
    height: ILLUS_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: height < 750 ? 14 : 22,
  },
  title: {
    fontSize: FontSize.hero - 4,
    fontWeight: '900',
    textAlign: 'center',
    lineHeight: 42,
    marginBottom: 10,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: FontSize.md,
    textAlign: 'center',
    lineHeight: 26,
    paddingHorizontal: 8,
  },
  bottom: {
    paddingHorizontal: 28,
    paddingBottom: 48,
    paddingTop: 8,
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 28,
  },
  dot:              { height: 8, borderRadius: 4, marginHorizontal: 4 },
  btn: {
    height: 58,
    borderRadius: Radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnText:          { fontSize: FontSize.md, fontWeight: '700', color: '#FFFFFF', letterSpacing: 0.3 },
  loginLink:        { textAlign: 'center', fontSize: FontSize.sm },
});
