import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PrimaryButton } from '../components/auth/PrimaryButton';
import { SelectChip } from '../components/common/SelectChip';
import { SkillBadge } from '../components/common/SkillBadge';
import { EmptyState } from '../components/common/EmptyState';
import { Colors, Spacing, Typography, BorderRadius } from '../theme';
import { skillsApi, profileApi, type Skill, type UserSkillWithSkill } from '../services/profile.service';

type Proficiency = 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'EXPERT';
const PROFICIENCIES: Proficiency[] = ['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT'];
const PROFICIENCY_LABELS: Record<Proficiency, string> = { BEGINNER: 'Beginner', INTERMEDIATE: 'Intermediate', ADVANCED: 'Advanced', EXPERT: 'Expert' };

const CATEGORIES = ['All', 'PROGRAMMING', 'FRONTEND', 'BACKEND', 'DATABASE', 'AI_ML', 'CLOUD', 'DEVOPS', 'MOBILE', 'TESTING'];
const CATEGORY_LABELS: Record<string, string> = {
  All: 'All', PROGRAMMING: 'Programming', FRONTEND: 'Frontend', BACKEND: 'Backend',
  DATABASE: 'Database', AI_ML: 'AI/ML', CLOUD: 'Cloud', DEVOPS: 'DevOps', MOBILE: 'Mobile', TESTING: 'Testing',
};

export default function ManageSkillsScreen(): React.ReactElement {
  const [skills, setSkills] = useState<Skill[]>([]);
  const [mySkills, setMySkills] = useState<UserSkillWithSkill[]>([]);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [selectedSkill, setSelectedSkill] = useState<Skill | null>(null);
  const [proficiency, setProficiency] = useState<Proficiency>('BEGINNER');
  const [loading, setLoading] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);

  useEffect(() => {
    profileApi.get().then((p) => {
      setMySkills(p.userSkills ?? []);
    }).catch(() => {});
  }, []);

  const fetchSkills = useCallback(async (): Promise<void> => {
    setSearchLoading(true);
    try {
      const params: Parameters<typeof skillsApi.search>[0] = {};
      if (search) params.search = search;
      if (category !== 'All') params.category = category;
      const result = await skillsApi.search(params);
      setSkills(result);
    } catch {
      // silent
    } finally {
      setSearchLoading(false);
    }
  }, [search, category]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void fetchSkills();
    }, 300);
    return () => clearTimeout(timer);
  }, [fetchSkills]);

  const addSkill = async (): Promise<void> => {
    if (!selectedSkill) return;
    setLoading(true);
    try {
      const added = await profileApi.addSkill(selectedSkill.id, proficiency);
      setMySkills((prev) => {
        const exists = prev.find((s) => s.skillId === selectedSkill.id);
        if (exists) return prev.map((s) => s.skillId === selectedSkill.id ? { ...s, proficiency } : s);
        return [...prev, { ...added, skill: selectedSkill }];
      });
      setSelectedSkill(null);
    } catch (err: unknown) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to add skill');
    } finally {
      setLoading(false);
    }
  };

  const removeSkill = async (skillId: string): Promise<void> => {
    try {
      await profileApi.removeSkill(skillId);
      setMySkills((prev) => prev.filter((s) => s.skillId !== skillId));
    } catch {
      // silent
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          {/* Search */}
          <View style={styles.searchBox}>
            <Text style={styles.searchIcon}>🔍</Text>
            <TextInput
              style={styles.searchInput}
              placeholder="Search skills..."
              placeholderTextColor={Colors.text.muted}
              value={search}
              onChangeText={setSearch}
              autoCapitalize="none"
            />
          </View>

          {/* Category filter */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.catScroll}>
            {CATEGORIES.map((cat) => (
              <SelectChip
                key={cat}
                label={CATEGORY_LABELS[cat] ?? cat}
                selected={category === cat}
                onPress={() => setCategory(cat)}
                style={{ marginRight: 6 }}
              />
            ))}
          </ScrollView>

          {/* Skills grid */}
          {searchLoading ? (
            <ActivityIndicator color={Colors.brand.purple} style={{ marginTop: Spacing.lg }} />
          ) : (
            <View style={styles.skillGrid}>
              {skills.slice(0, 20).map((skill) => {
                const alreadyAdded = mySkills.some((s) => s.skillId === skill.id);
                const isSelected = selectedSkill?.id === skill.id;
                return (
                  <TouchableOpacity
                    key={skill.id}
                    style={[styles.skillChip, alreadyAdded && styles.skillChipAdded, isSelected && styles.skillChipSelected]}
                    onPress={() => setSelectedSkill(isSelected ? null : skill)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.skillChipText, (alreadyAdded || isSelected) && styles.skillChipTextActive]}>
                      {alreadyAdded ? '✓ ' : ''}{skill.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          {/* Proficiency picker (shown when skill selected) */}
          {selectedSkill ? (
            <View style={styles.proficiencyBox}>
              <Text style={styles.proficiencyTitle}>Proficiency for {selectedSkill.name}</Text>
              <View style={styles.proficiencyRow}>
                {PROFICIENCIES.map((p) => (
                  <SelectChip key={p} label={PROFICIENCY_LABELS[p]} selected={proficiency === p} onPress={() => setProficiency(p)} />
                ))}
              </View>
              <PrimaryButton title={loading ? 'Adding...' : 'Add Skill'} onPress={() => { void addSkill(); }} loading={loading} />
            </View>
          ) : null}
        </View>

        {/* My Skills */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>My Skills ({mySkills.length})</Text>
          {mySkills.length === 0 ? (
            <EmptyState emoji="⚡" title="No skills yet" description="Select a skill above and set your proficiency level." />
          ) : (
            mySkills.map((us) => (
              <TouchableOpacity key={us.skillId} onLongPress={() => { void removeSkill(us.skillId); }}>
                <SkillBadge name={us.skill.name} proficiency={us.proficiency} category={us.skill.category} />
              </TouchableOpacity>
            ))
          )}
          {mySkills.length > 0 ? <Text style={styles.hint}>Long-press a skill to remove it</Text> : null}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background.primary },
  section: { paddingHorizontal: Spacing.xl, paddingTop: Spacing.xl, marginBottom: Spacing.xl },
  searchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.background.secondary, borderRadius: BorderRadius.md, borderWidth: 1, borderColor: Colors.border.default, paddingHorizontal: Spacing.md, marginBottom: Spacing.sm },
  searchIcon: { fontSize: 16, marginRight: Spacing.xs },
  searchInput: { flex: 1, color: Colors.text.primary, fontSize: Typography.fontSize.base, paddingVertical: Spacing.sm },
  catScroll: { marginBottom: Spacing.md },
  skillGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  skillChip: { borderWidth: 1, borderColor: Colors.border.default, borderRadius: BorderRadius.full, paddingHorizontal: Spacing.sm + 2, paddingVertical: 6, margin: 4, backgroundColor: Colors.background.secondary },
  skillChipAdded: { borderColor: Colors.success, backgroundColor: 'rgba(34,197,94,0.1)' },
  skillChipSelected: { borderColor: Colors.brand.purple, backgroundColor: 'rgba(124,58,237,0.15)' },
  skillChipText: { color: Colors.text.secondary, fontSize: Typography.fontSize.sm },
  skillChipTextActive: { color: Colors.text.primary, fontWeight: Typography.fontWeight.medium },
  proficiencyBox: { backgroundColor: Colors.background.secondary, borderRadius: BorderRadius.lg, borderWidth: 1, borderColor: Colors.border.subtle, padding: Spacing.md, marginTop: Spacing.md },
  proficiencyTitle: { color: Colors.text.primary, fontSize: Typography.fontSize.sm, fontWeight: Typography.fontWeight.semibold, marginBottom: Spacing.sm },
  proficiencyRow: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: Spacing.md },
  sectionTitle: { color: Colors.text.primary, fontSize: Typography.fontSize.lg, fontWeight: Typography.fontWeight.semibold, marginBottom: Spacing.sm },
  hint: { color: Colors.text.muted, fontSize: Typography.fontSize.xs, marginTop: Spacing.xs, textAlign: 'center' },
});
