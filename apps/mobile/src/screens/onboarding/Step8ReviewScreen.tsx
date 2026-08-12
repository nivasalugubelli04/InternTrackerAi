import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import type { OnboardingStackParamList } from '../../navigation/OnboardingNavigator';
import { PrimaryButton } from '../../components/auth/PrimaryButton';
import { StepProgressBar } from '../../components/common/StepProgressBar';
import { StepHeader } from '../../components/common/StepHeader';
import { ProfileCompletionCard } from '../../components/common/ProfileCompletionCard';
import { Colors, Spacing, Typography, BorderRadius } from '../../theme';
import { profileApi, type Profile, type ProfileCompletion } from '../../services/profile.service';

type Props = NativeStackScreenProps<OnboardingStackParamList, 'Step8Review'>;

type ReviewSection = { emoji: string; label: string; value: string; done: boolean };

function buildSections(profile: Profile | null): ReviewSection[] {
  return [
    {
      emoji: '👤',
      label: 'Personal Info',
      value: profile?.headline ?? '—',
      done: !!(profile?.headline || profile?.phone),
    },
    {
      emoji: '🎓',
      label: 'Education',
      value: profile?.college ? `${profile.degree ?? ''} @ ${profile.college}` : '—',
      done: !!(profile?.college || profile?.degree),
    },
    {
      emoji: '⚡',
      label: 'Skills',
      value: profile?.userSkills?.length ? `${profile.userSkills.length} skill${profile.userSkills.length > 1 ? 's' : ''} added` : '—',
      done: (profile?.userSkills?.length ?? 0) > 0,
    },
    {
      emoji: '📍',
      label: 'Location',
      value: [profile?.city, profile?.country].filter(Boolean).join(', ') || '—',
      done: !!(profile?.city || profile?.country),
    },
  ];
}

export default function Step8ReviewScreen({ navigation }: Props): React.ReactElement {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [completion, setCompletion] = useState<ProfileCompletion | null>(null);
  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState(false);

  useEffect(() => {
    const load = async (): Promise<void> => {
      try {
        const [profileData, completionData] = await Promise.all([
          profileApi.get().catch(() => null),
          profileApi.getCompletion(),
        ]);
        setProfile(profileData);
        setCompletion(completionData);
      } catch {
        // continue even if fetch fails
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  const onComplete = async (): Promise<void> => {
    setCompleting(true);
    try {
      await profileApi.completeOnboarding();
      // Navigate to the main app — AppNavigator will detect onboarding is done
      // We use reset to prevent going back to onboarding
      navigation.getParent()?.reset?.({
        index: 0,
        routes: [{ name: 'App' as never }],
      });
    } catch (err: unknown) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setCompleting(false);
    }
  };

  const sections = buildSections(profile);

  return (
    <SafeAreaView style={styles.container}>
      <StepProgressBar currentStep={8} totalSteps={8} stepLabel="Review" />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <StepHeader emoji="🎉" title="Almost Done!" subtitle="Here's a summary of your profile." />

        {loading ? (
          <ActivityIndicator color={Colors.brand.purple} style={{ marginTop: Spacing.xl }} />
        ) : (
          <View style={styles.content}>
            {completion ? (
              <ProfileCompletionCard total={completion.total} sections={completion.sections} />
            ) : null}

            <View style={styles.summary}>
              {sections.map(({ emoji, label, value, done }) => (
                <View key={label} style={styles.summaryRow}>
                  <Text style={styles.summaryEmoji}>{emoji}</Text>
                  <View style={styles.summaryInfo}>
                    <Text style={styles.summaryLabel}>{label}</Text>
                    <Text style={styles.summaryValue} numberOfLines={1}>{value}</Text>
                  </View>
                  <View style={[styles.statusDot, { backgroundColor: done ? Colors.success : Colors.background.tertiary }]} />
                </View>
              ))}
            </View>

            {(completion?.total ?? 0) < 40 ? (
              <View style={styles.nudge}>
                <Text style={styles.nudgeTitle}>💡 Complete more sections</Text>
                <Text style={styles.nudgeBody}>
                  A complete profile gets 5x more matches. You can always edit your profile later from the Profile tab.
                </Text>
              </View>
            ) : null}
          </View>
        )}
      </ScrollView>

      <View style={styles.footer}>
        <PrimaryButton
          title={completing ? 'Saving...' : '🚀 Start Your Journey'}
          onPress={() => { void onComplete(); }}
          loading={completing}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background.primary },
  scroll: { paddingBottom: Spacing.xl },
  content: { paddingHorizontal: Spacing.xl },
  summary: { backgroundColor: Colors.background.secondary, borderRadius: BorderRadius.lg, borderWidth: 1, borderColor: Colors.border.subtle, overflow: 'hidden', marginBottom: Spacing.lg },
  summaryRow: { flexDirection: 'row', alignItems: 'center', padding: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.border.subtle },
  summaryEmoji: { fontSize: 20, marginRight: Spacing.md, width: 28 },
  summaryInfo: { flex: 1 },
  summaryLabel: { color: Colors.text.muted, fontSize: Typography.fontSize.xs, fontWeight: Typography.fontWeight.medium },
  summaryValue: { color: Colors.text.primary, fontSize: Typography.fontSize.sm, marginTop: 2 },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
  nudge: { backgroundColor: 'rgba(124,58,237,0.08)', borderRadius: BorderRadius.md, borderWidth: 1, borderColor: 'rgba(124,58,237,0.2)', padding: Spacing.md },
  nudgeTitle: { color: Colors.brand.purpleLight, fontSize: Typography.fontSize.base, fontWeight: Typography.fontWeight.semibold, marginBottom: Spacing.xs },
  nudgeBody: { color: Colors.text.secondary, fontSize: Typography.fontSize.sm, lineHeight: 20 },
  footer: { paddingHorizontal: Spacing.xl, paddingVertical: Spacing.md },
});
