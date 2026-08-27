import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { PlanItem } from '../../services/billing.service';

const THEME = {
  primary: '#246BFE',
  deep: '#1456D9',
  sky: '#EAF3FF',
  soft: '#F3F7FF',
  white: '#FFFFFF',
  text: '#111111',
  secondary: '#6B7280',
  border: '#E7EAF0',
  green: '#10B981',
  softGreen: '#E9FBEA',
  badgeBg: '#FFF4D8',
  badgeText: '#B45309',
};

interface Props {
  plan: PlanItem;
  isCurrentPlan: boolean;
  onSelect: () => void;
  isLoading?: boolean;
}

export const PlanComparisonCard: React.FC<Props> = ({
  plan,
  isCurrentPlan,
  onSelect,
  isLoading,
}) => {
  const priceNum = Number(plan.price);
  const isFree = priceNum === 0;

  return (
    <View
      style={[
        styles.card,
        plan.isPopular && styles.popularCard,
        isCurrentPlan && styles.currentCard,
      ]}
    >
      {plan.isPopular && (
        <View style={styles.popularBadge}>
          <Text style={styles.popularBadgeText}>⭐ MOST POPULAR</Text>
        </View>
      )}

      {/* Plan Header */}
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.planName}>{plan.name}</Text>
          <Text style={styles.planDesc}>{plan.description}</Text>
        </View>
      </View>

      {/* Price */}
      <View style={styles.priceRow}>
        <Text style={styles.priceText}>{isFree ? '$0' : `$${priceNum}`}</Text>
        <Text style={styles.periodText}>{isFree ? '/ forever' : '/ month'}</Text>
      </View>

      {/* Features List */}
      <View style={styles.featuresList}>
        {(plan.featuresJson || []).map((feature, idx) => (
          <View key={idx} style={styles.featureItem}>
            <Text style={styles.checkIcon}>✓</Text>
            <Text style={styles.featureText}>{feature}</Text>
          </View>
        ))}
      </View>

      {/* CTA Button */}
      <TouchableOpacity
        style={[
          styles.actionBtn,
          isCurrentPlan && styles.currentBtn,
          plan.isPopular && !isCurrentPlan && styles.popularBtn,
        ]}
        onPress={onSelect}
        disabled={isCurrentPlan || isLoading}
        accessibilityRole="button"
        accessibilityLabel={isCurrentPlan ? 'Current Plan' : `Select ${plan.name}`}
      >
        <Text style={[styles.actionBtnText, isCurrentPlan && styles.currentBtnText]}>
          {isCurrentPlan
            ? 'Current Plan'
            : isFree
              ? 'Get Started Free'
              : `Upgrade to ${plan.name} →`}
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: THEME.white,
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: THEME.border,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  popularCard: {
    borderColor: THEME.primary,
    borderWidth: 2,
  },
  currentCard: {
    backgroundColor: THEME.soft,
    borderColor: THEME.deep,
  },
  popularBadge: {
    alignSelf: 'flex-start',
    backgroundColor: THEME.badgeBg,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    marginBottom: 10,
  },
  popularBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: THEME.badgeText,
  },
  headerRow: {
    marginBottom: 10,
  },
  planName: {
    fontSize: 18,
    fontWeight: '800',
    color: THEME.text,
  },
  planDesc: {
    fontSize: 12,
    color: THEME.secondary,
    marginTop: 4,
    lineHeight: 18,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginVertical: 12,
  },
  priceText: {
    fontSize: 28,
    fontWeight: '900',
    color: THEME.text,
  },
  periodText: {
    fontSize: 13,
    color: THEME.secondary,
    marginLeft: 6,
    fontWeight: '600',
  },
  featuresList: {
    borderTopWidth: 1,
    borderColor: THEME.border,
    paddingTop: 12,
    marginBottom: 16,
    gap: 8,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkIcon: {
    fontSize: 14,
    fontWeight: '800',
    color: THEME.green,
    marginRight: 8,
  },
  featureText: {
    fontSize: 13,
    color: THEME.text,
    flex: 1,
    lineHeight: 18,
  },
  actionBtn: {
    backgroundColor: THEME.primary,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  popularBtn: {
    backgroundColor: THEME.deep,
  },
  currentBtn: {
    backgroundColor: THEME.border,
  },
  actionBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: THEME.white,
  },
  currentBtnText: {
    color: THEME.secondary,
  },
});
