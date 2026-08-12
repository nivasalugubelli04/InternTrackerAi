import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { Colors, BorderRadius } from '../../theme';

interface LoadingSkeletonProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: object;
}

export function LoadingSkeleton({
  width = '100%',
  height = 20,
  borderRadius = BorderRadius.sm,
  style,
}: LoadingSkeletonProps): React.ReactElement {
  const shimmer = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, { toValue: 1, duration: 900, useNativeDriver: true }),
        Animated.timing(shimmer, { toValue: 0, duration: 900, useNativeDriver: true }),
      ]),
    ).start();
  }, [shimmer]);

  const opacity = shimmer.interpolate({ inputRange: [0, 1], outputRange: [0.4, 0.8] });

  return (
    <Animated.View
      style={[
        styles.skeleton,
        { width: width as number, height, borderRadius, opacity },
        style,
      ]}
    />
  );
}

export function ProfileSkeleton(): React.ReactElement {
  return (
    <View style={styles.profileSkeleton}>
      <LoadingSkeleton width={80} height={80} borderRadius={40} style={{ alignSelf: 'center', marginBottom: 16 }} />
      <LoadingSkeleton height={24} style={{ marginBottom: 8 }} />
      <LoadingSkeleton width="60%" height={16} style={{ marginBottom: 24, alignSelf: 'center' }} />
      <LoadingSkeleton height={100} borderRadius={12} style={{ marginBottom: 12 }} />
      <LoadingSkeleton height={100} borderRadius={12} style={{ marginBottom: 12 }} />
      <LoadingSkeleton height={100} borderRadius={12} />
    </View>
  );
}

const styles = StyleSheet.create({
  skeleton: { backgroundColor: Colors.background.tertiary },
  profileSkeleton: { padding: 24 },
});
