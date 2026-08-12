import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRoute, useNavigation } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import { Colors, Typography, Spacing, BorderRadius } from '../theme';
import { companiesApi, trackApi } from '../services/companies.service';
import type { CompaniesStackParamList } from '../navigation/CompaniesNavigator';

type DetailsRouteProp = RouteProp<CompaniesStackParamList, 'CompanyDetails'>;

export default function CompanyDetailsScreen() {
  const route = useRoute<DetailsRouteProp>();
  const navigation = useNavigation();
  const queryClient = useQueryClient();
  const { companyId, companyName } = route.params;

  const { data: company, isLoading } = useQuery({
    queryKey: ['company', companyId],
    queryFn: () => companiesApi.getCompanyById(companyId),
  });

  const { data: trackedList } = useQuery({
    queryKey: ['trackedCompanies'],
    queryFn: trackApi.getTrackedCompanies,
  });

  const isTracked = trackedList?.some((t: any) => t.companyId === companyId);
  const trackedRecord = trackedList?.find((t: any) => t.companyId === companyId);

  const trackMutation = useMutation({
    mutationFn: () => trackApi.trackCompany(companyId, 'MEDIUM'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trackedCompanies'] });
    },
    onError: (error: any) => {
      Alert.alert('Error', error.response?.data?.message || 'Failed to track company');
    }
  });

  const untrackMutation = useMutation({
    mutationFn: () => trackApi.untrackCompany(companyId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trackedCompanies'] });
    }
  });

  const handleTrackToggle = () => {
    if (isTracked) {
      untrackMutation.mutate();
    } else {
      trackMutation.mutate();
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{companyName}</Text>
        <View style={{ width: 40 }} />
      </View>

      {isLoading ? (
        <ActivityIndicator style={styles.loader} color={Colors.brand.purple} />
      ) : company ? (
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.heroSection}>
            <View style={styles.logoPlaceholder}>
              <Text style={styles.logoText}>{company.name.charAt(0)}</Text>
            </View>
            <Text style={styles.title}>{company.name}</Text>
            <Text style={styles.industry}>{company.industry || 'Technology'}</Text>
            
            <TouchableOpacity 
              style={[styles.trackButton, isTracked && styles.trackedButton]} 
              onPress={handleTrackToggle}
              disabled={trackMutation.isPending || untrackMutation.isPending}
            >
              <Text style={[styles.trackButtonText, isTracked && styles.trackedButtonText]}>
                {trackMutation.isPending || untrackMutation.isPending ? 'Updating...' : isTracked ? 'Unfollow Company' : '⭐ Follow Company'}
              </Text>
            </TouchableOpacity>

            {isTracked && trackedRecord && (
              <View style={styles.priorityBadge}>
                <Text style={styles.priorityText}>Priority: {trackedRecord.priority}</Text>
              </View>
            )}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>About</Text>
            <Text style={styles.description}>{company.description || 'No description available.'}</Text>
          </View>

          <View style={styles.infoGrid}>
            <View style={styles.infoCard}>
              <Text style={styles.infoLabel}>Website</Text>
              <Text style={styles.infoValue} numberOfLines={1}>{company.website || 'N/A'}</Text>
            </View>
            <View style={styles.infoCard}>
              <Text style={styles.infoLabel}>Headquarters</Text>
              <Text style={styles.infoValue}>{company.headquarters || 'N/A'}</Text>
            </View>
            <View style={styles.infoCard}>
              <Text style={styles.infoLabel}>Company Size</Text>
              <Text style={styles.infoValue}>{company.companySize || 'N/A'}</Text>
            </View>
            <View style={styles.infoCard}>
              <Text style={styles.infoLabel}>Founded</Text>
              <Text style={styles.infoValue}>{company.foundedYear || 'N/A'}</Text>
            </View>
          </View>
        </ScrollView>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background.primary },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.md,
    paddingTop: Spacing['3xl'],
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.default,
  },
  backButton: { width: 60 },
  backText: { color: Colors.brand.purple, fontWeight: Typography.fontWeight.medium },
  headerTitle: { flex: 1, textAlign: 'center', fontWeight: 'bold', fontSize: Typography.fontSize.lg, color: Colors.text.primary },
  loader: { marginTop: Spacing.xl },
  content: { padding: Spacing.xl },
  heroSection: { alignItems: 'center', marginBottom: Spacing['2xl'] },
  logoPlaceholder: {
    width: 80, height: 80, borderRadius: BorderRadius.lg,
    backgroundColor: Colors.background.tertiary,
    alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.md,
  },
  logoText: { fontSize: 32, fontWeight: 'bold', color: Colors.text.secondary },
  title: { fontSize: Typography.fontSize['2xl'], fontWeight: 'bold', color: Colors.text.primary, marginBottom: 4 },
  industry: { fontSize: Typography.fontSize.md, color: Colors.text.secondary, marginBottom: Spacing.lg },
  trackButton: {
    backgroundColor: Colors.brand.purple,
    paddingHorizontal: Spacing.xl, paddingVertical: Spacing.md,
    borderRadius: BorderRadius.full, width: '100%', alignItems: 'center',
  },
  trackButtonText: { color: Colors.text.inverse, fontWeight: 'bold' },
  trackedButton: { backgroundColor: Colors.background.secondary, borderWidth: 1, borderColor: Colors.border.default },
  trackedButtonText: { color: Colors.text.primary },
  priorityBadge: {
    marginTop: Spacing.md, backgroundColor: Colors.brand.purpleLight,
    paddingHorizontal: Spacing.sm, paddingVertical: 4, borderRadius: BorderRadius.sm,
  },
  priorityText: { color: Colors.brand.purple, fontSize: Typography.fontSize.xs, fontWeight: 'bold' },
  section: { marginBottom: Spacing.xl },
  sectionTitle: { fontSize: Typography.fontSize.lg, fontWeight: 'bold', color: Colors.text.primary, marginBottom: Spacing.sm },
  description: { fontSize: Typography.fontSize.md, color: Colors.text.secondary, lineHeight: 24 },
  infoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.md },
  infoCard: {
    width: '47%', backgroundColor: Colors.background.secondary,
    padding: Spacing.md, borderRadius: BorderRadius.md,
  },
  infoLabel: { fontSize: Typography.fontSize.xs, color: Colors.text.muted, marginBottom: 4 },
  infoValue: { fontSize: Typography.fontSize.sm, fontWeight: 'medium', color: Colors.text.primary },
});
