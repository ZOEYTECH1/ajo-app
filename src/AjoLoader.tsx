import React, { useRef, useEffect } from 'react';
import { Animated, Easing, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useTheme } from './hooks/useTheme';

interface AjoLoaderProps {
  size?: number;
}

export const AjoLoader: React.FC<AjoLoaderProps> = ({ size = 64 }) => {
  const { isDark } = useTheme();

  const ringLight  = isDark ? '#6B96FF' : '#4D7EFF';
  const ringDark   = isDark ? '#0035F0' : '#0028C2';
  const markFill   = isDark ? '#4ADE80' : '#22C55E';

  const spinAnim  = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.timing(spinAnim, {
        toValue: 1,
        duration: 2400,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 850,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 850,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  const spin = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <View style={{ width: size, height: size }} accessible={true} accessibilityLabel="Loading" accessibilityLiveRegion="polite">
      {/* Ring — spins continuously */}
      <Animated.View
        style={{ position: 'absolute', width: size, height: size, backgroundColor: 'transparent', zIndex: 1, transform: [{ rotate: spin }] }}
      >
        <Svg width={size} height={size} viewBox="0 0 200 200">
          <Path
            d="M113.9,21.2 A80,80 0 0,1 113.9,178.8"
            fill="none"
            stroke={ringLight}
            strokeWidth="18"
            strokeLinecap="round"
          />
          <Path
            d="M86.1,178.8 A80,80 0 0,1 86.1,21.2"
            fill="none"
            stroke={ringDark}
            strokeWidth="18"
            strokeLinecap="round"
          />
        </Svg>
      </Animated.View>

      {/* Shield + checkmark — pulses independently (zIndex 2 keeps it on top of ring on Android) */}
      <Animated.View
        style={{ position: 'absolute', width: size, height: size, backgroundColor: 'transparent', zIndex: 2, transform: [{ scale: pulseAnim }] }}
      >
        <Svg width={size} height={size} viewBox="0 0 200 200">
          <Path
            d="M100,65 L70,80 L70,110 Q70,135 100,145 Q130,135 130,110 L130,80 Z"
            fill={markFill}
            stroke="#FFFFFF"
            strokeWidth="2"
          />
          <Path
            d="M80,108 L95,123 L122,88"
            fill="none"
            stroke="#FFFFFF"
            strokeWidth="8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
      </Animated.View>
    </View>
  );
};
