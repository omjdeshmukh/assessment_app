import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  Alert,
  TextInput,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import { COLORS, RADIUS, SPACING, TYPOGRAPHY } from '../constants/theme';
import { Header } from '../components/Header';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { LoadingOverlay } from '../components/LoadingOverlay';
import { uploadPdfForExtraction, DEFAULT_BACKEND_URL } from '../services/api';
import { FeedbackModal, FeedbackModalProps } from '../components/FeedbackModal';

type CreateAssessmentScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'CreateAssessment'
>;

interface CreateAssessmentScreenProps {
  navigation: CreateAssessmentScreenNavigationProp;
}

const SUBJECT_OPTIONS = [
  'Computer Science & AI',
  'Mathematics & Statistics',
  'Biology & Medicine',
  'Physics & Engineering',
  'History & Social Sciences',
  'General Knowledge',
];

export const CreateAssessmentScreen: React.FC<CreateAssessmentScreenProps> = ({
  navigation,
}) => {
  const [selectedFile, setSelectedFile] = useState<{
    uri: string;
    name: string;
    size?: number;
    rawFile?: any;
  } | null>(null);

  const [selectedSubject, setSelectedSubject] = useState(SUBJECT_OPTIONS[0]);
  const [customBackendUrl, setCustomBackendUrl] = useState(DEFAULT_BACKEND_URL);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [feedbackModal, setFeedbackModal] = useState<FeedbackModalProps>({
    visible: false,
    type: 'info',
    title: '',
    message: '',
  });

  const handlePickDocument = async () => {
    try {
      setErrorMessage(null);
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'application/x-pdf'],
        copyToCacheDirectory: true,
      });

      if (result.canceled) {
        return;
      }

      const fileAsset = result.assets && result.assets[0];
      if (fileAsset) {
        // Enforce 15MB limit check on client side as well
        if (fileAsset.size && fileAsset.size > 15 * 1024 * 1024) {
          Alert.alert(
            'File Too Large',
            'Please select a PDF document smaller than 15 MB.'
          );
          return;
        }

        setSelectedFile({
          uri: fileAsset.uri,
          name: fileAsset.name,
          size: fileAsset.size,
          rawFile: (fileAsset as any).file,
        });
      }
    } catch (err: any) {
      console.error('Document picker error:', err);
      Alert.alert('Selection Error', 'Could not open document picker.');
    }
  };

  const handleUploadAndExtract = async () => {
    if (!selectedFile) {
      Alert.alert('No PDF Selected', 'Please select a PDF file first.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    const result = await uploadPdfForExtraction({
      fileUri: selectedFile.uri,
      fileName: selectedFile.name,
      fileSize: selectedFile.size,
      rawFile: selectedFile.rawFile,
      preferredSubject: selectedSubject,
      backendBaseUrl: customBackendUrl.trim() || DEFAULT_BACKEND_URL,
    });

    setIsLoading(false);

    if (!result.success || !result.assessment) {
      const err =
        result.error ||
        'Could not extract questions from this document. Please check the file formatting or backend status.';
      setErrorMessage(err);
      setFeedbackModal({
        visible: true,
        type: 'error',
        title: 'Extraction Error',
        message: `${err}\n\nYou can retry the extraction or choose another PDF document.`,
        cancelText: 'Dismiss',
        retryText: 'Retry Extraction',
        onCancel: () => setFeedbackModal((prev) => ({ ...prev, visible: false })),
        onRetry: () => {
          setFeedbackModal((prev) => ({ ...prev, visible: false }));
          handleUploadAndExtract();
        },
      });
      return;
    }

    // Success! Navigate to Review screen before saving to profile library
    navigation.navigate('ReviewExtraction', {
      extractedData: result.assessment,
      sourceFilename: selectedFile.name,
    });
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <Header
        title="Create from PDF"
        subtitle="Extract questions using Google Gemini"
        onBack={() => navigation.goBack()}
      />

      <ScrollView contentContainerStyle={styles.container}>
        {/* Info Banner */}
        <View style={styles.infoBanner}>
          <Text style={styles.infoIcon}>🔒</Text>
          <View style={styles.infoContent}>
            <Text style={styles.infoTitle}>Secure Backend Processing</Text>
            <Text style={styles.infoDesc}>
              Your PDF is uploaded to our dedicated backend service which securely
              calls Google Gemini with strictly server-held credentials.
            </Text>
          </View>
        </View>

        {/* File Picker Section */}
        <Text style={styles.sectionTitle}>1. Select Question Paper or Exam PDF</Text>
        <Card
          onPress={handlePickDocument}
          highlighted={Boolean(selectedFile)}
          style={styles.pickerCard}
          accessibilityLabel="Select PDF file from device storage"
        >
          {selectedFile ? (
            <View style={styles.fileSelectedContainer}>
              <View style={styles.fileIconBox}>
                <Text style={styles.fileIconText}>PDF</Text>
              </View>
              <View style={styles.fileMeta}>
                <Text style={styles.fileName} numberOfLines={1}>
                  {selectedFile.name}
                </Text>
                <Text style={styles.fileSize}>
                  {selectedFile.size
                    ? `${(selectedFile.size / (1024 * 1024)).toFixed(2)} MB • Ready`
                    : 'Ready to process'}
                </Text>
              </View>
              <Text style={styles.changeFileText}>Change</Text>
            </View>
          ) : (
            <View style={styles.emptyPickerContainer}>
              <Text style={styles.uploadCloudIcon}>📄</Text>
              <Text style={styles.pickerPrompt}>
                Tap to select a PDF assessment file
              </Text>
              <Text style={styles.pickerSubtext}>
                Supports MCQs, tests, problem sets, and exams with answer keys (up to 15MB)
              </Text>
            </View>
          )}
        </Card>

        {/* Subject Category Selection */}
        <Text style={styles.sectionTitle}>2. Target Subject Category</Text>
        <View style={styles.subjectGrid}>
          {SUBJECT_OPTIONS.map((subj) => {
            const isSelected = selectedSubject === subj;
            return (
              <TouchableOpacity
                key={subj}
                onPress={() => setSelectedSubject(subj)}
                style={[
                  styles.subjectChoice,
                  isSelected && styles.subjectChoiceActive,
                ]}
                accessible={true}
                accessibilityRole="button"
                accessibilityLabel={`Category: ${subj}`}
              >
                <Text
                  style={[
                    styles.subjectChoiceText,
                    isSelected && styles.subjectChoiceTextActive,
                  ]}
                >
                  {subj}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Backend Configuration */}
        <Text style={styles.sectionTitle}>3. Backend API Gateway</Text>
        <Card style={styles.backendCard}>
          <Text style={styles.backendLabel}>Backend Endpoint URL:</Text>
          <TextInput
            style={styles.backendInput}
            value={customBackendUrl}
            onChangeText={setCustomBackendUrl}
            placeholder="http://localhost:4000"
            placeholderTextColor={COLORS.textDim}
            autoCapitalize="none"
            autoCorrect={false}
          />
          <Text style={styles.backendHint}>
            Defaults to your local Node server. Change to LAN IP if running on physical device.
          </Text>
        </Card>

        {/* Error message */}
        {errorMessage && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>⚠️ {errorMessage}</Text>
          </View>
        )}

        {/* Action Button */}
        <Button
          title="Extract Questions with Gemini →"
          variant="primary"
          size="lg"
          onPress={handleUploadAndExtract}
          disabled={!selectedFile || isLoading}
          loading={isLoading}
          style={{ marginTop: SPACING.lg }}
          accessibilityHint="Uploads PDF and runs Gemini extraction"
        />
      </ScrollView>

      {/* Progress Overlay */}
      <LoadingOverlay visible={isLoading} />

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
  infoBanner: {
    flexDirection: 'row',
    backgroundColor: COLORS.surfaceElevated,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.borderHighlight,
    gap: SPACING.sm,
  },
  infoIcon: {
    fontSize: 20,
  },
  infoContent: {
    flex: 1,
  },
  infoTitle: {
    ...TYPOGRAPHY.bodyLarge,
    fontWeight: '700',
    color: COLORS.primaryLight,
  },
  infoDesc: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textMuted,
    marginTop: 2,
    lineHeight: 16,
  },
  sectionTitle: {
    ...TYPOGRAPHY.bodyLarge,
    fontWeight: '700',
    color: COLORS.text,
    marginTop: SPACING.md,
    marginBottom: SPACING.sm,
  },
  pickerCard: {
    padding: SPACING.lg,
    alignItems: 'center',
    justifyContent: 'center',
    borderStyle: 'dashed',
    borderWidth: 1.5,
    borderColor: COLORS.primary,
  },
  emptyPickerContainer: {
    alignItems: 'center',
    paddingVertical: SPACING.md,
  },
  uploadCloudIcon: {
    fontSize: 36,
    marginBottom: SPACING.sm,
  },
  pickerPrompt: {
    ...TYPOGRAPHY.bodyLarge,
    fontWeight: '700',
    color: COLORS.text,
    textAlign: 'center',
  },
  pickerSubtext: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textDim,
    textAlign: 'center',
    marginTop: 4,
    maxWidth: 280,
  },
  fileSelectedContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    gap: SPACING.md,
  },
  fileIconBox: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.danger,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fileIconText: {
    color: '#FFF',
    fontWeight: '800',
    fontSize: 12,
  },
  fileMeta: {
    flex: 1,
  },
  fileName: {
    ...TYPOGRAPHY.bodyLarge,
    fontWeight: '700',
    color: COLORS.text,
  },
  fileSize: {
    ...TYPOGRAPHY.caption,
    color: COLORS.success,
    marginTop: 2,
  },
  changeFileText: {
    color: COLORS.primary,
    fontWeight: '700',
    fontSize: 13,
  },
  subjectGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.xs + 4,
    marginBottom: SPACING.md,
  },
  subjectChoice: {
    backgroundColor: COLORS.surfaceElevated,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.pill,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  subjectChoiceActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  subjectChoiceText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textMuted,
  },
  subjectChoiceTextActive: {
    color: COLORS.text,
    fontWeight: '700',
  },
  backendCard: {
    padding: SPACING.md,
  },
  backendLabel: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginBottom: 4,
  },
  backendInput: {
    backgroundColor: COLORS.surfaceElevated,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.sm,
    padding: SPACING.sm,
    color: COLORS.text,
    fontSize: 13,
  },
  backendHint: {
    fontSize: 11,
    color: COLORS.textDim,
    marginTop: 6,
  },
  errorBox: {
    backgroundColor: COLORS.dangerLight,
    borderWidth: 1,
    borderColor: COLORS.danger,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginTop: SPACING.md,
  },
  errorText: {
    color: COLORS.danger,
    fontSize: 13,
    fontWeight: '500',
  },
});
