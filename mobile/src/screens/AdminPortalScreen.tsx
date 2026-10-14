import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TextInput,
  Alert,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import { useAdminStore } from '../store/useAdminStore';
import { useAssessmentStore } from '../store/useAssessmentStore';
import { COLORS, RADIUS, SPACING, TYPOGRAPHY } from '../constants/theme';
import { Header } from '../components/Header';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { DEFAULT_BACKEND_URL } from '../services/api';
import { FeedbackModal, FeedbackModalProps } from '../components/FeedbackModal';

type Props = NativeStackScreenProps<RootStackParamList, 'AdminPortal'>;

export const AdminPortalScreen: React.FC<Props> = ({ navigation }) => {
  const { isLoggedIn, admin, token, isLoading, loginError, login, logout, clearError } =
    useAdminStore();
  const { assessments, fetchLatestPublishedAssessments, isSyncing, queuedAdminActions } =
    useAssessmentStore();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [backendUrl, setBackendUrl] = useState(DEFAULT_BACKEND_URL);
  const [feedbackModal, setFeedbackModal] = useState<FeedbackModalProps>({
    visible: false,
    type: 'info',
    title: '',
    message: '',
  });

  const publishedCount = assessments.filter((a) => a.scope === 'published').length;

  const handleLogin = async () => {
    if (!identifier.trim() || !password.trim()) {
      Alert.alert('Required Fields', 'Please enter both your admin email/username and password.');
      return;
    }

    const success = await login(identifier.trim(), password.trim(), backendUrl.trim());
    if (success) {
      Alert.alert('Admin Authenticated 🔓', 'You are now signed in. You have publishing privileges to MongoDB.');
      fetchLatestPublishedAssessments(backendUrl.trim(), true);
    }
  };

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to exit admin mode?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: () => logout() },
    ]);
  };

  const handleSyncCloud = async () => {
    const res = await fetchLatestPublishedAssessments(backendUrl.trim(), true);
    if (res.error) {
      setFeedbackModal({
        visible: true,
        type: 'error',
        title: 'Sync Failed',
        message: `${res.error}\n\nCould not fetch assessments from MongoDB. Check that the backend server is reachable.`,
        cancelText: 'Dismiss',
        retryText: 'Retry Sync',
        onCancel: () => setFeedbackModal((prev) => ({ ...prev, visible: false })),
        onRetry: () => {
          setFeedbackModal((prev) => ({ ...prev, visible: false }));
          handleSyncCloud();
        },
      });
    } else if (res.count > 0) {
      setFeedbackModal({
        visible: true,
        type: 'success',
        title: 'Assessments Synced ✅',
        message: `Successfully fetched and updated ${res.count} published assessment${res.count === 1 ? '' : 's'} from MongoDB.`,
        confirmText: 'Done',
        onConfirm: () => setFeedbackModal((prev) => ({ ...prev, visible: false })),
      });
    } else {
      setFeedbackModal({
        visible: true,
        type: 'success',
        title: 'Up to Date ✅',
        message: 'Checked MongoDB for published assessments. No new or updated assessments found—you have the latest version.',
        confirmText: 'OK',
        onConfirm: () => setFeedbackModal((prev) => ({ ...prev, visible: false })),
      });
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <Header
        title="Admin Security Portal"
        subtitle={isLoggedIn ? `Authenticated as ${admin?.username}` : 'Restricted administrative access'}
        onBack={() => navigation.goBack()}
      />

      <ScrollView contentContainerStyle={styles.container}>
        {isLoggedIn ? (
          /* Logged In View */
          <View style={styles.loggedInSection}>
            <Card style={styles.adminBadgeCard}>
              <View style={styles.badgeTopRow}>
                <View style={styles.adminAvatarBox}>
                  <Text style={styles.adminAvatarText}>🛡️</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.adminName}>{admin?.username}</Text>
                  <Text style={styles.adminEmail}>{admin?.email}</Text>
                  <View style={styles.rolePill}>
                    <Text style={styles.roleText}>{admin?.role?.toUpperCase()} ACCESS</Text>
                  </View>
                </View>
              </View>

              <View style={styles.metricsRow}>
                <View style={styles.metricItem}>
                  <Text style={styles.metricValue}>{publishedCount}</Text>
                  <Text style={styles.metricLabel}>Published in Cloud</Text>
                </View>
                <View style={styles.metricDivider} />
                <View style={styles.metricItem}>
                  <Text style={[styles.metricValue, { color: COLORS.success }]}>Active</Text>
                  <Text style={styles.metricLabel}>JWT Session</Text>
                </View>
                {queuedAdminActions.length > 0 && (
                  <>
                    <View style={styles.metricDivider} />
                    <View style={styles.metricItem}>
                      <Text style={[styles.metricValue, { color: COLORS.warning }]}>
                        {queuedAdminActions.length}
                      </Text>
                      <Text style={styles.metricLabel}>Queued Offline</Text>
                    </View>
                  </>
                )}
              </View>
            </Card>

            <Text style={styles.sectionHeader}>Administrative Operations</Text>

            <Button
              title="✍️ Author & Publish Manual Assessment"
              variant="primary"
              size="lg"
              onPress={() => navigation.navigate('CreateManual')}
            />

            <Button
              title="📄 Ingest & Publish PDF with Gemini"
              variant="secondary"
              size="lg"
              onPress={() => navigation.navigate('CreateAssessment')}
            />

            <Button
              title={isSyncing ? 'Syncing MongoDB...' : '🔄 Force Sync MongoDB Assessments'}
              variant="outline"
              size="md"
              loading={isSyncing}
              onPress={handleSyncCloud}
            />

            <Button
              title="Sign Out of Admin Mode"
              variant="danger"
              size="md"
              onPress={handleLogout}
              style={{ marginTop: SPACING.md }}
            />
          </View>
        ) : (
          /* Sign In Form */
          <View style={styles.loginSection}>
            <View style={styles.securityBanner}>
              <Text style={styles.securityIcon}>🔐</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.securityTitle}>Server-Enforced Authorization</Text>
                <Text style={styles.securityDesc}>
                  Mobile apps contain no shared admin secret keys. Only verified backend
                  JWT credentials can publish assessments to MongoDB.
                </Text>
              </View>
            </View>

            <Card style={styles.formCard}>
              <Text style={styles.formTitle}>Admin Authentication</Text>

              <Text style={styles.inputLabel}>Admin Email or Username</Text>
              <TextInput
                style={styles.textInput}
                placeholder="e.g. admin@gemini.internal or admin"
                placeholderTextColor={COLORS.textDim}
                value={identifier}
                onChangeText={(t) => {
                  setIdentifier(t);
                  clearError();
                }}
                autoCapitalize="none"
                autoCorrect={false}
              />

              <Text style={styles.inputLabel}>Password</Text>
              <TextInput
                style={styles.textInput}
                placeholder="••••••••••••"
                placeholderTextColor={COLORS.textDim}
                value={password}
                onChangeText={(t) => {
                  setPassword(t);
                  clearError();
                }}
                secureTextEntry
              />

              <Text style={styles.inputLabel}>Backend API Gateway URL</Text>
              <TextInput
                style={styles.textInput}
                value={backendUrl}
                onChangeText={setBackendUrl}
                placeholder="http://localhost:4000"
                placeholderTextColor={COLORS.textDim}
                autoCapitalize="none"
              />

              {loginError && (
                <View style={styles.errorBox}>
                  <Text style={styles.errorText}>⚠️ {loginError}</Text>
                </View>
              )}

              <Button
                title="Sign In with Credentials"
                variant="primary"
                size="lg"
                loading={isLoading}
                onPress={handleLogin}
                style={{ marginTop: SPACING.lg }}
              />
            </Card>

            {/* Quick Developer Guide */}
            <View style={styles.devGuideCard}>
              <Text style={styles.devGuideTitle}>🛠️ Developer Credentials & Provisioning</Text>
              <Text style={styles.devGuideText}>
                • Pre-seeded dev admin: <Text style={{ color: COLORS.text, fontWeight: '700' }}>admin@gemini.internal</Text> / Password: <Text style={{ color: COLORS.text, fontWeight: '700' }}>Admin@123</Text>
              </Text>
              <Text style={styles.devGuideText}>
                • To provision a production admin, call:
                {'\n'}POST /api/admin/setup with header <Text style={{ color: COLORS.accent }}>x-admin-setup-secret</Text>
              </Text>
            </View>
          </View>
        )}
      </ScrollView>

      <FeedbackModal {...feedbackModal} />
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
    paddingBottom: SPACING.xxl,
  },
  loggedInSection: {
    gap: SPACING.md,
  },
  adminBadgeCard: {
    padding: SPACING.lg,
    borderWidth: 1.5,
    borderColor: COLORS.primary,
  },
  badgeTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    marginBottom: SPACING.md,
  },
  adminAvatarBox: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: COLORS.surfaceElevated,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.borderHighlight,
  },
  adminAvatarText: {
    fontSize: 26,
  },
  adminName: {
    ...TYPOGRAPHY.bodyLarge,
    fontWeight: '700',
    color: COLORS.text,
  },
  adminEmail: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  rolePill: {
    backgroundColor: COLORS.primaryDark,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: RADIUS.pill,
    alignSelf: 'flex-start',
    marginTop: 6,
  },
  roleText: {
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.primaryLight,
  },
  metricsRow: {
    flexDirection: 'row',
    backgroundColor: COLORS.surfaceElevated,
    borderRadius: RADIUS.md,
    paddingVertical: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  metricItem: {
    flex: 1,
    alignItems: 'center',
  },
  metricValue: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.text,
  },
  metricLabel: {
    fontSize: 11,
    color: COLORS.textDim,
    marginTop: 2,
  },
  metricDivider: {
    width: 1,
    backgroundColor: COLORS.border,
  },
  sectionHeader: {
    ...TYPOGRAPHY.bodyLarge,
    fontWeight: '700',
    color: COLORS.text,
    marginTop: SPACING.md,
  },
  loginSection: {
    gap: SPACING.lg,
  },
  securityBanner: {
    flexDirection: 'row',
    backgroundColor: COLORS.surfaceElevated,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.borderHighlight,
    gap: SPACING.sm,
    alignItems: 'center',
  },
  securityIcon: {
    fontSize: 24,
  },
  securityTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.primaryLight,
  },
  securityDesc: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 2,
    lineHeight: 16,
  },
  formCard: {
    padding: SPACING.lg,
  },
  formTitle: {
    ...TYPOGRAPHY.titleSmall,
    color: COLORS.text,
    marginBottom: SPACING.md,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textMuted,
    marginBottom: 4,
    marginTop: SPACING.sm,
  },
  textInput: {
    backgroundColor: COLORS.surfaceElevated,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.sm + 2,
    color: COLORS.text,
    fontSize: 14,
  },
  errorBox: {
    backgroundColor: COLORS.dangerLight,
    borderWidth: 1,
    borderColor: COLORS.danger,
    borderRadius: RADIUS.md,
    padding: SPACING.sm + 2,
    marginTop: SPACING.md,
  },
  errorText: {
    color: COLORS.danger,
    fontSize: 12,
    fontWeight: '600',
  },
  devGuideCard: {
    backgroundColor: COLORS.surfaceElevated,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  devGuideTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.accent,
    marginBottom: 6,
  },
  devGuideText: {
    fontSize: 12,
    color: COLORS.textMuted,
    lineHeight: 18,
    marginBottom: 4,
  },
});
