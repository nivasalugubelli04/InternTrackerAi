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
import { format } from 'date-fns';
import { Colors, Spacing, Typography, BorderRadius } from '../theme';
import {
  useApplicationDetail,
  useApplicationTimeline,
  useChangeApplicationStatus,
  useUpdateApplication,
  useDeleteApplication,
  ApplicationStatus,
} from '../services/applications.service';

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
    Alert.prompt('Change Status', \`Note for changing to \${newStatus} (optional):\`, [
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

  if (isLoading || !app) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.brand.purple} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backBtn}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Application Detail</Text>
        <TouchableOpacity onPress={handleDelete}>
          <Text style={styles.deleteBtn}>Delete</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Header Info */}
        <View style={styles.section}>
          <Text style={styles.companyName}>{app.companyNameSnapshot}</Text>
          <Text style={styles.jobTitle}>{app.jobTitleSnapshot}</Text>
          <Text style={styles.location}>{app.locationSnapshot}</Text>
          
          <View style={styles.metaRow}>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{app.status}</Text>
            </View>
            <Text style={styles.appliedText}>
              Applied: {app.appliedAt ? format(new Date(app.appliedAt), 'MMM dd, yyyy') : 'Unknown'}
            </Text>
          </View>
        </View>

        {/* Status Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Update Status</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: Spacing.sm }}>
            {Object.values(ApplicationStatus).map((status) => (
              <TouchableOpacity
                key={status}
                style={[styles.statusChip, app.status === status && styles.statusChipActive]}
                onPress={() => handleStatusChange(status)}
                disabled={isChangingStatus}
              >
                <Text style={[styles.statusChipText, app.status === status && styles.statusChipTextActive]}>
                  {status}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Notes */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Notes</Text>
            {editingNotes ? (
              <TouchableOpacity onPress={handleSaveNotes}>
                <Text style={styles.actionLink}>{isUpdating ? 'Saving...' : 'Save'}</Text>
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
              placeholder="Add your notes here..."
              placeholderTextColor={Colors.text.muted}
            />
          ) : (
            <Text style={styles.notesText}>{app.notes || 'No notes added.'}</Text>
          )}
        </View>

        {/* Next Action */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Next Action</Text>
          {app.nextAction ? (
            <View style={styles.nextActionBox}>
              <Text style={styles.nextActionLabel}>{app.nextAction}</Text>
              {app.nextActionDate && (
                <Text style={styles.nextActionDate}>
                  {format(new Date(app.nextActionDate), 'MMM dd, yyyy HH:mm')}
                </Text>
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
            timeline.map((event, index) => (
              <View key={event.id} style={styles.timelineEvent}>
                <View style={styles.timelineDot} />
                {index !== timeline.length - 1 && <View style={styles.timelineLine} />}
                <View style={styles.timelineContent}>
                  <Text style={styles.timelineDate}>{format(new Date(event.createdAt), 'MMM dd, HH:mm')}</Text>
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
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background.primary },
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
  deleteBtn: { fontSize: Typography.fontSize.md, color: Colors.status.error },
  headerTitle: { fontSize: Typography.fontSize.lg, fontWeight: Typography.fontWeight.bold, color: Colors.text.primary },
  content: { padding: Spacing.lg, paddingBottom: 100 },
  section: {
    backgroundColor: Colors.background.secondary,
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.lg,
  },
  companyName: { fontSize: Typography.fontSize.sm, color: Colors.text.secondary, fontWeight: Typography.fontWeight.bold, marginBottom: 4 },
  jobTitle: { fontSize: Typography.fontSize.xl, fontWeight: Typography.fontWeight.bold, color: Colors.text.primary, marginBottom: 8 },
  location: { fontSize: Typography.fontSize.sm, color: Colors.text.muted, marginBottom: Spacing.md },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  badge: { backgroundColor: Colors.brand.purple + '22', paddingHorizontal: Spacing.md, paddingVertical: 4, borderRadius: BorderRadius.md },
  badgeText: { color: Colors.brand.purple, fontWeight: Typography.fontWeight.bold, fontSize: Typography.fontSize.sm },
  appliedText: { fontSize: Typography.fontSize.sm, color: Colors.text.secondary },
  sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.md },
  sectionTitle: { fontSize: Typography.fontSize.lg, fontWeight: Typography.fontWeight.bold, color: Colors.text.primary, marginBottom: Spacing.md },
  actionLink: { color: Colors.brand.purple, fontWeight: Typography.fontWeight.semiBold },
  statusChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: Colors.border.subtle,
    backgroundColor: Colors.background.primary,
  },
  statusChipActive: { backgroundColor: Colors.brand.purple, borderColor: Colors.brand.purple },
  statusChipText: { color: Colors.text.secondary, fontSize: Typography.fontSize.sm, fontWeight: Typography.fontWeight.medium },
  statusChipTextActive: { color: Colors.text.inverse, fontWeight: Typography.fontWeight.bold },
  notesText: { color: Colors.text.primary, fontSize: Typography.fontSize.md, lineHeight: 22 },
  notesInput: { backgroundColor: Colors.background.primary, color: Colors.text.primary, padding: Spacing.md, borderRadius: BorderRadius.md, minHeight: 100, textAlignVertical: 'top', borderWidth: 1, borderColor: Colors.brand.purple },
  nextActionBox: { backgroundColor: Colors.brand.purple + '11', padding: Spacing.md, borderRadius: BorderRadius.md, borderLeftWidth: 4, borderLeftColor: Colors.brand.purple },
  nextActionLabel: { fontSize: Typography.fontSize.md, fontWeight: Typography.fontWeight.semiBold, color: Colors.brand.purple, marginBottom: 4 },
  nextActionDate: { fontSize: Typography.fontSize.sm, color: Colors.text.secondary },
  timelineEvent: { flexDirection: 'row', marginBottom: Spacing.md },
  timelineDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: Colors.brand.purple, marginTop: 4, zIndex: 2 },
  timelineLine: { position: 'absolute', left: 5, top: 16, bottom: -Spacing.md, width: 2, backgroundColor: Colors.border.subtle, zIndex: 1 },
  timelineContent: { marginLeft: Spacing.md, flex: 1 },
  timelineDate: { fontSize: Typography.fontSize.xs, color: Colors.text.muted, marginBottom: 2 },
  timelineStatus: { fontSize: Typography.fontSize.md, fontWeight: Typography.fontWeight.bold, color: Colors.text.primary },
  timelineNote: { fontSize: Typography.fontSize.sm, color: Colors.text.secondary, marginTop: 4 },
});
