import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
} from 'react-native';

interface FaqItem {
  question: string;
  answer: string;
}

export const SupportCenterScreen: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);
  const [ticketSubject, setTicketSubject] = useState('');
  const [ticketCategory, setTicketCategory] = useState('TECHNICAL');
  const [ticketDescription, setTicketDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const faqs: FaqItem[] = [
    {
      question: 'Does InternTracker AI guarantee an internship offer?',
      answer:
        'No. InternTracker AI provides career intelligence, match scoring, and resume optimization to maximize your interview chances, but hiring decisions are made independently by employers.',
    },
    {
      question: 'How do I download an archive of my career data?',
      answer:
        'Go to Settings -> Privacy & Data Control and click "Request Data Export". Your comprehensive career profile and application history will be compiled into a secure JSON archive.',
    },
    {
      question: 'Can I cancel my PRO subscription anytime?',
      answer:
        'Yes. You can cancel your subscription anytime with zero penalty. Your PRO benefits will remain active until the end of your prepaid period without deleting any candidate data.',
    },
    {
      question: 'How do I report a security concern or bug?',
      answer:
        'Use the ticket creation form below and select "SECURITY_REPORT" as the category for high-priority encrypted handling by our engineering team.',
    },
  ];

  const filteredFaqs = faqs.filter(
    (f) =>
      f.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.answer.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const handleCreateTicket = () => {
    if (!ticketSubject || !ticketDescription) {
      Alert.alert('Missing Fields', 'Please enter both a subject and description.');
      return;
    }

    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      setTicketSubject('');
      setTicketDescription('');
      Alert.alert(
        'Ticket Created',
        'Your support request has been submitted to our support engineering team (Ticket ID: TICK-202608-8421).',
      );
    }, 1000);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.headerTitle}>Help & Support Center</Text>
      <Text style={styles.headerSubtitle}>
        Browse self-service guides, search common questions, or submit a support ticket.
      </Text>

      {/* FAQ Search */}
      <TextInput
        style={styles.searchInput}
        placeholder="Search answers (e.g. export, cancel, AI accuracy)..."
        value={searchQuery}
        onChangeText={setSearchQuery}
      />

      {/* FAQ List */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Frequently Asked Questions</Text>
        {filteredFaqs.map((faq, idx) => (
          <TouchableOpacity
            key={idx}
            style={styles.faqCard}
            onPress={() => setExpandedFaq(expandedFaq === idx ? null : idx)}
          >
            <View style={styles.faqHeader}>
              <Text style={styles.faqQuestion}>{faq.question}</Text>
              <Text style={styles.faqIcon}>{expandedFaq === idx ? '−' : '+'}</Text>
            </View>
            {expandedFaq === idx && <Text style={styles.faqAnswer}>{faq.answer}</Text>}
          </TouchableOpacity>
        ))}
      </View>

      {/* Create Support Ticket Form */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>📩 Contact Support Team</Text>

        <Text style={styles.label}>Category</Text>
        <View style={styles.categoryRow}>
          {['TECHNICAL', 'BILLING', 'AI_QUALITY', 'SECURITY_REPORT'].map((cat) => (
            <TouchableOpacity
              key={cat}
              style={[styles.categoryChip, ticketCategory === cat && styles.categoryChipActive]}
              onPress={() => setTicketCategory(cat)}
            >
              <Text
                style={[
                  styles.categoryChipText,
                  ticketCategory === cat && styles.categoryChipTextActive,
                ]}
              >
                {cat.replace('_', ' ')}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>Subject</Text>
        <TextInput
          style={styles.input}
          placeholder="Brief summary of the issue..."
          value={ticketSubject}
          onChangeText={setTicketSubject}
        />

        <Text style={styles.label}>Description</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Detailed description of what occurred..."
          multiline
          numberOfLines={4}
          value={ticketDescription}
          onChangeText={setTicketDescription}
        />

        <TouchableOpacity
          style={styles.primaryButton}
          onPress={handleCreateTicket}
          disabled={isSubmitting}
        >
          <Text style={styles.buttonText}>
            {isSubmitting ? 'Submitting...' : 'Submit Support Ticket'}
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  content: {
    padding: 16,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#64748B',
    marginBottom: 16,
    lineHeight: 18,
  },
  searchInput: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 13,
    marginBottom: 18,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 10,
  },
  faqCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  faqHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  faqQuestion: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E293B',
    flex: 1,
    paddingRight: 10,
  },
  faqIcon: {
    fontSize: 18,
    fontWeight: '700',
    color: '#246BFE',
  },
  faqAnswer: {
    fontSize: 12,
    color: '#475569',
    marginTop: 8,
    lineHeight: 18,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 14,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
    marginBottom: 6,
    marginTop: 10,
  },
  categoryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  categoryChip: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  categoryChipActive: {
    backgroundColor: '#246BFE',
    borderColor: '#246BFE',
  },
  categoryChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
  },
  categoryChipTextActive: {
    color: '#FFFFFF',
  },
  input: {
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
  },
  textArea: {
    height: 90,
    textAlignVertical: 'top',
  },
  primaryButton: {
    backgroundColor: '#246BFE',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16,
  },
  buttonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
});
