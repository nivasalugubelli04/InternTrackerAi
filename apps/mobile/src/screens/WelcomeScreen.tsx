import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  Dimensions,
  Animated,
  Easing,
} from 'react-native';

import { Colors, Typography, Spacing, BorderRadius } from '../theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

/**
 * WelcomeScreen — Phase 0 placeholder.
 *
 * Displays a branded splash-style screen that confirms the Expo app
 * bootstrapped correctly. This will be replaced by actual navigation
 * and authentication flows in Phase 1.
 */
export default function WelcomeScreen(): React.ReactElement {
  const pulseAnim = React.useRef(new Animated.Value(1)).current;
  const slideAnim = React.useRef(new Animated.Value(40)).current;
  const fadeAnim = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    // Entrance animation
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 900,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 900,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();

    // Pulse glow animation on the logo circle
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.12,
          duration: 1800,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1800,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    ).start();
  }, [pulseAnim, slideAnim, fadeAnim]);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.background.primary} />

      {/* Background glow orbs */}
      <View style={[styles.orb, styles.orbTopLeft]} />
      <View style={[styles.orb, styles.orbBottomRight]} />

      <Animated.View
        style={[
          styles.content,
          { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
        ]}
      >
        {/* Logo */}
        <Animated.View style={[styles.logoContainer, { transform: [{ scale: pulseAnim }] }]}>
          <View style={styles.logoInner}>
            <Text style={styles.logoEmoji}>🎯</Text>
          </View>
        </Animated.View>

        {/* Brand name */}
        <Text style={styles.appName}>InternTracker</Text>
        <Text style={styles.appNameAccent}>AI</Text>

        {/* Tagline */}
        <Text style={styles.tagline}>
          Your intelligent internship{'\n'}monitoring companion
        </Text>

        {/* Status badge */}
        <View style={styles.badge}>
          <View style={styles.badgeDot} />
          <Text style={styles.badgeText}>Phase 0 · Foundation Ready</Text>
        </View>

        {/* Tech stack pills */}
        <View style={styles.pillRow}>
          {['React Native', 'NestJS', 'PostgreSQL', 'Redis'].map((tech) => (
            <View key={tech} style={styles.pill}>
              <Text style={styles.pillText}>{tech}</Text>
            </View>
          ))}
        </View>
      </Animated.View>

      {/* Footer */}
      <Animated.View style={[styles.footer, { opacity: fadeAnim }]}>
        <Text style={styles.footerText}>Built with ♥ by the InternTracker team</Text>
        <Text style={styles.versionText}>v0.0.1 · Development Build</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.primary,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },

  // ── Background glow orbs ──────────────────────────────────────────────────
  orb: {
    position: 'absolute',
    width: SCREEN_WIDTH * 0.85,
    height: SCREEN_WIDTH * 0.85,
    borderRadius: SCREEN_WIDTH * 0.425,
    opacity: 0.12,
  },
  orbTopLeft: {
    backgroundColor: Colors.brand.purple,
    top: -SCREEN_WIDTH * 0.35,
    left: -SCREEN_WIDTH * 0.35,
  },
  orbBottomRight: {
    backgroundColor: Colors.brand.pink,
    bottom: -SCREEN_WIDTH * 0.4,
    right: -SCREEN_WIDTH * 0.35,
  },

  // ── Main content ──────────────────────────────────────────────────────────
  content: {
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
  },

  // ── Logo ──────────────────────────────────────────────────────────────────
  logoContainer: {
    width: 96,
    height: 96,
    borderRadius: BorderRadius.xl,
    backgroundColor: Colors.glass.surface,
    borderWidth: 1.5,
    borderColor: Colors.glass.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
  },
  logoInner: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoEmoji: {
    fontSize: 44,
  },

  // ── Typography ────────────────────────────────────────────────────────────
  appName: {
    fontSize: Typography.fontSize['3xl'],
    fontWeight: Typography.fontWeight.extrabold,
    color: Colors.text.primary,
    letterSpacing: -0.5,
  },
  appNameAccent: {
    fontSize: Typography.fontSize['4xl'],
    fontWeight: Typography.fontWeight.extrabold,
    color: Colors.brand.purpleLight,
    letterSpacing: 2,
    marginTop: -8,
    marginBottom: Spacing.md,
  },
  tagline: {
    fontSize: Typography.fontSize.md,
    fontWeight: Typography.fontWeight.regular,
    color: Colors.text.secondary,
    textAlign: 'center',
    lineHeight: Typography.fontSize.md * Typography.lineHeight.relaxed,
    marginBottom: Spacing.xl,
  },

  // ── Status badge ──────────────────────────────────────────────────────────
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.glass.surface,
    borderWidth: 1,
    borderColor: Colors.glass.border,
    borderRadius: BorderRadius.full,
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.xl,
    gap: Spacing.xs,
  },
  badgeDot: {
    width: 8,
    height: 8,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.success,
  },
  badgeText: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.medium,
    color: Colors.text.secondary,
  },

  // ── Tech stack pills ──────────────────────────────────────────────────────
  pillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  pill: {
    backgroundColor: Colors.background.tertiary,
    borderWidth: 1,
    borderColor: Colors.border.default,
    borderRadius: BorderRadius.full,
    paddingVertical: Spacing.xs - 2,
    paddingHorizontal: Spacing.sm + 4,
  },
  pillText: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.medium,
    color: Colors.text.muted,
  },

  // ── Footer ────────────────────────────────────────────────────────────────
  footer: {
    position: 'absolute',
    bottom: Spacing.xl,
    alignItems: 'center',
  },
  footerText: {
    fontSize: Typography.fontSize.xs,
    color: Colors.text.muted,
    marginBottom: Spacing.xs,
  },
  versionText: {
    fontSize: Typography.fontSize.xs,
    color: Colors.text.muted,
    opacity: 0.6,
  },
});
