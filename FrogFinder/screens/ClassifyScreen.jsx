import { useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRecorder } from '../hooks/useRecorder';
import { useClassifier } from '../hooks/useClassifier';
import { filePickerService } from '../services/filePickerService';
import { Theme } from '../config/Theme';

// ─── Small reusable pieces ────────────────────────────────────────────────────

const SectionLabel = ({ text }) => (
  <Text style={styles.sectionLabel}>{text}</Text>
);

const ConfidenceBar = ({ confidence, alt }) => (
  <View style={styles.barTrack}>
    <View style={[styles.barFill, alt && styles.barFillAlt, { width: `${confidence * 100}%` }]} />
  </View>
);

const DetailRow = ({ label, value, last }) => (
  <View style={[styles.detailRow, !last && styles.detailRowBorder]}>
    <Text style={styles.detailLabel}>{label}</Text>
    <Text style={styles.detailValue}>{value}</Text>
  </View>
);

// ─── Cards ────────────────────────────────────────────────────────────────────

const ResultsCard = ({ classification, loading }) => {
  const [showAlternatives, setShowAlternatives] = useState(false);
  const { topMatch, alternatives, details } = classification ?? {};

  const timestamp = details
    ? `${details.recordingLength}s · ${new Date(details.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
    : 'just now';

  return (
    <View style={styles.card}>

      <Text style={styles.cardTitle}>Recording analysed</Text>
      <Text style={styles.cardSubtitle}>{timestamp}</Text>
      <View style={styles.divider} />

      {loading ? (
        <ActivityIndicator color={Theme.colors.primary} size="large" style={{ marginVertical: 24 }} />
      ) : (
        <>
          {/* Top match */}
          <View style={styles.matchRow}>
            <View style={styles.frogImage} />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.matchName}>{topMatch.name}</Text>
              <Text style={styles.matchScientific}>{topMatch.scientificName}</Text>
            </View>
            <Text style={styles.matchConfidence}>{(topMatch.confidence * 100).toFixed(0)}%</Text>
          </View>
          <ConfidenceBar confidence={topMatch.confidence} />

          {/* Alternatives */}
          {showAlternatives && alternatives.map((alt, i) => (
            <View key={i} style={{ marginTop: 16 }}>
              <View style={styles.matchRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.altName}>{alt.name}</Text>
                  <Text style={styles.matchScientific}>{alt.scientificName}</Text>
                </View>
                <Text style={styles.altConfidence}>{(alt.confidence * 100).toFixed(0)}%</Text>
              </View>
              <ConfidenceBar confidence={alt.confidence} alt />
            </View>
          ))}

          <TouchableOpacity onPress={() => setShowAlternatives(v => !v)} style={styles.toggleBtn}>
            <Text style={styles.toggleText}>
              {showAlternatives ? 'Hide alternatives ∧' : 'Show alternatives ∨'}
            </Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  );
};

const SpeciesDetailsCard = ({ topMatch }) => (
  <View style={styles.card}>
    <DetailRow label="Description"  value={topMatch.description} />
    <DetailRow label="Habitat"      value={topMatch.habitat} />
    <DetailRow label="Size"         value={topMatch.size} />
    <DetailRow label="Call"         value={topMatch.callDescription} />
    <DetailRow label="Conservation" value={topMatch.conservationStatus} last />
  </View>
);

const BottomBar = ({ isRecording, isStopping, onRecord, onUpload }) => (
  <SafeAreaView edges={['bottom']} style={styles.bar}>
    <TouchableOpacity style={styles.sideBtn} onPress={onUpload}>
      <Text style={styles.sideIcon}>↑</Text>
      <Text style={styles.sideLabel}>UPLOAD</Text>
    </TouchableOpacity>

    <TouchableOpacity
      style={[styles.recordBtn, isRecording && styles.recordBtnActive, isStopping && styles.recordBtnDisabled]}
      disabled={isStopping}
      onPress={onRecord}
    >
      <Text style={styles.recordLabel}>{isRecording ? 'Stop' : 'Record'}</Text>
    </TouchableOpacity>

    <TouchableOpacity style={styles.sideBtn}>
      <Text style={styles.sideIcon}>▶</Text>
      <Text style={styles.sideLabel}>PLAY</Text>
    </TouchableOpacity>
  </SafeAreaView>
);

// ─── Screen ───────────────────────────────────────────────────────────────────

export const ClassifyScreen = () => {
  const { isRecording, startRecording, stopRecording } = useRecorder();
  const { classify, classification, loading } = useClassifier();
  const [isStopping, setIsStopping] = useState(false);

  const handleRecord = async () => {
    if (isRecording) {
      setIsStopping(true);
      const uri = await stopRecording();
      await classify(uri);
      setIsStopping(false);
    } else {
      await startRecording();
    }
  };

  const handleUpload = async () => {
    const uri = await filePickerService.pickAudioFile();
    if (uri) await classify(uri);
  };

  const hasResults = classification || loading;

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>

        {hasResults && (
          <>
            <SectionLabel text="LATEST RECORDING" />
            <ResultsCard classification={classification} loading={loading} />
          </>
        )}

        {classification && !loading && (
          <>
            <SectionLabel text="ABOUT THIS SPECIES" />
            <SpeciesDetailsCard topMatch={classification.topMatch} />
          </>
        )}

      </ScrollView>

      <BottomBar
        isRecording={isRecording}
        isStopping={isStopping}
        onRecord={handleRecord}
        onUpload={handleUpload}
      />
    </View>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = {
  screen: {
    flex: 1,
    backgroundColor: Theme.colors.background,
  },
  content: {
    flexGrow: 1,
    padding: Theme.spacing.md,
    paddingBottom: 120,
  },
  sectionLabel: {
    textAlign: 'center',
    letterSpacing: 3,
    fontSize: 11,
    color: Theme.colors.textSecondary,
    marginBottom: Theme.spacing.sm,
    marginTop: Theme.spacing.xl,
  },
  card: {
    backgroundColor: Theme.colors.card,
    borderRadius: 20,
    padding: Theme.spacing.md,
  },
  cardTitle: {
    color: Theme.colors.text,
    fontWeight: '600',
    fontSize: 14,
  },
  cardSubtitle: {
    color: Theme.colors.textSecondary,
    fontSize: 12,
    marginBottom: Theme.spacing.md,
  },
  divider: {
    height: 1,
    backgroundColor: Theme.colors.border,
    marginBottom: Theme.spacing.md,
  },
  matchRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  frogImage: {
    width: 56,
    height: 56,
    borderRadius: 8,
    backgroundColor: Theme.colors.surface,
  },
  matchName: {
    color: Theme.colors.text,
    fontWeight: 'bold',
    fontSize: 16,
  },
  matchScientific: {
    color: Theme.colors.textSecondary,
    fontSize: 13,
    marginTop: 2,
  },
  matchConfidence: {
    color: Theme.colors.primary,
    fontWeight: 'bold',
    fontSize: 18,
  },
  altName: {
    color: Theme.colors.text,
    fontWeight: '600',
    fontSize: 15,
  },
  altConfidence: {
    color: Theme.colors.secondary,
    fontWeight: 'bold',
    fontSize: 16,
  },
  barTrack: {
    height: 6,
    backgroundColor: Theme.colors.border,
    borderRadius: 3,
    marginTop: 10,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    backgroundColor: Theme.colors.primary,
    borderRadius: 3,
  },
  barFillAlt: {
    backgroundColor: Theme.colors.secondary,
  },
  toggleBtn: {
    alignItems: 'center',
    marginTop: Theme.spacing.md,
  },
  toggleText: {
    color: Theme.colors.textSecondary,
    fontSize: 13,
  },
  detailRow: {
    paddingVertical: Theme.spacing.sm,
  },
  detailRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.border,
  },
  detailLabel: {
    color: Theme.colors.textSecondary,
    fontSize: 11,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  detailValue: {
    color: Theme.colors.text,
    fontSize: 14,
  },
  bar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Theme.spacing.lg,
    paddingTop: Theme.spacing.md,
    backgroundColor: Theme.colors.background,
    borderTopWidth: 1,
    borderTopColor: Theme.colors.border,
  },
  sideBtn: {
    alignItems: 'center',
    width: 60,
  },
  sideIcon: {
    color: Theme.colors.primary,
    fontSize: 20,
  },
  sideLabel: {
    color: Theme.colors.textSecondary,
    fontSize: 10,
    letterSpacing: 1,
    marginTop: 2,
  },
  recordBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Theme.colors.text,
    paddingVertical: 16,
    paddingHorizontal: 40,
    borderRadius: Theme.borderRadius.full,
  },
  recordBtnActive: {
    backgroundColor: Theme.colors.error,
  },
  recordBtnDisabled: {
    opacity: 0.5,
  },
  recordLabel: {
    color: Theme.colors.background,
    fontWeight: 'bold',
    fontSize: 16,
  },
};
