import React from 'react';
import { View } from 'react-native';
import AjoLogo from './components/AjoLogo';

interface AjoLoaderProps {
  size?: number;
}

// Uses the same full brand mark (AjoLogo, 3-person + naira) as the splash
// screen, instead of a separate simplified ring+shield spinner -- one mark
// for the whole app. AjoLogo's own staged reveal + naira-float animation
// plays each time this mounts.
export const AjoLoader: React.FC<AjoLoaderProps> = ({ size = 64 }) => {
  return (
    <View accessible accessibilityLabel="Loading" accessibilityLiveRegion="polite">
      <AjoLogo width={size} height={size * (620 / 680)} />
    </View>
  );
};
