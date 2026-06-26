import React from 'react';
import { View, StyleSheet, Text } from 'react-native';
import Svg, { Rect, Defs, Pattern, Line, Mask } from 'react-native-svg';

interface StripedJarProps {
  percentage: number; // 0 to 100
  color: string;      // Color for the fill and badge
  label?: string;     // Option label
}

export const StripedJar: React.FC<StripedJarProps> = ({ percentage, color, label }) => {
  const fillHeight = (percentage / 100) * 110; // Total jar height inside SVG mask is 110
  
  // Custom unique pattern IDs to prevent cache overlap
  const patternIdBg = `stripes-bg-${color.replace('#', '')}`;
  const patternIdFg = `stripes-fg-${color.replace('#', '')}`;
  const maskId = `jar-mask-${color.replace('#', '')}`;

  return (
    <View style={styles.container}>
      <View style={styles.jarWrapper}>
        <Svg width="45" height="120" viewBox="0 0 45 120">
          <Defs>
            {/* Background stripes: Light gray */}
            <Pattern
              id={patternIdBg}
              width="12"
              height="12"
              patternUnits="userSpaceOnUse"
              patternTransform="rotate(45)"
            >
              <Line x1="0" y1="0" x2="0" y2="12" stroke="#e0e0e0" strokeWidth="4" />
              <Line x1="0" y1="0" x2="12" y2="0" stroke="#e0e0e0" strokeWidth="4" />
            </Pattern>

            {/* Foreground stripes: Colored matching the fund type */}
            <Pattern
              id={patternIdFg}
              width="12"
              height="12"
              patternUnits="userSpaceOnUse"
              patternTransform="rotate(45)"
            >
              <Line x1="0" y1="0" x2="0" y2="12" stroke={color} strokeWidth="4.5" />
              <Line x1="0" y1="0" x2="12" y2="0" stroke={color} strokeWidth="4.5" />
            </Pattern>

            {/* Mask to ensure stripes stay inside the capsule jar shape */}
            <Mask id={maskId}>
              <Rect x="2" y="2" width="41" height="116" rx="20.5" ry="20.5" fill="#ffffff" />
            </Mask>
          </Defs>

          {/* Jar Outline / Border */}
          <Rect
            x="1"
            y="1"
            width="43"
            height="118"
            rx="21.5"
            ry="21.5"
            fill="none"
            stroke="#e5e5ea"
            strokeWidth="1.5"
          />

          {/* Background Layer with light gray stripes */}
          <Rect
            x="2"
            y="2"
            width="41"
            height="116"
            rx="20.5"
            ry="20.5"
            fill={`url(#${patternIdBg})`}
            mask={`url(#${maskId})`}
          />

          {/* Filled Layer with colored stripes rising from the bottom */}
          <Rect
            x="2"
            y={118 - fillHeight}
            width="41"
            height={fillHeight}
            fill={`url(#${patternIdFg})`}
            mask={`url(#${maskId})`}
          />
        </Svg>

        {/* Floating Percentage Badge in the center of the jar */}
        <View style={[styles.percentBadge, { backgroundColor: color }]}>
          <Text style={styles.percentText}>{Math.round(percentage)}%</Text>
        </View>
      </View>
      {label && <Text style={styles.label}>{label}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    marginHorizontal: 8,
  },
  jarWrapper: {
    position: 'relative',
    width: 45,
    height: 120,
    justifyContent: 'center',
    alignItems: 'center',
  },
  percentBadge: {
    position: 'absolute',
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#ffffff',
    // Soft shadow for the overlay badge
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
    elevation: 2,
  },
  percentText: {
    color: '#ffffff',
    fontSize: 10,
    fontFamily: 'SF Pro Text, system-ui, -apple-system, sans-serif',
    fontWeight: '700',
  },
  label: {
    marginTop: 6,
    fontSize: 12,
    color: '#1d1d1f',
    textAlign: 'center',
    fontWeight: '500',
  },
});
