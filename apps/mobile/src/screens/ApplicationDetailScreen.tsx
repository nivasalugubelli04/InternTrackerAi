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
  Clipboard,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { Colors, Spacing, Typography, BorderRadius } from '../theme';
import {
  useApplicationDetail,
  useApplicationTimeline,
  useChangeApplicationStatus,
  useUpdateApplication,
  useDeleteApplication,
  useAnalyzeApplication,
  useGenerateCoverLetter,
  useGetFollowUpDraft,
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

const STAGES = ['SAVED', 'APPLIED', 'ASSESSMENT', 'INTERVIEW', 'OFFER'];

export default function ApplicationDetailScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { id } = route.params;

  const { data: app, isLoading } = useApplicationDetail(id);
  const { data: timeline } = useApplicationTimeline(id);
  const { mutate: changeStatus, isPending: isChangingStatus } = useChangeApplicationStatus();
  const { mutate: updateApp, isPending: isUpdating } = useUpdateApplication();
  const { mutate: deleteApp } = useDeleteApplication();

  // AI Mutations
  const analyzeMutation = useAnalyzeApplication();
  const generateCoverLetterMutation = useGenerateCoverLetter();
  const followUpMutation = useGetFollowUpDraft();

  const [notesText, setNotesText] = useState('');
  const [editingNotes, setEditingNotes] = useState(false);

  const [coverLetterText, setCoverLetterText] = useState('');
  const [editingCoverLetter, setEditingCoverLetter] = useState(false);

  const [aiAnalysis, setAiAnalysis] = useState<any>(null);
  const [followUpDraft, setFollowUpDraft] = useState<any>(null);

  // Sync state if loaded
  React.useEffect(() => {
    if (app) {
      setNotesText(app.notes || '');
      setCoverLetterText(app.coverLetterText || '');
    }
  }, [app]);

  const handleSaveNotes = () => {
    updateApp({ id, data: { notes: notesText } });
    setEditingNotes(false);
  };

  const handleSaveCoverLetter = () => {
    updateApp({ id, data: { coverLetterText } });
    setEditingCoverLetter(false);
  };

  const handleStatusChange = (newStatus: ApplicationStatus) => {
    if (newStatus === app?.status) return;
    Alert.prompt('Change Status', `Note for changing to ${newStatus} (optional):`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Update', onPress: (note) => changeStatus({ id, status: newStatus, note }) },
    ]);
  };

  const handleRunAiAnalysis = () => {
    analyzeMutation.mutate(id, {
      onSuccess: (data) => {
        setAiAnalysis(data);
      },
      onError: (err: any) => {
        Alert.alert(
          'AI Analysis Error',
          err.response?.data?.message || 'Failed to analyze application.',
        );
      },
    });
  };

  const handleAiDraftCoverLetter = () => {
    generateCoverLetterMutation.mutate(id, {
      onSuccess: (data) => {
        setCoverLetterText(data.content);
        setEditingCoverLetter(true);
      },
      onError: (err: any) => {
        Alert.alert(
          'AI Letter Error',
          err.response?.data?.message || 'Failed to draft cover letter.',
        );
      },
    });
  };

  const handleAiGetFollowUp = () => {
    followUpMutation.mutate(id, {
      onSuccess: (data) => {
        setFollowUpDraft(data);
      },
      onError: (err: any) => {
        Alert.alert(
          'AI Follow Up Error',
          err.response?.data?.message || 'Failed to draft follow up email.',
        );
      },
    });
  };

  const copyFollowUpToClipboard = () => {
    if (followUpDraft) {
      Clipboard.setString(`Subject: ${followUpDraft.subject}\n\n${followUpDraft.body}`);
      Alert.alert('Copied!', 'Follow-up email has been copied to your clipboard.');
    }
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

  const matchScore = app.job?.matchScores?.[0]?.overallScore ?? 75;
  const readinessScore = aiAnalysis?.readinessScore ?? 65;

  const currentIdx = STAGES.indexOf(app.status);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backBtn}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Application Hub</Text>
        <TouchableOpacity onPress={handleDelete}>
          <Text style={styles.deleteBtn}>Delete</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Company & Role snapshot */}
        <View style={styles.section}>
          <Text style={styles.companyName}>{app.companyNameSnapshot || 'Company'}</Text>
          <Text style={styles.jobTitle}>{app.jobTitleSnapshot || 'Role'}</Text>
          <Text style={styles.location}>📍 {app.locationSnapshot || 'Remote'}</Text>

          <View style={styles.metaRow}>
            <View style={[styles.badge, { backgroundColor: Colors.brand.purple + '22' }]}>
              <Text style={styles.badgeText}>{app.status.replace('_', ' ')}</Text>
            </View>
            <View style={[styles.badge, { backgroundColor: Colors.error + '22' }]}>
              <Text style={[styles.badgeText, { color: Colors.error }]}>{app.priorityLabel}</Text>
            </View>
            {app.appliedAt && (
              <Text style={styles.appliedText}>Sent: {formatDate(app.appliedAt)}</Text>
            )}
          </View>
        </View>

        {/* Stage progress line */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Visual Timeline Tracker</Text>
          <View style={styles.progressTracker}>
            {STAGES.map((stage, idx) => {
              const isActive = idx <= currentIdx;
              const isCurrent = app.status === stage;
              return (
                <View key={stage} style={styles.progressStep}>
                  <View
                    style={[
                      styles.progressDot,
                      isActive && styles.progressDotActive,
                      isCurrent && {
                        backgroundColor: Colors.brand.purpleLight,
                        scaleX: 1.2,
                        scaleY: 1.2,
                      },
                    ]}
                  />
                  <Text style={[styles.progressLabel, isActive && styles.progressLabelActive]}>
                    {stage.toLowerCase()}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* Circular match scores metrics */}
        <View style={styles.scoreRow}>
          <View style={styles.scoreCard}>
            <Text style={styles.scoreTitle}>Job Match</Text>
            <View style={[styles.circleContainer, { borderColor: Colors.success }]}>
              <Text style={[styles.circleValue, { color: Colors.success }]}>{matchScore}%</Text>
            </View>
          </View>
          <View style={styles.scoreCard}>
            <Text style={styles.scoreTitle}>Readiness</Text>
            <View style={[styles.circleContainer, { borderColor: Colors.brand.purpleLight }]}>
              <Text style={[styles.circleValue, { color: Colors.brand.purpleLight }]}>
                {readinessScore}%
              </Text>
            </View>
          </View>
        </View>

        {/* Change status action row */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Update Status</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: Spacing.sm }}
          >
            {Object.values(ApplicationStatus).map((s) => {
              const isActive = s === app.status;
              return (
                <TouchableOpacity
                  key={s}
                  style={[styles.statusChip, isActive && styles.statusChipActive]}
                  onPress={() => handleStatusChange(s)}
                  disabled={isChangingStatus}
                >
                  <Text style={[styles.statusChipText, isActive && styles.statusChipTextActive]}>
                    {s.replace('_', ' ')}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Linked Documents manager */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Linked Files & Documents</Text>
          <View style={styles.docRow}>
            <Text style={styles.docLabel}>📂 Linked Resume:</Text>
            <Text style={styles.docValue}>
              {app.resumeVersion?.versionName || 'None linked yet'}
            </Text>
          </View>
          {app.portfolioUrl && (
            <View style={styles.docRow}>
              <Text style={styles.docLabel}>🔗 Portfolio link:</Text>
              <Text style={styles.docValue} numberOfLines={1}>
                {app.portfolioUrl}
              </Text>
            </View>
          )}

          {/* Cover letter draft */}
          <View style={{ marginTop: Spacing.md }}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.docLabel}>📄 Custom Cover Letter</Text>
              {editingCoverLetter ? (
                <TouchableOpacity onPress={handleSaveCoverLetter} disabled={isUpdating}>
                  <Text style={styles.actionLink}>Save</Text>
                </TouchableOpacity>
              ) : (
                <View style={{ flexDirection: 'row', gap: Spacing.md }}>
                  <TouchableOpacity
                    onPress={handleAiDraftCoverLetter}
                    disabled={generateCoverLetterMutation.isPending}
                  >
                    <Text style={styles.actionLink}>✨ AI Draft</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => setEditingCoverLetter(true)}>
                    <Text style={styles.actionLink}>Edit</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>

            {editingCoverLetter ? (
              <TextInput
                style={styles.notesInput}
                multiline
                value={coverLetterText}
                onChangeText={setCoverLetterText}
                placeholder="Draft or copy your cover letter here..."
                placeholderTextColor={Colors.text.muted}
              />
            ) : (
              <Text style={styles.notesText}>
                {app.coverLetterText || 'No cover letter added yet.'}
              </Text>
            )}
          </View>
        </View>

        {/* AI Assistant Copilot widget */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>🧠 AI Readiness Assistant</Text>
            <TouchableOpacity onPress={handleRunAiAnalysis} disabled={analyzeMutation.isPending}>
              <Text style={styles.actionLink}>
                {analyzeMutation.isPending ? 'Running...' : '🔄 Run Analysis'}
              </Text>
            </TouchableOpacity>
          </View>

          {aiAnalysis ? (
            <View style={styles.aiResultBox}>
              <Text style={styles.aiSubTitle}>Strengths Alignment</Text>
              {aiAnalysis.strengths.map((str: string, i: number) => (
                <Text key={i} style={styles.aiBullet}>
                  ✅ {str}
                </Text>
              ))}
              {aiAnalysis.potentialWeaknesses?.length > 0 && (
                <>
                  <Text style={[styles.aiSubTitle, { marginTop: Spacing.md }]}>
                    Missing Requirements / Gaps
                  </Text>
                  {aiAnalysis.potentialWeaknesses.map((weak: string, i: number) => (
                    <Text key={i} style={styles.aiBullet}>
                      ⚠️ {weak}
                    </Text>
                  ))}
                </>
              )}
              {aiAnalysis.resumeAlignment && (
                <>
                  <Text style={[styles.aiSubTitle, { marginTop: Spacing.md }]}>
                    Alignment Summary
                  </Text>
                  <Text style={styles.aiText}>{aiAnalysis.resumeAlignment}</Text>
                </>
              )}
            </View>
          ) : (
            <Text style={styles.notesText}>
              Run readiness check to review skills alignment and missing gaps.
            </Text>
          )}
        </View>

        {/* Follow up custom draft email generator */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>✉️ AI Follow-Up Generator</Text>
            <TouchableOpacity onPress={handleAiGetFollowUp} disabled={followUpMutation.isPending}>
              <Text style={styles.actionLink}>
                {followUpMutation.isPending ? 'Drafting...' : '✨ Generate Draft'}
              </Text>
            </TouchableOpacity>
          </View>

          {followUpDraft && (
            <View style={styles.aiResultBox}>
              <Text style={styles.aiSubTitle}>Subject:</Text>
              <Text style={styles.aiText}>{followUpDraft.subject}</Text>
              <Text style={[styles.aiSubTitle, { marginTop: Spacing.sm }]}>Body:</Text>
              <Text style={styles.aiText}>{followUpDraft.body}</Text>
              <TouchableOpacity style={styles.copyBtn} onPress={copyFollowUpToClipboard}>
                <Text style={styles.copyBtnText}>Copy Draft to Clipboard</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Connected Modules: Interviews, Assessments & Offers */}
        {app.interviews && app.interviews.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🎯 Scheduled Interviews</Text>
            {app.interviews.map((interview: any) => (
              <View key={interview.id} style={styles.linkedBox}>
                <Text style={styles.linkedTitle}>{interview.title}</Text>
                <Text style={styles.linkedDate}>📅 {formatDate(interview.scheduledStart)}</Text>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() =>
                    navigation.navigate('MockInterviewPrep', { interviewId: interview.id })
                  }
                >
                  <Text style={styles.actionButtonText}>Start Mock Interview Prep</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        {app.assessments && app.assessments.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>✏️ Technical Assessments</Text>
            {app.assessments.map((assignment: any) => (
              <View key={assignment.id} style={styles.linkedBox}>
                <Text style={styles.linkedTitle}>{assignment.assessment.title}</Text>
                <Text style={styles.linkedDate}>Status: {assignment.status}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Personal Notes */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Personal Notes</Text>
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
              placeholder="Add your preparation points or details..."
              placeholderTextColor={Colors.text.muted}
            />
          ) : (
            <Text style={styles.notesText}>{app.notes || 'No personal notes added yet.'}</Text>
          )}
        </View>

        {/* Timeline events history */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Timeline logs</Text>
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

        <View style={{ height: 60 }} />
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
  deleteBtn: {
    fontSize: Typography.fontSize.md,
    color: Colors.error,
  },
  headerTitle: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text.primary,
  },
  content: {
    padding: Spacing.lg,
  },
  section: {
    backgroundColor: Colors.background.secondary,
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border.subtle,
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
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  badge: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 4,
    borderRadius: BorderRadius.md,
  },
  badgeText: {
    color: Colors.brand.purple,
    fontWeight: Typography.fontWeight.bold,
    fontSize: Typography.fontSize.xs,
  },
  appliedText: {
    fontSize: Typography.fontSize.xs,
    color: Colors.text.muted,
    marginLeft: 'auto',
  },
  sectionTitle: {
    fontSize: Typography.fontSize.md,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text.primary,
    marginBottom: Spacing.md,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  actionLink: {
    color: Colors.brand.purpleLight,
    fontWeight: Typography.fontWeight.bold,
    fontSize: Typography.fontSize.sm,
  },
  progressTracker: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
  progressStep: {
    alignItems: 'center',
    flex: 1,
  },
  progressDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.border.subtle,
    marginBottom: 4,
  },
  progressDotActive: {
    backgroundColor: Colors.success,
  },
  progressLabel: {
    fontSize: 8,
    color: Colors.text.muted,
    fontWeight: Typography.fontWeight.bold,
    textTransform: 'uppercase',
  },
  progressLabelActive: {
    color: Colors.text.primary,
  },
  scoreRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.lg,
    gap: Spacing.md,
  },
  scoreCard: {
    flex: 1,
    backgroundColor: Colors.background.secondary,
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border.subtle,
  },
  scoreTitle: {
    fontSize: Typography.fontSize.xs,
    color: Colors.text.secondary,
    fontWeight: Typography.fontWeight.bold,
    marginBottom: Spacing.sm,
  },
  circleContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 3,
    justifyContent: 'center',
    alignItems: 'center',
  },
  circleValue: {
    fontSize: Typography.fontSize.md,
    fontWeight: Typography.fontWeight.bold,
  },
  statusChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: Colors.border.subtle,
    backgroundColor: Colors.background.primary,
  },
  statusChipActive: {
    backgroundColor: Colors.brand.purple,
    borderColor: Colors.brand.purple,
  },
  statusChipText: {
    color: Colors.text.secondary,
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.bold,
  },
  statusChipTextActive: {
    color: Colors.text.inverse,
  },
  docRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.subtle,
  },
  docLabel: {
    fontSize: Typography.fontSize.sm,
    color: Colors.text.secondary,
    fontWeight: Typography.fontWeight.semibold,
  },
  docValue: {
    fontSize: Typography.fontSize.sm,
    color: Colors.text.primary,
    fontWeight: Typography.fontWeight.bold,
    maxWidth: '60%',
  },
  notesText: {
    color: Colors.text.secondary,
    fontSize: Typography.fontSize.sm,
    lineHeight: 22,
  },
  notesInput: {
    backgroundColor: Colors.background.primary,
    color: Colors.text.primary,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    minHeight: 120,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: Colors.brand.purpleLight,
  },
  aiResultBox: {
    backgroundColor: Colors.background.primary,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border.subtle,
    marginTop: Spacing.xs,
  },
  aiSubTitle: {
    fontSize: Typography.fontSize.xs,
    color: Colors.text.muted,
    fontWeight: Typography.fontWeight.bold,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  aiBullet: {
    fontSize: Typography.fontSize.sm,
    color: Colors.text.secondary,
    marginVertical: 2,
    lineHeight: 20,
  },
  aiText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.text.primary,
    lineHeight: 20,
    marginBottom: Spacing.sm,
  },
  copyBtn: {
    backgroundColor: Colors.brand.purple + '22',
    padding: Spacing.sm,
    borderRadius: BorderRadius.sm,
    alignItems: 'center',
    marginTop: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.brand.purple + '44',
  },
  copyBtnText: {
    fontSize: Typography.fontSize.xs,
    color: Colors.brand.purpleLight,
    fontWeight: Typography.fontWeight.bold,
  },
  linkedBox: {
    backgroundColor: Colors.background.primary,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border.subtle,
    marginBottom: Spacing.sm,
  },
  linkedTitle: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text.primary,
    marginBottom: 2,
  },
  linkedDate: {
    fontSize: Typography.fontSize.xs,
    color: Colors.text.muted,
    marginBottom: Spacing.sm,
  },
  actionButton: {
    backgroundColor: Colors.brand.purple,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
    alignItems: 'center',
  },
  actionButtonText: {
    color: Colors.text.inverse,
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.bold,
  },
  timelineEvent: {
    flexDirection: 'row',
    marginBottom: Spacing.md,
  },
  timelineDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.brand.purple,
    marginTop: 4,
    zIndex: 2,
  },
  timelineLine: {
    position: 'absolute',
    left: 4,
    top: 14,
    bottom: -Spacing.md,
    width: 2,
    backgroundColor: Colors.border.subtle,
    zIndex: 1,
  },
  timelineContent: {
    marginLeft: Spacing.md,
    flex: 1,
  },
  timelineDate: {
    fontSize: Typography.fontSize.xs,
    color: Colors.text.muted,
    marginBottom: 2,
  },
  timelineStatus: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text.primary,
  },
  timelineNote: {
    fontSize: Typography.fontSize.xs,
    color: Colors.text.secondary,
    marginTop: 4,
  },
});
