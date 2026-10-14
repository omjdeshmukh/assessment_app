import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import { COLORS, RADIUS, SPACING, TYPOGRAPHY } from '../constants/theme';
import { Header } from '../components/Header';
import { Card } from '../components/Card';
import { useAdminStore } from '../store/useAdminStore';

type Props = NativeStackScreenProps<RootStackParamList, 'CreateChoice'>;

export const CreateChoiceScreen: React.FC<Props> = ({ navigation }) => {
  const { isLoggedIn, admin } = useAdminStore();

  return (
    <SafeAreaView style={styles.safeArea}>
      <Header
        title="Create Assessment"
        subtitle="Choose your creation method"
        onBack={() => navigation.goBack()}
      />

      <ScrollView contentContainerStyle={styles.container}>
        {/* Admin notice banner if admin is logged in */}
        {isLoggedIn && (
          <View style={styles.adminBanner}>
            <Text style={styles.adminIcon}>🔑</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.adminTitle}>Admin Publishing Mode Active</Text>
              <Text style={styles.adminSubtitle}>
                Logged in as {admin?.username}. You can publish assessments to the shared
                MongoDB database or save locally.
              </Text>
            </View>
          </View>
        )}

        <Text style={styles.promptTitle}>How would you like to create your assessment?</Text>

        {/* Choice 1: Manual */}
        <Card
          onPress={() => navigation.navigate('CreateManual')}
          style={styles.choiceCard}
          accessibilityLabel="Create assessment manually by entering questions and options"
        >
          <View style={styles.iconCircle}>
            <Text style={styles.iconText}>✍️</Text>
          </View>
          <View style={styles.choiceContent}>
            <View style={styles.titleRow}>
              <Text style={styles.choiceTitle}>Create Manually</Text>
              <Text style={styles.arrowText}>❯</Text>
            </View>
            <Text style={styles.choiceDesc}>
              Author your own questions, enter 4 options, designate correct answers,
              and write pedagogical explanations directly in the app.
            </Text>
            <View style={styles.badgeRow}>
              <View style={styles.featureBadge}>
                <Text style={styles.featureBadgeText}>Custom Questions</Text>
              </View>
              <View style={styles.featureBadge}>
                <Text style={styles.featureBadgeText}>Instant Preview</Text>
              </View>
            </View>
          </View>
        </Card>

        {/* Choice 2: PDF with Gemini */}
        <Card
          onPress={() => navigation.navigate('CreateAssessment')}
          style={styles.choiceCard}
          accessibilityLabel="Create assessment from PDF using Google Gemini"
        >
          <View style={[styles.iconCircle, { backgroundColor: COLORS.secondary }]}>
            <Text style={styles.iconText}>📄</Text>
          </View>
          <View style={styles.choiceContent}>
            <View style={styles.titleRow}>
              <Text style={styles.choiceTitle}>Create with PDF</Text>
              <Text style={styles.arrowText}>❯</Text>
            </View>
            <Text style={styles.choiceDesc}>
              Upload an exam question paper, slide deck, or problem set. Google
              Gemini extracts all stems, options, and answer keys automatically.
            </Text>
            <View style={styles.badgeRow}>
              <View style={[styles.featureBadge, { backgroundColor: 'rgba(139, 92, 246, 0.2)' }]}>
                <Text style={[styles.featureBadgeText, { color: COLORS.secondary }]}>
                  Google Gemini AI
                </Text>
              </View>
              <View style={styles.featureBadge}>
                <Text style={styles.featureBadgeText}>Full Review & Edit</Text>
              </View>
            </View>
          </View>
        </Card>

        {/* Storage Architecture Callout */}
        <View style={styles.storageCallout}>
          <Text style={styles.calloutTitle}>🔒 Device Storage & Privacy</Text>
          <Text style={styles.calloutText}>
            User-created assessments, student profiles, and test attempts are stored
            securely on your device and are never shared without admin authorization.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  container: {
    padding: SPACING.lg,
    gap: SPACING.lg,
  },
  adminBanner: {
    flexDirection: 'row',
    backgroundColor: COLORS.surfaceElevated,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.primary,
    gap: SPACING.sm,
    alignItems: 'center',
  },
  adminIcon: {
    fontSize: 22,
  },
  adminTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.primaryLight,
  },
  adminSubtitle: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  promptTitle: {
    ...TYPOGRAPHY.titleSmall,
    color: COLORS.text,
  },
  choiceCard: {
    flexDirection: 'row',
    padding: SPACING.lg,
    gap: SPACING.md,
    alignItems: 'flex-start',
  },
  iconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconText: {
    fontSize: 26,
  },
  choiceContent: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  choiceTitle: {
    ...TYPOGRAPHY.bodyLarge,
    fontWeight: '700',
    color: COLORS.text,
  },
  arrowText: {
    fontSize: 16,
    color: COLORS.textDim,
  },
  choiceDesc: {
    ...TYPOGRAPHY.bodyMedium,
    color: COLORS.textMuted,
    lineHeight: 18,
    marginBottom: SPACING.sm,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: SPACING.xs + 2,
  },
  featureBadge: {
    backgroundColor: COLORS.surfaceElevated,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: RADIUS.pill,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  featureBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.textMuted,
  },
  storageCallout: {
    backgroundColor: COLORS.surfaceElevated,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  calloutTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.accent,
    marginBottom: 4,
  },
  calloutText: {
    fontSize: 12,
    color: COLORS.textDim,
    lineHeight: 16,
  },
});
