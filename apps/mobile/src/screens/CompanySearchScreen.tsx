import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Colors, Typography, Spacing, BorderRadius } from '../theme';
import { companiesApi, Company } from '../services/companies.service';
import type { CompaniesStackParamList } from '../navigation/CompaniesNavigator';

type NavigationProp = NativeStackNavigationProp<CompaniesStackParamList, 'CompanySearch'>;

export default function CompanySearchScreen() {
  const navigation = useNavigation<NavigationProp>();
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');

  // Debounce logic
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(handler);
  }, [query]);

  const { data: response, isLoading } = useQuery({
    queryKey: ['companySearch', debouncedQuery],
    queryFn: () => companiesApi.getCompanies({ q: debouncedQuery, limit: 20 }),
    enabled: debouncedQuery.length > 0,
  });

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <TextInput
          style={styles.searchInput}
          placeholder="Search companies, industries..."
          placeholderTextColor={Colors.text.muted}
          value={query}
          onChangeText={setQuery}
          autoFocus
        />
      </View>

      {isLoading ? (
        <ActivityIndicator style={styles.loader} color={Colors.brand.purple} />
      ) : debouncedQuery.length > 0 && response?.data.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>No companies found for "{debouncedQuery}"</Text>
        </View>
      ) : (
        <FlatList
          data={response?.data || []}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }: { item: Company }) => (
            <TouchableOpacity
              style={styles.card}
              onPress={() => navigation.navigate('CompanyDetails', { companyId: item.id, companyName: item.name })}
            >
              <View style={styles.cardHeader}>
                <View style={styles.logoPlaceholder}>
                  <Text style={styles.logoText}>{item.name.charAt(0)}</Text>
                </View>
                <View style={styles.cardInfo}>
                  <Text style={styles.companyName}>{item.name}</Text>
                  <Text style={styles.companyIndustry}>{item.industry || 'Tech'}</Text>
                </View>
              </View>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.primary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    paddingTop: Spacing['3xl'],
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.default,
  },
  backButton: {
    marginRight: Spacing.md,
  },
  backText: {
    color: Colors.brand.purple,
    fontWeight: Typography.fontWeight.medium,
  },
  searchInput: {
    flex: 1,
    backgroundColor: Colors.background.secondary,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    color: Colors.text.primary,
  },
  loader: {
    marginTop: Spacing.xl,
  },
  emptyState: {
    alignItems: 'center',
    marginTop: Spacing['3xl'],
  },
  emptyText: {
    color: Colors.text.secondary,
    fontSize: Typography.fontSize.md,
  },
  listContent: {
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  card: {
    backgroundColor: Colors.background.primary,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border.default,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.background.tertiary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  logoText: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text.secondary,
  },
  cardInfo: {
    flex: 1,
  },
  companyName: {
    fontSize: Typography.fontSize.md,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text.primary,
  },
  companyIndustry: {
    fontSize: Typography.fontSize.sm,
    color: Colors.text.secondary,
    marginTop: 2,
  },
});
