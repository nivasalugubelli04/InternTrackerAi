import React, { Component, ErrorInfo, ReactNode } from 'react';
import { SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const THEME = {
  primary: '#246BFE',
  deep: '#1456D9',
  sky: '#EAF3FF',
  soft: '#F3F7FF',
  white: '#FFFFFF',
  text: '#111111',
  secondary: '#6B7280',
  border: '#E7EAF0',
  error: '#EF4444',
  warning: '#F59E0B',
};

interface Props {
  children: ReactNode;
  fallbackMessage?: string;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('Unhandled UI Exception caught by ErrorBoundary:', error, errorInfo);
  }

  handleReset = (): void => {
    this.setState({ hasError: false, error: null });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <SafeAreaView style={styles.container}>
          <View style={styles.card}>
            <View style={styles.iconContainer}>
              <Text style={styles.icon}>⚠️</Text>
            </View>
            <Text style={styles.title}>Something went wrong</Text>
            <Text style={styles.message}>
              {this.props.fallbackMessage ||
                'An unexpected error occurred while rendering this screen. Your data is safe.'}
            </Text>

            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={styles.primaryButton}
                onPress={this.handleReset}
                accessibilityRole="button"
                accessibilityLabel="Try loading the screen again"
              >
                <Text style={styles.primaryButtonText}>Try Again</Text>
              </TouchableOpacity>
            </View>
          </View>
        </SafeAreaView>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.soft,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  card: {
    backgroundColor: THEME.white,
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: THEME.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: THEME.sky,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  icon: {
    fontSize: 28,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: THEME.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  message: {
    fontSize: 13,
    color: THEME.secondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  buttonRow: {
    width: '100%',
  },
  primaryButton: {
    backgroundColor: THEME.primary,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    minHeight: 44, // Accessible touch target
    justifyContent: 'center',
  },
  primaryButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: THEME.white,
  },
});
