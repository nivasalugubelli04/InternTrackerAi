import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { ProfileCompletionCard } from '../components/common/ProfileCompletionCard';
import { SkillBadge } from '../components/common/SkillBadge';
import { EmptyState } from '../components/common/EmptyState';
import { ProfileSkeleton } from '../components/common/LoadingSkeleton';
import { Colors, Spacing, Typography, BorderRadius } from '../theme';
import { profileApi, resumeApi, type Profile, type ProfileCompletion, type Resume } from '../services/profile.service';

import { type ProfileStackParamList } from '../navigation/ProfileNavigator';

type Props = NativeStackScreenProps<ProfileStackParamList, 'ProfileHome'>;

function InfoRow({ label, value }: { label: string; value: string | null | undefined }): React.ReactElement | null {
  if (!value) return null;
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

export default function ProfileScreen({ navigation }: Props): React.ReactElement {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [completion, setCompletion] = useState<ProfileCompletion | null>(null);
  const [resume, setResume] = useState<Resume | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (): Promise<void> => {
    try {
      const [profileData, completionData, resumeData] = await Promise.all([
        profileApi.get().catch(() => null),
        profileApi.getCompletion(),
        resumeApi.get().catch(() => null),
      ]);
      setProfile(profileData);
      setCompletion(completionData);
      setResume(resumeData);
    } catch {
      // silent
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const onRefresh = (): void => {
    setRefreshing(true);
    void load();
  };

  if (loading) return <ProfileSkeleton />;

  if (!profile) {
    return (
      <SafeAreaView style={styles.container}>
        <EmptyState
          emoji="👤"
          title="No profile yet"
          description="Complete the onboarding to set up your profile."
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.brand.purple} />}
        contentContainerStyle={styles.scroll}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarText}>
              {(profile.userSkills?.[0]?.skill?.name?.[0] ?? (profile.userId[0] ?? '?')).toUpperCase()}
            </Text>
          </View>
          <View style={styles.headerInfo}>
            <Text style={styles.name}>{profile.headline ?? 'Your Profile'}</Text>
            {profile.college ? <Text style={styles.college}>{profile.college}</Text> : null}
            {profile.city ? <Text style={styles.location}>📍 {[profile.city, profile.country].filter(Boolean).join(', ')}</Text> : null}
          </View>
          <TouchableOpacity onPress={() => navigation.navigate('EditProfile')} style={styles.editBtn}>
            <Text style={styles.editText}>Edit</Text>
          </TouchableOpacity>
        </View>

        {/* Completion card */}
        {completion ? <ProfileCompletionCard total={completion.total} sections={completion.sections} /> : null}

        {/* Bio */}
        {profile.bio ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>About</Text>
            <Text style={styles.bio}>{profile.bio}</Text>
          </View>
        ) : null}

        {/* Education */}
        {profile.college ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Education</Text>
            <InfoRow label="College" value={profile.college} />
            <InfoRow label="Degree" value={profile.degree} />
            <InfoRow label="Branch" value={profile.branch} />
            <InfoRow label="CGPA" value={profile.cgpa?.toString()} />
            <InfoRow label="Graduation" value={profile.graduationYear?.toString()} />
          </View>
        ) : null}

        {/* Skills */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Skills ({profile.userSkills?.length ?? 0})</Text>
            <TouchableOpacity onPress={() => navigation.navigate('ManageSkills')}>
              <Text style={styles.manageLink}>Manage →</Text>
            </TouchableOpacity>
          </View>
          {profile.userSkills?.length > 0 ? (
            profile.userSkills.slice(0, 5).map((us) => (
              <SkillBadge key={us.skillId} name={us.skill.name} proficiency={us.proficiency} category={us.skill.category} />
            ))
          ) : (
            <TouchableOpacity onPress={() => navigation.navigate('ManageSkills')}>
              <Text style={styles.addLink}>+ Add your first skill</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Resume */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Resume</Text>
            <TouchableOpacity onPress={() => navigation.navigate('ManageResume')}>
              <Text style={styles.manageLink}>{resume ? 'Manage →' : 'Upload →'}</Text>
            </TouchableOpacity>
          </View>
          {resume ? (
            <View style={styles.resumeRow}>
              <Text style={styles.resumeEmoji}>📄</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.resumeName} numberOfLines={1}>{resume.fileName}</Text>
                <Text style={styles.resumeSize}>{(resume.fileSize / 1024).toFixed(0)} KB • {new Date(resume.uploadedAt).toLocaleDateString()}</Text>
              </View>
            </View>
          ) : (
            <Text style={styles.emptyText}>No resume uploaded yet</Text>
          )}
        </View>

        {/* Preferences */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Preferences</Text>
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => navigation.navigate('ResumeBuilder' as never)}
            >
              <Ionicons name="document-text" size={24} color="#007BFF" />
              <Text style={styles.actionButtonText}>Resume Builder</Text>
              <Ionicons name="chevron-forward" size={20} color="#666" style={styles.actionButtonArrow} />
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => navigation.navigate('ManagePreferences')}
            >  <Text style={styles.manageLink}>Manage →</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.emptyText}>Update career goals and notification settings</Text>
        </View>

        {/* Social links */}
        {(profile.linkedinUrl ?? profile.githubUrl ?? profile.portfolioUrl) ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Links</Text>
            <InfoRow label="LinkedIn" value={profile.linkedinUrl} />
            <InfoRow label="GitHub" value={profile.githubUrl} />
            <InfoRow label="Portfolio" value={profile.portfolioUrl} />
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background.primary },
  scroll: { padding: Spacing.xl },
  header: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: Spacing.xl },
  avatarCircle: { width: 60, height: 60, borderRadius: 30, backgroundColor: 'rgba(124,58,237,0.15)', borderWidth: 2, borderColor: Colors.brand.purple, alignItems: 'center', justifyContent: 'center', marginRight: Spacing.md },
  avatarText: { color: Colors.brand.purpleLight, fontSize: Typography.fontSize.xl, fontWeight: Typography.fontWeight.bold },
  headerInfo: { flex: 1 },
  name: { color: Colors.text.primary, fontSize: Typography.fontSize.lg, fontWeight: Typography.fontWeight.bold },
  college: { color: Colors.text.muted, fontSize: Typography.fontSize.sm, marginTop: 2 },
  location: { color: Colors.text.muted, fontSize: Typography.fontSize.xs, marginTop: 2 },
  editBtn: { backgroundColor: Colors.background.secondary, borderRadius: BorderRadius.sm, paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs, borderWidth: 1, borderColor: Colors.border.default },
  editText: { color: Colors.text.secondary, fontSize: Typography.fontSize.sm, fontWeight: Typography.fontWeight.medium },
  card: { backgroundColor: Colors.background.secondary, borderRadius: BorderRadius.lg, borderWidth: 1, borderColor: Colors.border.subtle, padding: Spacing.md, marginBottom: Spacing.md },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.sm },
  cardTitle: { color: Colors.text.primary, fontSize: Typography.fontSize.base, fontWeight: Typography.fontWeight.semibold },
  manageLink: { color: Colors.brand.purpleLight, fontSize: Typography.fontSize.sm },
  bio: { color: Colors.text.secondary, fontSize: Typography.fontSize.sm, lineHeight: 20 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  infoLabel: { color: Colors.text.muted, fontSize: Typography.fontSize.sm },
  infoValue: { color: Colors.text.primary, fontSize: Typography.fontSize.sm, fontWeight: Typography.fontWeight.medium, flex: 1, textAlign: 'right' },
  resumeRow: { flexDirection: 'row', alignItems: 'center' },
  resumeEmoji: { fontSize: 24, marginRight: Spacing.sm },
  resumeName: { color: Colors.text.primary, fontSize: Typography.fontSize.sm, fontWeight: Typography.fontWeight.medium },
  resumeSize: { color: Colors.text.muted, fontSize: Typography.fontSize.xs },
  addLink: { color: Colors.brand.purpleLight, fontSize: Typography.fontSize.sm },
  emptyText: { color: Colors.text.muted, fontSize: Typography.fontSize.sm },
});
