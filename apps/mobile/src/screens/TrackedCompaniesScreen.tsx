import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Colors, Typography, Spacing, BorderRadius } from '../theme';
import { trackApi, TrackedCompany } from '../services/companies.service';
import type { CompaniesStackParamList } from '../navigation/CompaniesNavigator';

type NavigationProp = NativeStackNavigationProp<CompaniesStackParamList, 'TrackedCompanies'>;

export default function TrackedCompaniesScreen() {
  const navigation = useNavigation<NavigationProp>();
  const queryClient = useQueryClient();

  const { data: trackedList, isLoading } = useQuery({
    queryKey: ['trackedCompanies'],
    queryFn: trackApi.getTrackedCompanies,
  });

  const priorityMutation = useMutation({
    mutationFn: ({ id, priority }: { id: string, priority: 'HIGH' | 'MEDIUM' | 'LOW' }) => 
      trackApi.updatePriority(id, priority),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trackedCompanies'] });
    }
  });

  const cyclePriority = (companyId: string, currentPriority: string) => {
    const nextPriority = currentPriority === 'HIGH' ? 'MEDIUM' : currentPriority === 'MEDIUM' ? 'LOW' : 'HIGH';
    priorityMutation.mutate({ id: companyId, priority: nextPriority });
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Tracked Companies</Text>
        <View style={{ width: 60 }} />
      </View>

      {isLoading ? (
        <ActivityIndicator style={styles.loader} color={Colors.brand.purple} />
      ) : !trackedList || trackedList.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>You haven't tracked any companies yet.</Text>
        </View>
      ) : (
        <FlatList
          data={trackedList}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }: { item: TrackedCompany }) => (
            <TouchableOpacity
              style={styles.card}
              onPress={() => navigation.navigate('CompanyDetails', { companyId: item.company.id, companyName: item.company.name })}
            >
              <View style={styles.cardInfo}>
                <Text style={styles.companyName}>{item.company.name}</Text>
                <Text style={styles.companyIndustry}>{item.company.industry}</Text>
              </View>
              <TouchableOpacity 
                style={[styles.priorityBadge, item.priority === 'HIGH' ? styles.priorityHIGH : item.priority === 'LOW' ? styles.priorityLOW : styles.priorityMEDIUM]}
                onPress={() => cyclePriority(item.companyId, item.priority)}
                disabled={priorityMutation.isPending}
              >
                <Text style={styles.priorityText}>{item.priority}</Text>
              </TouchableOpacity>
            </TouchableOpacity>
          )}
        />
      )}
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
  emptyState: { alignItems: 'center', marginTop: Spacing['3xl'] },
  emptyText: { color: Colors.text.secondary, fontSize: Typography.fontSize.md },
  listContent: { padding: Spacing.md, gap: Spacing.md },
  card: {
    backgroundColor: Colors.background.primary,
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border.default,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardInfo: { flex: 1 },
  companyName: { fontSize: Typography.fontSize.md, fontWeight: 'bold', color: Colors.text.primary },
  companyIndustry: { fontSize: Typography.fontSize.sm, color: Colors.text.secondary, marginTop: 4 },
  priorityBadge: {
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full, borderWidth: 1,
  },
  priorityText: { fontSize: Typography.fontSize.xs, fontWeight: 'bold', color: Colors.text.primary },
  priorityHIGH: { backgroundColor: '#FEE2E2', borderColor: '#EF4444' },
  priorityMEDIUM: { backgroundColor: '#FEF3C7', borderColor: '#F59E0B' },
  priorityLOW: { backgroundColor: '#E0F2FE', borderColor: '#3B82F6' },
});
