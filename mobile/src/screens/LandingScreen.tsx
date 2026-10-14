import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import { useAssessmentStore } from '../store/useAssessmentStore';
import { COLORS, RADIUS, SPACING, TYPOGRAPHY } from '../constants/theme';
import { Button } from '../components/Button';
import { Card } from '../components/Card';

type LandingScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'Landing'
>;

interface LandingScreenProps {
  navigation: LandingScreenNavigationProp;
}

export const LandingScreen: React.FC<LandingScreenProps> = ({ navigation }) => {
  const { profiles, activeProfileId } = useAssessmentStore();
  const activeProfile = profiles.find((p) => p.id === activeProfileId) || profiles[0];

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Branding */}
        <View style={styles.heroSection}>
          <View style={styles.logoBadge}>
            <Text style={styles.logoIcon}>⚡</Text>
          </View>
          <Text style={styles.heroTitle}>Gemini Assessment</Text>
          <Text style={styles.heroSubtitle}>
            AI-Powered Test Studio & Precision Evaluation Engine
          </Text>
        </View>

        {/* Active Profile Pill */}
        {activeProfile && (
          <TouchableOpacity
            style={styles.profilePill}
            onPress={() => navigation.navigate('Profile')}
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel={`Active profile: ${activeProfile.name}. Tap to change profile.`}
          >
            <Text style={styles.profileAvatar}>{activeProfile.avatar}</Text>
            <View style={styles.profileInfo}>
              <Text style={styles.profileLabel}>ACTIVE PROFILE</Text>
              <Text style={styles.profileName}>{activeProfile.name}</Text>
            </View>
            <Text style={styles.profileChevron}>Switch ❯</Text>
          </TouchableOpacity>
        )}

        {/* Feature Cards */}
        <View style={styles.featuresList}>
          <Card style={styles.featureCard}>
            <View style={styles.featureIconContainer}>
              <Text style={styles.featureIcon}>📄</Text>
            </View>
            <View style={styles.featureContent}>
              <Text style={styles.featureTitle}>PDF Assessment Ingestion</Text>
              <Text style={styles.featureDesc}>
                Upload question papers, study guides, or answer keys. Gemini securely
                converts them into structured interactive tests.
              </Text>
            </View>
          </Card>

          <Card style={styles.featureCard}>
            <View style={styles.featureIconContainer}>
              <Text style={styles.featureIcon}>⏱</Text>
            </View>
            <View style={styles.featureContent}>
              <Text style={styles.featureTitle}>Timed Question Pacing</Text>
              <Text style={styles.featureDesc}>
                Take exams one question at a time with dual timer telemetry tracking
                overall duration and seconds per question.
              </Text>
            </View>
          </Card>

          <Card style={styles.featureCard}>
            <View style={styles.featureIconContainer}>
              <Text style={styles.featureIcon}>🔍</Text>
            </View>
            <View style={styles.featureContent}>
              <Text style={styles.featureTitle}>In-Depth Diagnostics</Text>
              <Text style={styles.featureDesc}>
                Review correct answers, explanations, and time bottlenecks only after
                submitting your test.
              </Text>
            </View>
          </Card>
        </View>

        {/* Call to Actions */}
        <View style={styles.ctaContainer}>
          <Button
            title="Go to Assessment Library"
            variant="primary"
            size="lg"
            onPress={() => navigation.navigate('Library')}
            accessibilityHint="Navigates to the assessment library"
          />
          <Button
            title="+ Create New Assessment"
            variant="secondary"
            size="md"
            onPress={() => navigation.navigate('CreateChoice')}
            accessibilityHint="Create assessment manually or via PDF"
          />
          <View style={{ flexDirection: 'row', gap: SPACING.sm }}>
            <Button
              title="Profiles"
              variant="ghost"
              size="sm"
              onPress={() => navigation.navigate('Profile')}
              style={{ flex: 1 }}
            />
            <Button
              title="Admin Portal"
              variant="ghost"
              size="sm"
              onPress={() => navigation.navigate('AdminPortal')}
              style={{ flex: 1 }}
            />
          </View>
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
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.xl,
    paddingBottom: SPACING.xxl,
  },
  heroSection: {
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  logoBadge: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: COLORS.primaryDark,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.md,
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  logoIcon: {
    fontSize: 34,
  },
  heroTitle: {
    ...TYPOGRAPHY.titleLarge,
    color: COLORS.text,
    textAlign: 'center',
  },
  heroSubtitle: {
    ...TYPOGRAPHY.bodyMedium,
    color: COLORS.textMuted,
    textAlign: 'center',
    marginTop: SPACING.xs,
    maxWidth: 320,
  },
  profilePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceElevated,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.xl,
    borderWidth: 1,
    borderColor: COLORS.borderHighlight,
  },
  profileAvatar: {
    fontSize: 32,
    marginRight: SPACING.md,
  },
  profileInfo: {
    flex: 1,
  },
  profileLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.primary,
    letterSpacing: 0.6,
  },
  profileName: {
    ...TYPOGRAPHY.titleSmall,
    color: COLORS.text,
  },
  profileChevron: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textMuted,
  },
  featuresList: {
    gap: SPACING.md,
    marginBottom: SPACING.xl,
  },
  featureCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.md,
  },
  featureIconContainer: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.surfaceElevated,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  featureIcon: {
    fontSize: 22,
  },
  featureContent: {
    flex: 1,
  },
  featureTitle: {
    ...TYPOGRAPHY.bodyLarge,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 4,
  },
  featureDesc: {
    ...TYPOGRAPHY.bodyMedium,
    color: COLORS.textMuted,
    lineHeight: 18,
  },
  ctaContainer: {
    gap: SPACING.md,
  },
});
