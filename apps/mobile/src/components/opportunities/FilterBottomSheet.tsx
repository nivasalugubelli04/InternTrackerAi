import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
} from 'react-native';
import { Colors, Typography, Spacing, BorderRadius } from '../../theme';
import type { WorkMode, SortOption } from '../../services/opportunities.service';

export interface FeedFilters {
  q?: string;
  location?: string;
  industry?: string;
  workMode?: WorkMode;
  minStipend?: number;
  maxStipend?: number;
  minMatchScore?: number;
  trackedCompaniesOnly?: boolean;
  sort?: SortOption;
}

interface Props {
  visible: boolean;
  onClose: () => void;
  onApply: (filters: FeedFilters) => void;
  initialFilters?: FeedFilters;
  availableLocations?: string[];
  availableIndustries?: string[];
}

const WORK_MODES: { label: string; value: WorkMode }[] = [
  { label: '🌐 Remote', value: 'REMOTE' },
  { label: '🏠 Hybrid', value: 'HYBRID' },
  { label: '🏢 On-site', value: 'ONSITE' },
];

const STIPEND_OPTIONS = [
  { label: 'Any', value: undefined },
  { label: '₹10K+', value: 10000 },
  { label: '₹20K+', value: 20000 },
  { label: '₹30K+', value: 30000 },
  { label: '₹50K+', value: 50000 },
];

const MATCH_SCORE_OPTIONS = [
  { label: 'Any', value: undefined },
  { label: '50%+', value: 50 },
  { label: '70%+', value: 70 },
  { label: '80%+', value: 80 },
  { label: '90%+', value: 90 },
];

const SORT_OPTIONS: { label: string; value: SortOption }[] = [
  { label: '🎯 Best Match', value: 'best_match' },
  { label: '🆕 Newest', value: 'newest' },
  { label: '⏰ Closing Soon', value: 'deadline_soon' },
  { label: '💰 Highest Stipend', value: 'highest_stipend' },
  { label: '🏢 Company Priority', value: 'company_priority' },
];

export function FilterBottomSheet({
  visible,
  onClose,
  onApply,
  initialFilters = {},
  availableLocations = [],
  availableIndustries: _availableIndustries = [],
}: Props): React.ReactElement {
  const [filters, setFilters] = useState<FeedFilters>(initialFilters);

  const set = <K extends keyof FeedFilters>(key: K, value: FeedFilters[K]) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const clearAll = () => setFilters({});

  const activeCount = Object.values(filters).filter((v) => v !== undefined && v !== '').length;

  const ChipRow = ({
    label,
    options,
    selected,
    onSelect,
  }: {
    label: string;
    options: { label: string; value: any }[];
    selected: any;
    onSelect: (v: any) => void;
  }) => (
    <View style={styles.section}>
      <Text style={styles.sectionLabel}>{label}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
        {options.map((o) => {
          const isActive = selected === o.value;
          return (
            <TouchableOpacity
              key={String(o.value)}
              style={[styles.chip, isActive && styles.chipActive]}
              onPress={() => onSelect(isActive ? undefined : o.value)}
            >
              <Text style={[styles.chipText, isActive && styles.chipTextActive]}>{o.label}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />
        <View style={styles.sheet}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.handle} />
            <View style={styles.headerRow}>
              <Text style={styles.title}>
                Filters {activeCount > 0 ? <Text style={styles.badge}> {activeCount} </Text> : null}
              </Text>
              <TouchableOpacity onPress={clearAll}>
                <Text style={styles.clearAll}>Clear All</Text>
              </TouchableOpacity>
            </View>
          </View>

          <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
            {/* Sort */}
            <ChipRow
              label="Sort By"
              options={SORT_OPTIONS}
              selected={filters.sort}
              onSelect={(v) => set('sort', v)}
            />

            {/* Work Mode */}
            <ChipRow
              label="Work Mode"
              options={WORK_MODES}
              selected={filters.workMode}
              onSelect={(v) => set('workMode', v)}
            />

            {/* Minimum Stipend */}
            <ChipRow
              label="Minimum Stipend"
              options={STIPEND_OPTIONS}
              selected={filters.minStipend}
              onSelect={(v) => set('minStipend', v)}
            />

            {/* Match Score */}
            <ChipRow
              label="Minimum Match Score"
              options={MATCH_SCORE_OPTIONS}
              selected={filters.minMatchScore}
              onSelect={(v) => set('minMatchScore', v)}
            />

            {/* Location */}
            {availableLocations.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>Location</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
                  {availableLocations.slice(0, 12).map((loc) => (
                    <TouchableOpacity
                      key={loc}
                      style={[styles.chip, filters.location === loc && styles.chipActive]}
                      onPress={() => set('location', filters.location === loc ? undefined : loc)}
                    >
                      <Text style={[styles.chipText, filters.location === loc && styles.chipTextActive]}>
                        {loc}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}

            {/* Tracked Companies Toggle */}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Companies</Text>
              <TouchableOpacity
                style={[styles.toggleChip, filters.trackedCompaniesOnly && styles.chipActive]}
                onPress={() => set('trackedCompaniesOnly', !filters.trackedCompaniesOnly)}
              >
                <Text style={[styles.chipText, filters.trackedCompaniesOnly && styles.chipTextActive]}>
                  🏢 Only Tracked Companies
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>

          {/* Apply Button */}
          <View style={styles.footer}>
            <TouchableOpacity style={styles.applyBtn} onPress={() => { onApply(filters); onClose(); }}>
              <Text style={styles.applyText}>Apply Filters{activeCount > 0 ? ` (${activeCount})` : ''}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.6)' },
  sheet: {
    backgroundColor: Colors.background.secondary,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
    borderTopWidth: 1,
    borderColor: Colors.border.subtle,
  },
  header: { paddingTop: Spacing.sm, paddingHorizontal: Spacing.lg, paddingBottom: Spacing.md },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: Colors.border.default,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: Spacing.md,
  },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { color: Colors.text.primary, fontSize: Typography.fontSize.lg, fontWeight: Typography.fontWeight.bold },
  badge: { color: Colors.brand.purple, fontSize: Typography.fontSize.base, fontWeight: Typography.fontWeight.bold },
  clearAll: { color: Colors.brand.purple, fontSize: Typography.fontSize.sm, fontWeight: Typography.fontWeight.medium },
  body: { paddingHorizontal: Spacing.lg },
  section: { marginBottom: Spacing.lg },
  sectionLabel: {
    color: Colors.text.secondary,
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
    marginBottom: Spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  chipRow: { gap: Spacing.xs },
  chip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: Colors.border.default,
    backgroundColor: Colors.background.tertiary,
  },
  chipActive: { backgroundColor: 'rgba(124,58,237,0.2)', borderColor: Colors.brand.purple },
  chipText: { color: Colors.text.secondary, fontSize: Typography.fontSize.sm },
  chipTextActive: { color: Colors.brand.purpleLight, fontWeight: Typography.fontWeight.semibold },
  toggleChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border.default,
    backgroundColor: Colors.background.tertiary,
    alignSelf: 'flex-start',
  },
  footer: {
    padding: Spacing.lg,
    borderTopWidth: 1,
    borderTopColor: Colors.border.subtle,
  },
  applyBtn: {
    backgroundColor: Colors.brand.purple,
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.md,
    alignItems: 'center',
  },
  applyText: { color: Colors.white, fontSize: Typography.fontSize.base, fontWeight: Typography.fontWeight.bold },
});
