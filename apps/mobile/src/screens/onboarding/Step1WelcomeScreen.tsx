import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import type { OnboardingStackParamList } from '../../navigation/OnboardingNavigator';
import { Colors, Typography, Spacing, BorderRadius } from '../../theme';

type Props = NativeStackScreenProps<OnboardingStackParamList, 'Step1Welcome'>;

const FEATURES = [
  { emoji: '🎯', text: 'AI-powered internship matching' },
  { emoji: '📊', text: 'Track all your applications' },
  { emoji: '🏢', text: 'Discover top companies' },
  { emoji: '🤝', text: 'Build your professional profile' },
];

export default function Step1WelcomeScreen({ navigation }: Props): React.ReactElement {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 700, useNativeDriver: true }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  return (
    <SafeAreaView style={styles.container}>
      <Animated.View style={[styles.content, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
        {/* Logo / Brand */}
        <View style={styles.brandSection}>
          <View style={styles.logoCircle}>
            <Text style={styles.logoEmoji}>🎯</Text>
          </View>
          <Text style={styles.brandName}>InternTracker AI</Text>
          <Text style={styles.tagline}>Your smart internship companion</Text>
        </View>

        {/* Welcome message */}
        <View style={styles.welcomeBox}>
          <Text style={styles.welcomeTitle}>Let's set up your profile</Text>
          <Text style={styles.welcomeBody}>
            Takes about 3 minutes. Your profile powers everything — from smart recommendations to application tracking.
          </Text>
        </View>

        {/* Feature list */}
        <View style={styles.features}>
          {FEATURES.map(({ emoji, text }) => (
            <View key={text} style={styles.featureRow}>
              <Text style={styles.featureEmoji}>{emoji}</Text>
              <Text style={styles.featureText}>{text}</Text>
            </View>
          ))}
        </View>
      </Animated.View>

      {/* CTA */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.ctaButton}
          onPress={() => navigation.navigate('Step2Personal')}
          activeOpacity={0.85}
        >
          <Text style={styles.ctaText}>Get Started →</Text>
        </TouchableOpacity>
        <Text style={styles.footerNote}>8 quick steps • Skip anytime</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background.primary },
  content: { flex: 1, paddingHorizontal: Spacing.xl, paddingTop: Spacing['2xl'] },
  brandSection: { alignItems: 'center', marginBottom: Spacing['2xl'] },
  logoCircle: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: 'rgba(124, 58, 237, 0.15)',
    borderWidth: 2, borderColor: Colors.brand.purple,
    alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.md,
  },
  logoEmoji: { fontSize: 36 },
  brandName: { color: Colors.text.primary, fontSize: Typography.fontSize['2xl'], fontWeight: Typography.fontWeight.extrabold, letterSpacing: -0.5 },
  tagline: { color: Colors.text.muted, fontSize: Typography.fontSize.sm, marginTop: 4 },
  welcomeBox: {
    backgroundColor: Colors.glass.surface, borderRadius: BorderRadius.lg,
    borderWidth: 1, borderColor: Colors.glass.border,
    padding: Spacing.lg, marginBottom: Spacing.xl,
  },
  welcomeTitle: { color: Colors.text.primary, fontSize: Typography.fontSize.xl, fontWeight: Typography.fontWeight.bold, marginBottom: Spacing.sm },
  welcomeBody: { color: Colors.text.secondary, fontSize: Typography.fontSize.base, lineHeight: 24 },
  features: {},
  featureRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: Spacing.sm },
  featureEmoji: { fontSize: 20, marginRight: Spacing.md, width: 28 },
  featureText: { color: Colors.text.secondary, fontSize: Typography.fontSize.base },
  footer: { paddingHorizontal: Spacing.xl, paddingBottom: Spacing.xl, alignItems: 'center' },
  ctaButton: {
    backgroundColor: Colors.brand.purple, borderRadius: BorderRadius.md,
    paddingVertical: Spacing.md, width: '100%', alignItems: 'center', marginBottom: Spacing.sm,
  },
  ctaText: { color: Colors.white, fontSize: Typography.fontSize.lg, fontWeight: Typography.fontWeight.bold },
  footerNote: { color: Colors.text.muted, fontSize: Typography.fontSize.sm },
});
