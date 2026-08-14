import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { Colors, Spacing, Typography, BorderRadius } from '../theme';
import {
  useApplicationDetail,
  useApplicationTimeline,
  useChangeApplicationStatus,
  useUpdateApplication,
  useDeleteApplication,
  ApplicationStatus,
} from '../services/applications.service';

const formatDate = (date: string | Date) => {
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export default function ApplicationDetailScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { id } = route.params;

  const { data: app, isLoading } = useApplicationDetail(id);
  const { data: timeline } = useApplicationTimeline(id);
  const { mutate: changeStatus, isPending: isChangingStatus } = useChangeApplicationStatus();
  const { mutate: updateApp, isPending: isUpdating } = useUpdateApplication();
  const { mutate: deleteApp } = useDeleteApplication();

  const [notesText, setNotesText] = useState(app?.notes || '');
  const [editingNotes, setEditingNotes] = useState(false);

  // Sync state if it was loaded later
  React.useEffect(() => {
    if (app?.notes && !editingNotes) {
      setNotesText(app.notes);
    }
  }, [app?.notes]);

  const handleSaveNotes = () => {
    updateApp({ id, data: { notes: notesText } });
    setEditingNotes(false);
  };

  const handleStatusChange = (newStatus: ApplicationStatus) => {
    if (newStatus === app?.status) return;
    Alert.prompt('Change Status', `Note for changing to ${newStatus} (optional):`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Update', onPress: (note) => changeStatus({ id, status: newStatus, note }) },
    ]);
  };

  const handleDelete = () => {
    Alert.alert('Delete Application', 'Are you sure? This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          deleteApp(id, {
            onSuccess: () => navigation.goBack(),
          });
        },
      },
    ]);
  };

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.brand.purple} />
      </View>
    );
  }

  if (!app) {
    return (
      <View style={styles.center}>
        <Text style={styles.notesText}>Application not found</Text>
      </View>
    );
  }

  const statuses: ApplicationStatus[] = [
    ApplicationStatus.SAVED,
    ApplicationStatus.APPLIED,
    ApplicationStatus.ASSESSMENT,
    ApplicationStatus.INTERVIEW,
    ApplicationStatus.OFFER,
    ApplicationStatus.REJECTED,
    ApplicationStatus.WITHDRAWN,
  ];

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backBtn}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Application</Text>
        <TouchableOpacity onPress={handleDelete}>
          <Text style={styles.deleteBtn}>Delete</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Company & Role */}
        <View style={styles.section}>
          <Text style={styles.companyName}>{app.companyNameSnapshot || 'Company'}</Text>
          <Text style={styles.jobTitle}>{app.jobTitleSnapshot || 'Role'}</Text>
          <Text style={styles.location}>📍 {app.locationSnapshot || 'Remote'}</Text>

          <View style={styles.metaRow}>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{app.status}</Text>
            </View>
            {app.appliedAt && (
              <Text style={styles.appliedText}>Applied {formatDate(app.appliedAt)}</Text>
            )}
          </View>
        </View>

        {/* Change Status */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Update Status</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: Spacing.sm }}
          >
            {statuses.map((s) => {
              const isActive = s === app.status;
              return (
                <TouchableOpacity
                  key={s}
                  style={[styles.statusChip, isActive && styles.statusChipActive]}
                  onPress={() => handleStatusChange(s)}
                  disabled={isChangingStatus}
                >
                  <Text style={[styles.statusChipText, isActive && styles.statusChipTextActive]}>
                    {s}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Notes */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Notes</Text>
            {editingNotes ? (
              <TouchableOpacity onPress={handleSaveNotes} disabled={isUpdating}>
                <Text style={styles.actionLink}>Save</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity onPress={() => setEditingNotes(true)}>
                <Text style={styles.actionLink}>Edit</Text>
              </TouchableOpacity>
            )}
          </View>

          {editingNotes ? (
            <TextInput
              style={styles.notesInput}
              multiline
              value={notesText}
              onChangeText={setNotesText}
              placeholder="Add your personal notes or preparation points..."
              placeholderTextColor={Colors.text.muted}
            />
          ) : (
            <Text style={styles.notesText}>{app.notes || 'No notes added yet.'}</Text>
          )}
        </View>

        {/* Next Action */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Next Action</Text>
          {app.nextAction ? (
            <View style={styles.nextActionBox}>
              <Text style={styles.nextActionLabel}>{app.nextAction}</Text>
              {app.nextActionDate && (
                <Text style={styles.nextActionDate}>Due: {formatDate(app.nextActionDate)}</Text>
              )}
            </View>
          ) : (
            <Text style={styles.notesText}>No next action planned.</Text>
          )}
        </View>

        {/* Timeline */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Timeline</Text>
          {!timeline?.length ? (
            <Text style={styles.notesText}>No events yet.</Text>
          ) : (
            timeline.map((event: any, index: number) => (
              <View key={event.id} style={styles.timelineEvent}>
                <View style={styles.timelineDot} />
                {index !== timeline.length - 1 && <View style={styles.timelineLine} />}
                <View style={styles.timelineContent}>
                  <Text style={styles.timelineDate}>{formatDate(event.createdAt)}</Text>
                  <Text style={styles.timelineStatus}>{event.toStatus}</Text>
                  {event.note && <Text style={styles.timelineNote}>{event.note}</Text>}
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background.primary,
  },
  container: { flex: 1, backgroundColor: Colors.background.primary },
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
  backBtn: { fontSize: Typography.fontSize.md, color: Colors.text.secondary },
  deleteBtn: { fontSize: Typography.fontSize.md, color: Colors.error },
  headerTitle: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text.primary,
  },
  content: { padding: Spacing.lg, paddingBottom: 100 },
  section: {
    backgroundColor: Colors.background.secondary,
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.lg,
  },
  companyName: {
    fontSize: Typography.fontSize.sm,
    color: Colors.text.secondary,
    fontWeight: Typography.fontWeight.bold,
    marginBottom: 4,
  },
  jobTitle: {
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text.primary,
    marginBottom: 8,
  },
  location: {
    fontSize: Typography.fontSize.sm,
    color: Colors.text.muted,
    marginBottom: Spacing.md,
  },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  badge: {
    backgroundColor: Colors.brand.purple + '22',
    paddingHorizontal: Spacing.md,
    paddingVertical: 4,
    borderRadius: BorderRadius.md,
  },
  badgeText: {
    color: Colors.brand.purple,
    fontWeight: Typography.fontWeight.bold,
    fontSize: Typography.fontSize.sm,
  },
  appliedText: { fontSize: Typography.fontSize.sm, color: Colors.text.secondary },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text.primary,
    marginBottom: Spacing.md,
  },
  actionLink: { color: Colors.brand.purple, fontWeight: Typography.fontWeight.semibold },
  statusChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: Colors.border.subtle,
    backgroundColor: Colors.background.primary,
  },
  statusChipActive: { backgroundColor: Colors.brand.purple, borderColor: Colors.brand.purple },
  statusChipText: {
    color: Colors.text.secondary,
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.medium,
  },
  statusChipTextActive: { color: Colors.text.inverse, fontWeight: Typography.fontWeight.bold },
  notesText: { color: Colors.text.primary, fontSize: Typography.fontSize.md, lineHeight: 22 },
  notesInput: {
    backgroundColor: Colors.background.primary,
    color: Colors.text.primary,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    minHeight: 100,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: Colors.brand.purple,
  },
  nextActionBox: {
    backgroundColor: Colors.brand.purple + '11',
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderLeftWidth: 4,
    borderLeftColor: Colors.brand.purple,
  },
  nextActionLabel: {
    fontSize: Typography.fontSize.md,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.brand.purple,
    marginBottom: 4,
  },
  nextActionDate: { fontSize: Typography.fontSize.sm, color: Colors.text.secondary },
  timelineEvent: { flexDirection: 'row', marginBottom: Spacing.md },
  timelineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: Colors.brand.purple,
    marginTop: 4,
    zIndex: 2,
  },
  timelineLine: {
    position: 'absolute',
    left: 5,
    top: 16,
    bottom: -Spacing.md,
    width: 2,
    backgroundColor: Colors.border.subtle,
    zIndex: 1,
  },
  timelineContent: { marginLeft: Spacing.md, flex: 1 },
  timelineDate: { fontSize: Typography.fontSize.xs, color: Colors.text.muted, marginBottom: 2 },
  timelineStatus: {
    fontSize: Typography.fontSize.md,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text.primary,
  },
  timelineNote: { fontSize: Typography.fontSize.sm, color: Colors.text.secondary, marginTop: 4 },
});
