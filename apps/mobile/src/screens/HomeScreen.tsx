import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';

import { useAuthContext } from '../context/AuthContext';
import { Colors, Spacing, Typography, BorderRadius } from '../theme';

/**
 * HomeScreen — authenticated placeholder for Phase 1.
 * Will be replaced by the full dashboard in Phase 2.
 */
export default function HomeScreen(): React.ReactElement {
  const { user, logout } = useAuthContext();

  const handleLogout = (): void => {
    void logout();
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Hello, {user?.firstName ?? 'there'} 👋</Text>
          <Text style={styles.subgreeting}>Welcome to InternTracker AI</Text>
        </View>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

      {/* User Info Card */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Account Details</Text>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Email</Text>
          <Text style={styles.infoValue}>{user?.email}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Role</Text>
          <Text style={styles.infoValue}>{user?.role}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Email Verified</Text>
          <Text style={[styles.infoValue, { color: user?.isEmailVerified ? Colors.success : Colors.warning }]}>
            {user?.isEmailVerified ? '✅ Verified' : '⚠️ Not Verified'}
          </Text>
        </View>
      </View>

      {/* Phase 2 Preview */}
      <View style={styles.phaseCard}>
        <Text style={styles.phaseEmoji}>🚀</Text>
        <Text style={styles.phaseTitle}>Phase 2 Coming Soon</Text>
        <Text style={styles.phaseBody}>
          Internship tracking, company profiles, and AI-powered matching will be available in the next phase.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background.primary },
  content: { padding: Spacing.xl, paddingTop: Spacing['2xl'] },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: Spacing.xl },
  greeting: { color: Colors.text.primary, fontSize: Typography.fontSize.xl, fontWeight: Typography.fontWeight.bold },
  subgreeting: { color: Colors.text.secondary, fontSize: Typography.fontSize.sm, marginTop: 4 },
  logoutButton: { backgroundColor: Colors.background.tertiary, borderWidth: 1, borderColor: Colors.border.default, borderRadius: BorderRadius.md, paddingVertical: Spacing.xs, paddingHorizontal: Spacing.sm },
  logoutText: { color: Colors.text.secondary, fontSize: Typography.fontSize.sm, fontWeight: Typography.fontWeight.medium },
  card: { backgroundColor: Colors.background.secondary, borderRadius: BorderRadius.lg, borderWidth: 1, borderColor: Colors.border.subtle, padding: Spacing.lg, marginBottom: Spacing.lg },
  cardTitle: { color: Colors.text.primary, fontSize: Typography.fontSize.lg, fontWeight: Typography.fontWeight.semibold, marginBottom: Spacing.md },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: Spacing.xs, borderBottomWidth: 1, borderBottomColor: Colors.border.subtle },
  infoLabel: { color: Colors.text.secondary, fontSize: Typography.fontSize.sm },
  infoValue: { color: Colors.text.primary, fontSize: Typography.fontSize.sm, fontWeight: Typography.fontWeight.medium },
  phaseCard: { backgroundColor: Colors.glass.surface, borderRadius: BorderRadius.lg, borderWidth: 1, borderColor: Colors.glass.border, padding: Spacing.lg, alignItems: 'center' },
  phaseEmoji: { fontSize: 40, marginBottom: Spacing.sm },
  phaseTitle: { color: Colors.text.primary, fontSize: Typography.fontSize.lg, fontWeight: Typography.fontWeight.semibold, marginBottom: Spacing.sm },
  phaseBody: { color: Colors.text.secondary, fontSize: Typography.fontSize.sm, textAlign: 'center', lineHeight: 20 },
});
