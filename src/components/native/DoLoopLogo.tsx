import React from 'react';
import { View, Image, Platform, StyleSheet } from 'react-native';

interface DoLoopLogoProps {
  size?: number;
  color?: string;
  showText?: boolean;
}

/**
 * DoLoop Logo Component
 * Uses official SVG for web, fallback for native
 */
export const DoLoopLogo: React.FC<DoLoopLogoProps> = ({ 
  size = 120,
}) => {
  const logoWidth = size;
  const logoHeight = size * 0.93; // Aspect ratio from SVG (649.36 / 696.76)

  if (Platform.OS === 'web') {
    return (
      <Image
        source={{ uri: '/doloop-logo-full.svg' }}
        style={{
          width: logoWidth,
          height: logoHeight,
          resizeMode: 'contain',
        }}
        accessible={true}
        accessibilityLabel="DoLoop Logo"
      />
    );
  }

  // For native, you'll need PNG exports
  // Export 3 sizes: @1x, @2x, @3x and place in /assets/images/
  return (
    <View style={styles.container}>
      <Image
        source={require('../../../assets/icon.png')} // Placeholder - replace with actual logo
        style={{
          width: logoWidth,
          height: logoHeight,
          resizeMode: 'contain',
        }}
        accessible={true}
        accessibilityLabel="DoLoop Logo"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});

