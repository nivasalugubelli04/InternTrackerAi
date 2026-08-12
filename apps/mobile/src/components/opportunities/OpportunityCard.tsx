import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Animated,
} from 'react-native';
import { Colors, Typography, Spacing, BorderRadius } from '../../theme';
import { MatchScoreBadge } from './MatchScoreBadge';
import { DeadlinePill } from './DeadlineBadge';
import type { Opportunity } from '../../services/opportunities.service';

interface Props {
  opportunity: Opportunity;
  onPress: (id: string) => void;
  onSave: (id: string, currentlySaved: boolean) => Promise<void>;
  style?: object;
}

const PRIORITY_CONFIG = {
  HIGH: { color: Colors.error, label: '🔴 HIGH PRIORITY' },
  MEDIUM: { color: Colors.warning, label: '🟡 MEDIUM' },
  LOW: { color: Colors.text.muted, label: '🟢 LOW' },
};

const WORK_MODE_EMOJI: Record<string, string> = {
  REMOTE: '🌐',
  HYBRID: '🏠',
  ONSITE: '🏢',
};

export function OpportunityCard({ opportunity: opp, onPress, onSave, style }: Props): React.ReactElement {
  const [isSaved, setIsSaved] = useState(opp.isSaved);
  const [savePulse] = useState(new Animated.Value(1));

  const handleSave = useCallback(async () => {
    Animated.sequence([
      Animated.timing(savePulse, { toValue: 0.7, duration: 100, useNativeDriver: true }),
      Animated.timing(savePulse, { toValue: 1, duration: 100, useNativeDriver: true }),
    ]).start();
    const next = !isSaved;
    setIsSaved(next);
    try {
      await onSave(opp.id, isSaved);
    } catch {
      setIsSaved(isSaved); // Revert on error
    }
  }, [isSaved, opp.id, onSave, savePulse]);

  const priority = opp.recommendation?.priority ?? 'LOW';
  const priorityConfig = PRIORITY_CONFIG[priority] ?? PRIORITY_CONFIG.LOW;
  const workModeEmoji = opp.workMode ? WORK_MODE_EMOJI[opp.workMode] ?? '📍' : '📍';

  return (
    <TouchableOpacity
      style={[styles.card, style]}
      onPress={() => onPress(opp.id)}
      activeOpacity={0.85}
    >
      {/* Top row: company + match score */}
      <View style={styles.topRow}>
        <View style={styles.companyRow}>
          {opp.company.logoUrl ? (
            <Image source={{ uri: opp.company.logoUrl }} style={styles.logo} resizeMode="contain" />
          ) : (
            <View style={styles.logoPlaceholder}>
              <Text style={styles.logoLetter}>{opp.company.name[0]?.toUpperCase() ?? '?'}</Text>
            </View>
          )}
          <View style={styles.companyInfo}>
            <Text style={styles.companyName} numberOfLines={1}>{opp.company.name}</Text>
            <Text style={styles.industry} numberOfLines={1}>
              {opp.company.industry ?? 'Technology'}
            </Text>
          </View>
        </View>
        <MatchScoreBadge matchScore={opp.matchScore} />
      </View>

      {/* Job title */}
      <Text style={styles.title} numberOfLines={2}>{opp.title}</Text>

      {/* Meta row: location + work mode + stipend */}
      <View style={styles.metaRow}>
        <Text style={styles.meta}>
          {workModeEmoji} {opp.location ?? 'Location not specified'}
        </Text>
        {opp.stipend ? (
          <Text style={styles.stipend}>₹{(opp.stipend / 1000).toFixed(0)}K/mo</Text>
        ) : null}
      </View>

      {/* Duration */}
      {opp.duration ? (
        <Text style={styles.duration}>⏱ {opp.duration}</Text>
      ) : null}

      {/* Priority + deadline pill */}
      <View style={styles.tagsRow}>
        {priority === 'HIGH' && (
          <View style={[styles.priorityTag, { borderColor: priorityConfig.color }]}>
            <Text style={[styles.priorityText, { color: priorityConfig.color }]}>
              {priorityConfig.label}
            </Text>
          </View>
        )}
        <DeadlinePill deadline={opp.deadline} urgency={opp.deadlineUrgency} />
      </View>

      {/* Required skills */}
      {opp.requirements.length > 0 && (
        <View style={styles.skillsRow}>
          {opp.requirements.slice(0, 4).map((skill) => (
            <View key={skill} style={styles.skillChip}>
              <Text style={styles.skillText}>{skill}</Text>
            </View>
          ))}
          {opp.requirements.length > 4 && (
            <Text style={styles.moreSkills}>+{opp.requirements.length - 4} more</Text>
          )}
        </View>
      )}

      {/* Action row */}
      <View style={styles.actionRow}>
        <Animated.View style={{ transform: [{ scale: savePulse }] }}>
          <TouchableOpacity
            style={[styles.saveBtn, isSaved && styles.saveBtnActive]}
            onPress={handleSave}
          >
            <Text style={[styles.saveBtnText, isSaved && styles.saveBtnTextActive]}>
              {isSaved ? '♥ Saved' : '♡ Save'}
            </Text>
          </TouchableOpacity>
        </Animated.View>
        <TouchableOpacity style={styles.viewBtn} onPress={() => onPress(opp.id)}>
          <Text style={styles.viewBtnText}>View Details →</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

// Compact horizontal card for home sections
export function OpportunityCardCompact({ opportunity: opp, onPress }: { opportunity: Opportunity; onPress: (id: string) => void }): React.ReactElement {
  return (
    <TouchableOpacity style={styles.compactCard} onPress={() => onPress(opp.id)} activeOpacity={0.85}>
      {opp.company.logoUrl ? (
        <Image source={{ uri: opp.company.logoUrl }} style={styles.compactLogo} resizeMode="contain" />
      ) : (
        <View style={styles.compactLogoPlaceholder}>
          <Text style={styles.logoLetter}>{opp.company.name[0]?.toUpperCase() ?? '?'}</Text>
        </View>
      )}
      <Text style={styles.compactCompany} numberOfLines={1}>{opp.company.name}</Text>
      <Text style={styles.compactTitle} numberOfLines={2}>{opp.title}</Text>
      <View style={styles.compactMeta}>
        <MatchScoreBadge matchScore={opp.matchScore} />
        <DeadlinePill deadline={opp.deadline} urgency={opp.deadlineUrgency} />
      </View>
    </TouchableOpacity>
  );
}

// Skeleton card for loading states
export function OpportunityCardSkeleton(): React.ReactElement {
  const shimmer = React.useRef(new Animated.Value(0)).current;
  React.useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, { toValue: 1, duration: 900, useNativeDriver: true }),
        Animated.timing(shimmer, { toValue: 0, duration: 900, useNativeDriver: true }),
      ]),
    ).start();
  }, [shimmer]);
  const opacity = shimmer.interpolate({ inputRange: [0, 1], outputRange: [0.4, 0.8] });

  const Block = ({ w, h = 14, mb = 8 }: { w: string | number; h?: number; mb?: number }) => (
    <Animated.View style={{ width: w as number, height: h, backgroundColor: Colors.background.tertiary, borderRadius: 6, marginBottom: mb, opacity }} />
  );

  return (
    <View style={[styles.card, { gap: 8 }]}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Block w={120} h={16} />
        <Block w={72} h={22} mb={0} />
      </View>
      <Block w="85%" h={20} />
      <Block w="60%" />
      <Block w="45%" />
      <View style={{ flexDirection: 'row', gap: 6 }}>
        <Block w={60} h={24} mb={0} />
        <Block w={60} h={24} mb={0} />
        <Block w={60} h={24} mb={0} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.background.secondary,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border.subtle,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.sm,
  },
  companyRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, flex: 1, marginRight: Spacing.sm },
  logo: { width: 40, height: 40, borderRadius: BorderRadius.sm },
  logoPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.background.tertiary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border.subtle,
  },
  logoLetter: { color: Colors.brand.purpleLight, fontSize: Typography.fontSize.lg, fontWeight: Typography.fontWeight.bold },
  companyInfo: { flex: 1 },
  companyName: { color: Colors.text.primary, fontSize: Typography.fontSize.sm, fontWeight: Typography.fontWeight.semibold },
  industry: { color: Colors.text.muted, fontSize: Typography.fontSize.xs, marginTop: 1 },
  title: {
    color: Colors.text.primary,
    fontSize: Typography.fontSize.md,
    fontWeight: Typography.fontWeight.bold,
    marginBottom: Spacing.xs,
    lineHeight: 22,
  },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  meta: { color: Colors.text.secondary, fontSize: Typography.fontSize.sm, flex: 1 },
  stipend: { color: Colors.success, fontSize: Typography.fontSize.sm, fontWeight: Typography.fontWeight.semibold },
  duration: { color: Colors.text.muted, fontSize: Typography.fontSize.xs, marginBottom: Spacing.xs },
  tagsRow: { flexDirection: 'row', gap: Spacing.xs, flexWrap: 'wrap', marginBottom: Spacing.xs, marginTop: 2 },
  priorityTag: { paddingHorizontal: Spacing.xs, paddingVertical: 2, borderRadius: BorderRadius.sm, borderWidth: 1 },
  priorityText: { fontSize: 10, fontWeight: Typography.fontWeight.bold },
  skillsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs, marginTop: Spacing.xs, marginBottom: Spacing.sm },
  skillChip: {
    backgroundColor: Colors.glass.surface,
    borderWidth: 1,
    borderColor: Colors.glass.border,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
  },
  skillText: { color: Colors.brand.purpleLight, fontSize: Typography.fontSize.xs, fontWeight: Typography.fontWeight.medium },
  moreSkills: { color: Colors.text.muted, fontSize: Typography.fontSize.xs, alignSelf: 'center' },
  actionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: Spacing.sm, paddingTop: Spacing.sm, borderTopWidth: 1, borderTopColor: Colors.border.subtle },
  saveBtn: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border.default,
  },
  saveBtnActive: { backgroundColor: 'rgba(239,68,68,0.15)', borderColor: Colors.error },
  saveBtnText: { color: Colors.text.secondary, fontSize: Typography.fontSize.sm, fontWeight: Typography.fontWeight.medium },
  saveBtnTextActive: { color: Colors.error },
  viewBtn: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.brand.purple,
  },
  viewBtnText: { color: Colors.white, fontSize: Typography.fontSize.sm, fontWeight: Typography.fontWeight.semibold },

  // Compact card styles
  compactCard: {
    width: 200,
    backgroundColor: Colors.background.secondary,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border.subtle,
    padding: Spacing.md,
    marginRight: Spacing.md,
  },
  compactLogo: { width: 32, height: 32, borderRadius: BorderRadius.sm, marginBottom: Spacing.xs },
  compactLogoPlaceholder: {
    width: 32,
    height: 32,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.background.tertiary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xs,
  },
  compactCompany: { color: Colors.text.muted, fontSize: Typography.fontSize.xs, marginBottom: 2 },
  compactTitle: {
    color: Colors.text.primary,
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
    marginBottom: Spacing.xs,
    lineHeight: 18,
  },
  compactMeta: { flexDirection: 'row', gap: Spacing.xs, flexWrap: 'wrap' },
});
