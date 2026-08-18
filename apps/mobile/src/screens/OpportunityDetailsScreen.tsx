import React from 'react';
import { View, StyleSheet, TouchableOpacity, Text, Platform } from 'react-native';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';

import { Colors, Spacing, Typography } from '../theme';
import { OpportunityDetailPanel } from '../components/opportunities/OpportunityDetailPanel';

type RouteParams = { OpportunityDetails: { jobId: string } };

export default function OpportunityDetailsScreen(): React.ReactElement {
  const route = useRoute<RouteProp<RouteParams, 'OpportunityDetails'>>();
  const navigation = useNavigation<any>();
  const { jobId } = route.params;

  return (
    <View style={styles.container}>
      {/* Sticky Header */}
      <View style={[styles.header, { paddingTop: Platform.OS === 'ios' ? 60 : Spacing.lg }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Opportunity Details</Text>
        <View style={{ width: 50 }} /> {/* balance layout spacer */}
      </View>
      <OpportunityDetailPanel jobId={jobId} isScreen={true} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background.primary },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.sm,
    backgroundColor: Colors.background.secondary,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.subtle,
  },
  backBtn: { padding: Spacing.xs },
  backBtnText: {
    color: Colors.brand.purpleLight,
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.medium,
  },
  headerTitle: {
    color: Colors.text.primary,
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.bold,
  },
});
