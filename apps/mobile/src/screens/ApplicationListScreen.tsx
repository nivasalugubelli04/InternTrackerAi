import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Colors, Spacing, Typography, BorderRadius } from '../theme';
import { useApplications, ApplicationStatus, Application } from '../services/applications.service';

const { width } = Dimensions.get('window');
const COLUMN_WIDTH = width * 0.85;

const formatDate = (date: string | Date) => {
  return new Date(date).toLocaleDateString('en-US', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

const COLUMNS = [
  { status: ApplicationStatus.SAVED, label: 'Saved', color: Colors.text.muted },
  {
    status: ApplicationStatus.APPLICATION_STARTED,
    label: 'Started',
    color: Colors.brand.purpleLight,
  },
  { status: ApplicationStatus.APPLIED, label: 'Applied', color: Colors.brand.purple },
  { status: ApplicationStatus.ASSESSMENT, label: 'Assessment', color: Colors.brand.cyan },
  { status: ApplicationStatus.INTERVIEW, label: 'Interview', color: Colors.warning },
  { status: ApplicationStatus.OFFER, label: 'Offer', color: Colors.success },
  { status: 'CLOSED' as any, label: 'Closed', color: Colors.error },
];

const ApplicationCard = ({ app, onPress }: { app: Application; onPress: () => void }) => {
  const getPriorityColor = (label: string) => {
    switch (label) {
      case 'URGENT':
        return Colors.error;
      case 'HIGH':
        return Colors.brand.purpleLight;
      case 'MEDIUM':
        return Colors.warning;
      default:
        return Colors.text.muted;
    }
  };

  const priorityColor = getPriorityColor(app.priorityLabel);
  const matchScore = app.job?.matchScores?.[0]?.overallScore ?? 75;

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.cardHeader}>
        <Text style={styles.companyName} numberOfLines={1}>
          {app.companyNameSnapshot}
        </Text>
        <Text
          style={[
            styles.priorityBadge,
            {
              color: priorityColor,
              borderColor: `${priorityColor}44`,
              backgroundColor: `${priorityColor}11`,
            },
          ]}
        >
          {app.priorityLabel}
        </Text>
      </View>

      <Text style={styles.jobTitle} numberOfLines={2}>
        {app.jobTitleSnapshot}
      </Text>

      <View style={styles.metaRow}>
        <Text style={styles.location} numberOfLines={1}>
          📍 {app.locationSnapshot || 'Remote'}
        </Text>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{app.status.replace('_', ' ')}</Text>
        </View>
      </View>

      <View style={styles.footerRow}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', width: '100%' }}>
          <Text style={styles.matchText}>🎯 {matchScore}% Match</Text>
          {app.appliedAt && <Text style={styles.dateText}>Sent: {formatDate(app.appliedAt)}</Text>}
        </View>
        {app.nextAction && (
          <Text style={styles.actionText} numberOfLines={1}>
            ⏰ Next: {app.nextAction}{' '}
            {app.nextActionDate ? `(${formatDate(app.nextActionDate)})` : ''}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );
};

const KanbanColumn = ({
  status,
  label,
  color,
}: {
  status: ApplicationStatus;
  label: string;
  color: string;
}) => {
  const navigation = useNavigation<any>();
  const { data, isLoading, refetch } = useApplications(status);

  const apps = data?.pages.flatMap((page) => page.data) || [];

  return (
    <View style={styles.column}>
      <View style={[styles.columnHeader, { borderTopColor: color }]}>
        <Text style={styles.columnTitle}>{label}</Text>
        <View style={styles.countBadge}>
          <Text style={styles.countText}>{apps.length}</Text>
        </View>
      </View>

      {isLoading ? (
        <ActivityIndicator color={color} style={{ marginTop: Spacing.xl }} />
      ) : (
        <FlatList
          data={apps}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <ApplicationCard
              app={item}
              onPress={() => navigation.navigate('ApplicationDetail', { id: item.id })}
            />
          )}
          contentContainerStyle={styles.columnList}
          showsVerticalScrollIndicator={false}
          refreshing={isLoading}
          onRefresh={refetch}
          ListEmptyComponent={
            <Text style={styles.emptyColumnText}>No applications in this stage</Text>
          }
        />
      )}
    </View>
  );
};

export default function ApplicationListScreen() {
  const navigation = useNavigation<any>();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backBtn}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Application Board</Text>
        <View style={{ width: 50 }} />
      </View>

      <FlatList
        horizontal
        data={COLUMNS}
        keyExtractor={(item) => item.label}
        renderItem={({ item }) => (
          <KanbanColumn status={item.status} label={item.label} color={item.color} />
        )}
        showsHorizontalScrollIndicator={false}
        snapToInterval={COLUMN_WIDTH + Spacing.md}
        decelerationRate="fast"
        contentContainerStyle={styles.boardContent}
      />
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
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingTop: 60,
    paddingBottom: Spacing.md,
    backgroundColor: Colors.background.secondary,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.subtle,
  },
  backBtn: {
    fontSize: Typography.fontSize.md,
    color: Colors.text.secondary,
  },
  headerTitle: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text.primary,
  },
  boardContent: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.lg,
    gap: Spacing.md,
  },
  column: {
    width: COLUMN_WIDTH,
    backgroundColor: Colors.background.secondary,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border.subtle,
  },
  columnHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: Spacing.md,
    borderTopWidth: 4,
    borderTopLeftRadius: BorderRadius.sm,
    borderTopRightRadius: BorderRadius.sm,
    marginBottom: Spacing.sm,
  },
  columnTitle: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text.primary,
    marginTop: 4,
  },
  countBadge: {
    backgroundColor: Colors.background.primary,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
    marginTop: 4,
  },
  countText: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text.secondary,
  },
  columnList: {
    flexGrow: 1,
    paddingBottom: Spacing['2xl'],
  },
  emptyColumnText: {
    textAlign: 'center',
    color: Colors.text.muted,
    marginTop: Spacing.xl,
    fontStyle: 'italic',
    fontSize: Typography.fontSize.xs,
  },
  card: {
    backgroundColor: Colors.background.primary,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border.subtle,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  companyName: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text.secondary,
    flex: 1,
  },
  priorityBadge: {
    fontSize: 9,
    fontWeight: Typography.fontWeight.bold,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
  },
  jobTitle: {
    fontSize: Typography.fontSize.md,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.text.primary,
    marginBottom: Spacing.sm,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  location: {
    fontSize: Typography.fontSize.xs,
    color: Colors.text.muted,
    flex: 1,
  },
  badge: {
    backgroundColor: Colors.brand.purple + '15',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
  },
  badgeText: {
    fontSize: 9,
    color: Colors.brand.purple,
    fontWeight: Typography.fontWeight.bold,
    textTransform: 'uppercase',
  },
  footerRow: {
    borderTopWidth: 1,
    borderTopColor: Colors.border.subtle,
    paddingTop: Spacing.sm,
    gap: 6,
  },
  matchText: {
    fontSize: Typography.fontSize.xs,
    color: Colors.success,
    fontWeight: Typography.fontWeight.bold,
  },
  dateText: {
    fontSize: Typography.fontSize.xs,
    color: Colors.text.muted,
  },
  actionText: {
    fontSize: Typography.fontSize.xs,
    color: Colors.brand.purpleLight,
    fontWeight: Typography.fontWeight.semibold,
  },
});
