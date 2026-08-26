import React, { useState } from 'react';
import { SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { betaService } from '../../services/beta.service';

const THEME = {
  primary: '#246BFE',
  deep: '#1456D9',
  sky: '#EAF3FF',
  soft: '#F3F7FF',
  white: '#FFFFFF',
  text: '#111111',
  secondary: '#6B7280',
  border: '#E7EAF0',
  green: '#79F28A',
  softGreen: '#E9FBEA',
  aiCream: '#FFF4D8',
};

interface Props {
  onComplete?: () => void;
}

export const BetaOnboardingScreen: React.FC<Props> = ({ onComplete }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const steps = [
    {
      title: 'Welcome to InternTracker AI Beta',
      badge: 'BETA ACCESS',
      subtitle: 'Your Autonomous AI Career Acceleration Engine',
      description:
        'Thank you for joining our exclusive early beta. InternTracker AI is designed to help you master opportunity discovery, tailored application preparation, career strategy, and daily execution.',
      icon: '🚀',
      highlights: [
        'Real-time verified internship matching',
        'AI Copilot with automated career actions',
        'Adaptive daily sprints & focus sessions',
      ],
    },
    {
      title: 'Product Is Actively Evolving',
      badge: 'YOUR VOICE MATTERS',
      subtitle: 'Continuous Improvement Flywheel',
      description:
        'As a beta tester, your real behavior and direct feedback guide our engineering roadmap. We analyze friction, improve search relevancy, and deploy rapid weekly updates.',
      icon: '💡',
      highlights: [
        'Use "Help Improve" button to send ideas',
        'Report bugs instantly with 1-tap capture',
        'Rate AI recommendations inline anytime',
      ],
    },
    {
      title: 'Ready to Accelerate Your Career?',
      badge: 'GET STARTED',
      subtitle: 'Complete 3 Simple Actions for Full Activation',
      description:
        'Set your target career goal, add your core skills, and explore verified opportunities tailored to your trajectory.',
      icon: '🎯',
      highlights: [
        '1. Set Career Goal & Target Role',
        '2. Add Top Skills & Strengths',
        '3. Save your first high-match opportunity',
      ],
    },
  ];

  const handleNext = async () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep((prev) => prev + 1);
    } else {
      setIsSubmitting(true);
      try {
        await betaService.updateOnboardingState({
          isWelcomed: true,
          hasExploredFeatures: true,
          completedSteps: ['BETA_WELCOME_COMPLETED'],
        });
        await betaService.trackEvent('ONBOARDING_COMPLETED', { source: 'beta_welcome_wizard' });
      } catch (err) {
        console.warn('Failed to persist onboarding state:', err);
      } finally {
        setIsSubmitting(false);
        if (onComplete) onComplete();
      }
    }
  };

  const activeStep = steps[currentStep] || steps[0];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Header Badge */}
        <View style={styles.headerRow}>
          <View style={styles.badgeContainer}>
            <Text style={styles.badgeText}>{activeStep?.badge}</Text>
          </View>
          <Text style={styles.stepIndicator}>
            {currentStep + 1} of {steps.length}
          </Text>
        </View>

        {/* Hero Icon */}
        <View style={styles.iconCircle}>
          <Text style={styles.heroIcon}>{activeStep?.icon}</Text>
        </View>

        {/* Step Content */}
        <Text style={styles.title}>{activeStep?.title}</Text>
        <Text style={styles.subtitle}>{activeStep?.subtitle}</Text>
        <Text style={styles.description}>{activeStep?.description}</Text>

        {/* Highlights Card */}
        <View style={styles.card}>
          <Text style={styles.cardHeader}>Key Capabilities:</Text>
          {activeStep?.highlights.map((item, index) => (
            <View key={index} style={styles.bulletRow}>
              <View style={styles.bulletDot} />
              <Text style={styles.bulletText}>{item}</Text>
            </View>
          ))}
        </View>
      </ScrollView>

      {/* Footer Navigation */}
      <View style={styles.footer}>
        <View style={styles.dotsRow}>
          {steps.map((_, i) => (
            <View
              key={i}
              style={[styles.dot, i === currentStep ? styles.dotActive : styles.dotInactive]}
            />
          ))}
        </View>

        <TouchableOpacity
          style={[styles.primaryButton, isSubmitting && styles.buttonDisabled]}
          onPress={handleNext}
          disabled={isSubmitting}
          accessibilityRole="button"
          accessibilityLabel={currentStep === steps.length - 1 ? 'Get Started' : 'Continue'}
        >
          <Text style={styles.primaryButtonText}>
            {currentStep === steps.length - 1 ? 'Get Started 🚀' : 'Continue →'}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.white,
  },
  scrollContent: {
    padding: 24,
    alignItems: 'center',
  },
  headerRow: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  badgeContainer: {
    backgroundColor: THEME.sky,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: THEME.deep,
    letterSpacing: 0.5,
  },
  stepIndicator: {
    fontSize: 13,
    fontWeight: '600',
    color: THEME.secondary,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: THEME.soft,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  heroIcon: {
    fontSize: 36,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: THEME.text,
    textAlign: 'center',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    fontWeight: '600',
    color: THEME.deep,
    textAlign: 'center',
    marginBottom: 16,
  },
  description: {
    fontSize: 14,
    color: THEME.secondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  card: {
    width: '100%',
    backgroundColor: THEME.soft,
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  cardHeader: {
    fontSize: 13,
    fontWeight: '700',
    color: THEME.text,
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  bulletDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: THEME.primary,
    marginRight: 10,
  },
  bulletText: {
    fontSize: 13,
    color: THEME.text,
    fontWeight: '500',
    flex: 1,
  },
  footer: {
    padding: 24,
    borderTopWidth: 1,
    borderTopColor: THEME.border,
    backgroundColor: THEME.white,
  },
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 16,
  },
  dot: {
    height: 6,
    borderRadius: 3,
    marginHorizontal: 4,
  },
  dotActive: {
    width: 24,
    backgroundColor: THEME.primary,
  },
  dotInactive: {
    width: 6,
    backgroundColor: THEME.border,
  },
  primaryButton: {
    backgroundColor: THEME.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    minHeight: 48,
    justifyContent: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  primaryButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: THEME.white,
  },
});
