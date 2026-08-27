import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { billingService, PlanItem, SubscriptionStatusData } from '../../services/billing.service';
import { PlanComparisonCard } from '../../components/billing/PlanComparisonCard';

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
  warning: '#F59E0B',
  softWarning: '#FFFBEB',
  danger: '#EF4444',
  softDanger: '#FEF2F2',
};

export const SubscriptionScreen: React.FC = () => {
  const [plans, setPlans] = useState<PlanItem[]>([]);
  const [subscription, setSubscription] = useState<SubscriptionStatusData | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [plansData, subData] = await Promise.all([
        billingService.getPlans(),
        billingService.getSubscription(),
      ]);
      setPlans(plansData);
      setSubscription(subData);
    } catch {
      // Fallback
    } finally {
      setLoading(false);
    }
  };

  const handleSelectPlan = async (plan: PlanItem) => {
    if (Number(plan.price) === 0) return;

    setCheckoutLoading(true);
    try {
      const session = await billingService.createCheckout(plan.id);
      Alert.alert(
        'Checkout Initiated',
        `Secure provider checkout created (${session.provider} session ${session.sessionId}). Redirecting to checkout portal...`,
      );
    } catch (e: any) {
      Alert.alert('Checkout Error', e?.message || 'Failed to initiate checkout.');
    } finally {
      setCheckoutLoading(false);
    }
  };

  const handleCancelSubscription = () => {
    Alert.alert(
      'Cancel Subscription',
      'Your subscription will remain active until the end of the billing period. All your saved opportunities, resumes, and simulation histories will be safely preserved.',
      [
        { text: 'Keep Subscription', style: 'cancel' },
        {
          text: 'Confirm Cancellation',
          style: 'destructive',
          onPress: async () => {
            try {
              await billingService.cancelSubscription(false);
              Alert.alert(
                'Subscription Cancelled',
                'Your subscription will not renew at the period end.',
              );
              loadData();
            } catch (e: any) {
              Alert.alert('Error', e?.message || 'Could not cancel subscription.');
            }
          },
        },
      ],
    );
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={THEME.primary} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Subscription & Plans</Text>
        <Text style={styles.headerSubtitle}>
          Transparent plans with zero surprise charges. Upgrade or downgrade anytime.
        </Text>
      </View>

      {/* Current Subscription Card */}
      {subscription && (
        <View style={styles.statusCard}>
          <View style={styles.statusRow}>
            <View>
              <Text style={styles.statusLabel}>CURRENT PLAN</Text>
              <Text style={styles.planTitle}>{subscription.planName}</Text>
            </View>
            <View
              style={[
                styles.statusBadge,
                subscription.inGracePeriod
                  ? styles.graceBadge
                  : subscription.status === 'ACTIVE'
                    ? styles.activeBadge
                    : styles.inactiveBadge,
              ]}
            >
              <Text
                style={[
                  styles.statusBadgeText,
                  subscription.inGracePeriod
                    ? styles.graceBadgeText
                    : subscription.status === 'ACTIVE'
                      ? styles.activeBadgeText
                      : styles.inactiveBadgeText,
                ]}
              >
                {subscription.inGracePeriod ? '7-DAY GRACE PERIOD' : subscription.status}
              </Text>
            </View>
          </View>

          {subscription.inGracePeriod && (
            <View style={styles.graceAlert}>
              <Text style={styles.graceAlertText}>
                ⚠️ Your last payment renewal failed. Your features remain active under our 7-day
                grace period. Please update your payment method.
              </Text>
            </View>
          )}

          {/* Usage Meters */}
          <Text style={styles.metersHeading}>Monthly Feature Usage</Text>
          <View style={styles.metersContainer}>
            {subscription.usageSummary.map((item, idx) => (
              <View key={idx} style={styles.meterItem}>
                <View style={styles.meterTopRow}>
                  <Text style={styles.meterFeatureName}>{item.feature.replace(/_/g, ' ')}</Text>
                  <Text style={styles.meterValue}>
                    {item.limit === -1
                      ? `${item.used} used (Unlimited)`
                      : `${item.used} / ${item.limit}`}
                  </Text>
                </View>
                {item.limit !== -1 && (
                  <View style={styles.progressTrack}>
                    <View
                      style={[
                        styles.progressFill,
                        {
                          width: `${item.usagePercent}%`,
                          backgroundColor:
                            item.usagePercent >= 90
                              ? THEME.danger
                              : item.usagePercent >= 80
                                ? THEME.warning
                                : THEME.primary,
                        },
                      ]}
                    />
                  </View>
                )}
              </View>
            ))}
          </View>

          {subscription.status === 'ACTIVE' &&
            subscription.tier !== 'FREE' &&
            !subscription.cancelAtPeriodEnd && (
              <TouchableOpacity style={styles.cancelBtn} onPress={handleCancelSubscription}>
                <Text style={styles.cancelBtnText}>Cancel Subscription</Text>
              </TouchableOpacity>
            )}

          {subscription.cancelAtPeriodEnd && (
            <View style={styles.cancelNotice}>
              <Text style={styles.cancelNoticeText}>
                ℹ️ Scheduled to cancel at period end (
                {new Date(subscription.currentPeriodEnd).toLocaleDateString()}). You will transition
                to Free without data loss.
              </Text>
            </View>
          )}
        </View>
      )}

      {/* Available Plans */}
      <Text style={styles.sectionHeading}>Available Plans</Text>
      {plans.map((plan) => (
        <PlanComparisonCard
          key={plan.id}
          plan={plan}
          isCurrentPlan={subscription?.tier === plan.tier}
          onSelect={() => handleSelectPlan(plan)}
          isLoading={checkoutLoading}
        />
      ))}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.soft,
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: THEME.soft,
  },
  header: {
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: THEME.text,
  },
  headerSubtitle: {
    fontSize: 13,
    color: THEME.secondary,
    marginTop: 4,
    lineHeight: 18,
  },
  statusCard: {
    backgroundColor: THEME.white,
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: THEME.border,
    marginBottom: 24,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  statusLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: THEME.secondary,
    textTransform: 'uppercase',
  },
  planTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: THEME.text,
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  activeBadge: {
    backgroundColor: THEME.softGreen,
  },
  activeBadgeText: {
    color: THEME.green,
    fontSize: 11,
    fontWeight: '700',
  },
  graceBadge: {
    backgroundColor: THEME.softWarning,
  },
  graceBadgeText: {
    color: THEME.warning,
    fontSize: 11,
    fontWeight: '700',
  },
  inactiveBadge: {
    backgroundColor: THEME.border,
  },
  inactiveBadgeText: {
    color: THEME.secondary,
    fontSize: 11,
    fontWeight: '700',
  },
  graceAlert: {
    backgroundColor: THEME.softWarning,
    padding: 10,
    borderRadius: 8,
    marginBottom: 14,
  },
  graceAlertText: {
    fontSize: 12,
    color: '#92400E',
    lineHeight: 17,
  },
  metersHeading: {
    fontSize: 13,
    fontWeight: '700',
    color: THEME.text,
    marginTop: 6,
    marginBottom: 10,
  },
  metersContainer: {
    gap: 12,
  },
  meterItem: {},
  meterTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  meterFeatureName: {
    fontSize: 12,
    color: THEME.secondary,
    fontWeight: '600',
  },
  meterValue: {
    fontSize: 12,
    fontWeight: '700',
    color: THEME.text,
  },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: THEME.border,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  cancelBtn: {
    marginTop: 16,
    paddingVertical: 10,
    alignItems: 'center',
  },
  cancelBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: THEME.danger,
  },
  cancelNotice: {
    marginTop: 14,
    padding: 10,
    backgroundColor: THEME.sky,
    borderRadius: 8,
  },
  cancelNoticeText: {
    fontSize: 12,
    color: THEME.deep,
    lineHeight: 17,
  },
  sectionHeading: {
    fontSize: 16,
    fontWeight: '800',
    color: THEME.text,
    marginBottom: 12,
  },
});
