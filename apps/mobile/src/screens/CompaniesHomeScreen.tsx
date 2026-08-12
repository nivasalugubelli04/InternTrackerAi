import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Colors, Typography, Spacing, BorderRadius } from '../theme';
import { companiesApi, CompanyCategory, Company } from '../services/companies.service';
import type { CompaniesStackParamList } from '../navigation/CompaniesNavigator';

type NavigationProp = NativeStackNavigationProp<CompaniesStackParamList, 'CompaniesHome'>;

export default function CompaniesHomeScreen() {
  const navigation = useNavigation<NavigationProp>();

  const { data: categories, isLoading: loadingCats } = useQuery({
    queryKey: ['companyCategories'],
    queryFn: companiesApi.getCategories,
  });

  const { data: trendingResponse, isLoading: loadingTrending } = useQuery({
    queryKey: ['trendingCompanies'],
    queryFn: () => companiesApi.getCompanies({ limit: 10 }),
  });

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.title}>Company Intelligence</Text>
        <Text style={styles.subtitle}>Discover and track top companies</Text>
      </View>

      <TouchableOpacity
        style={styles.searchBar}
        activeOpacity={0.8}
        onPress={() => navigation.navigate('CompanySearch')}
      >
        <Text style={styles.searchText}>🔍 Search for companies...</Text>
      </TouchableOpacity>

      <View style={styles.actionsContainer}>
        <TouchableOpacity 
          style={styles.actionButton}
          onPress={() => navigation.navigate('TrackedCompanies')}
        >
          <Text style={styles.actionButtonText}>⭐ View Tracked Companies</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Browse by Category</Text>
        {loadingCats ? (
          <ActivityIndicator color={Colors.brand.purple} />
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoriesScroll}>
            {categories?.map((cat: CompanyCategory) => (
              <TouchableOpacity key={cat.id} style={styles.categoryChip}>
                <Text style={styles.categoryText}>{cat.icon} {cat.name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Trending Companies</Text>
        {loadingTrending ? (
          <ActivityIndicator color={Colors.brand.purple} />
        ) : (
          <View style={styles.list}>
            {trendingResponse?.data.map((company: Company) => (
              <TouchableOpacity
                key={company.id}
                style={styles.card}
                onPress={() => navigation.navigate('CompanyDetails', { companyId: company.id, companyName: company.name })}
              >
                <View style={styles.cardHeader}>
                  <View style={styles.logoPlaceholder}>
                    <Text style={styles.logoText}>{company.name.charAt(0)}</Text>
                  </View>
                  <View style={styles.cardInfo}>
                    <Text style={styles.companyName}>{company.name}</Text>
                    <Text style={styles.companyIndustry}>{company.industry || 'Tech'}</Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.primary,
  },
  content: {
    padding: Spacing.xl,
    paddingTop: Spacing['3xl'],
  },
  header: {
    marginBottom: Spacing.xl,
  },
  title: {
    fontSize: Typography.fontSize['2xl'],
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text.primary,
  },
  subtitle: {
    fontSize: Typography.fontSize.md,
    color: Colors.text.secondary,
    marginTop: Spacing.xs,
  },
  searchBar: {
    backgroundColor: Colors.background.secondary,
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.xl,
    borderWidth: 1,
    borderColor: Colors.border.default,
  },
  searchText: {
    color: Colors.text.muted,
    fontSize: Typography.fontSize.md,
  },
  actionsContainer: {
    marginBottom: Spacing.xl,
  },
  actionButton: {
    backgroundColor: Colors.brand.purpleLight,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
  },
  actionButtonText: {
    color: Colors.brand.purple,
    fontWeight: Typography.fontWeight.semibold,
  },
  section: {
    marginBottom: Spacing.xl,
  },
  sectionTitle: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text.primary,
    marginBottom: Spacing.md,
  },
  categoriesScroll: {
    flexDirection: 'row',
  },
  categoryChip: {
    backgroundColor: Colors.background.secondary,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    marginRight: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border.subtle,
  },
  categoryText: {
    color: Colors.text.primary,
    fontWeight: Typography.fontWeight.medium,
  },
  list: {
    gap: Spacing.md,
  },
  card: {
    backgroundColor: Colors.background.primary,
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border.default,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.background.tertiary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  logoText: {
    fontSize: Typography.fontSize.xl,
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
