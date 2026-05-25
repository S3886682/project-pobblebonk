import { useState, useEffect, useRef } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  Animated, Image, StyleSheet, ImageBackground,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { createAudioPlayer } from 'expo-audio';
import { useRecorder } from '../hooks/useRecorder';
import { useClassifier } from '../hooks/useClassifier';
import { filePickerService } from '../services/filePickerService';
import { frogImages } from '../assets/images/frogImages';
import speciesData from '../assets/data/speciesDetails.json';

const DARK      = '#1C1C1E';
const GREEN     = '#4A7C59';
const BAR_COUNT = 46;
const SECTION_WINDOWS = 15;

const normalize = s => (s ?? '').toLowerCase().replace(/[^a-z0-9]/g, '').trim();

// Bar geometry — keep in sync with waveStyles
const BAR_CONT_H = 50;
const BAR_MIN_H  = 3;
const BAR_MAX_H  = 46;

// ── Waveform loading card ─────────────────────────────────────────────────────
// Bar animations use scaleY + translateY with useNativeDriver:true so they run
// on the native thread and stay smooth even while the JS thread is busy with
// feature extraction.
function WaveformLoader({ progress }) {
  const anims = useRef(
    Array.from({ length: BAR_COUNT }, (_, i) => new Animated.Value(0.08 + (i % 9) * 0.04))
  ).current;

  const progressAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const timeouts = [];
    const loops    = [];

    anims.forEach((anim, i) => {
      const hi  = 0.60 + (i % 8) * 0.045;
      const lo  = 0.05 + (i % 6) * 0.025;
      const dur = 370 + (i % 7) * 85;

      const t = setTimeout(() => {
        const loop = Animated.loop(
          Animated.sequence([
            Animated.timing(anim, { toValue: hi, duration: dur, useNativeDriver: true }),
            Animated.timing(anim, { toValue: lo, duration: dur, useNativeDriver: true }),
          ])
        );
        loops.push(loop);
        loop.start();
      }, i * 26);

      timeouts.push(t);
    });

    return () => {
      timeouts.forEach(clearTimeout);
      loops.forEach(l => l.stop());
    };
  }, []);

  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: progress ?? 0,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [progress]);

  const pct = Math.round((progress ?? 0) * 100);
  const barWidth = progressAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });

  return (
    <View style={waveStyles.card}>
      <View style={waveStyles.header}>
        <Text style={waveStyles.label}>Analysing audio</Text>
        <Text style={waveStyles.pct}>{pct}%</Text>
      </View>

      <View style={waveStyles.barsRow}>
        {anims.map((anim, i) => (
          <Animated.View
            key={i}
            style={[
              waveStyles.bar,
              {
                transform: [
                  {
                    // Keep the bar's bottom edge fixed while it grows upward
                    translateY: anim.interpolate({
                      inputRange:  [0, 1],
                      outputRange: [
                        (BAR_CONT_H / 2) * (1 - BAR_MIN_H / BAR_CONT_H),
                        (BAR_CONT_H / 2) * (1 - BAR_MAX_H / BAR_CONT_H),
                      ],
                      extrapolate: 'clamp',
                    }),
                  },
                  {
                    scaleY: anim.interpolate({
                      inputRange:  [0, 1],
                      outputRange: [BAR_MIN_H / BAR_CONT_H, BAR_MAX_H / BAR_CONT_H],
                      extrapolate: 'clamp',
                    }),
                  },
                ],
              },
            ]}
          />
        ))}
      </View>

      <View style={waveStyles.track}>
        <Animated.View style={[waveStyles.fill, { width: barWidth }]} />
      </View>
    </View>
  );
}

const waveStyles = StyleSheet.create({
  card: {
    backgroundColor: 'rgba(255,255,255,0.93)',
    borderRadius: 18,
    padding: 18,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  label: { fontSize: 14, fontWeight: '600', color: DARK },
  pct:   { fontSize: 14, fontWeight: '700', color: GREEN },
  barsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: BAR_CONT_H,
    marginBottom: 12,
    overflow: 'hidden',
  },
  bar: {
    flex: 1,
    height: BAR_CONT_H,
    marginHorizontal: 0.8,
    backgroundColor: '#3C3C3C',
    borderRadius: 2,
  },
  track: {
    height: 5,
    backgroundColor: 'rgba(0,0,0,0.1)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    backgroundColor: GREEN,
    borderRadius: 3,
  },
});

// ── Section navigator ─────────────────────────────────────────────────────────
function groupIntoSections(windows) {
  const sections = [];
  for (let i = 0; i < windows.length; i += SECTION_WINDOWS) {
    const group = windows.slice(i, i + SECTION_WINDOWS);
    const nonBg = group.filter(w => w.label !== 'Background');
    let sectionLabel = 'Background';
    if (nonBg.length > 0) {
      const counts = {};
      nonBg.forEach(w => { counts[w.label] = (counts[w.label] || 0) + 1; });
      sectionLabel = Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
    }
    sections.push({
      startSec: group[0].startSec,
      endSec:   group[group.length - 1].endSec,
      label:    sectionLabel,
      windows:  group,
    });
  }
  return sections;
}

function fmtTime(sec) {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

function SectionNavigator({ windows, topLabel }) {
  const [sectionIdx, setSectionIdx] = useState(0);
  const sections = groupIntoSections(windows);
  if (!sections.length) return null;

  const section = sections[Math.min(sectionIdx, sections.length - 1)];

  return (
    <View style={secStyles.card}>
      <View style={secStyles.headerRow}>
        <Text style={secStyles.headerLeft}>Recording analysed</Text>
        <View style={secStyles.badge}>
          <Text style={secStyles.badgeText}>IN SELECTION: {section.label.toUpperCase()}</Text>
        </View>
      </View>

      {/* Mini waveform */}
      <View style={secStyles.miniWave}>
        {section.windows.map((w, i) => (
          <View
            key={i}
            style={[
              secStyles.miniBar,
              { backgroundColor: w.label !== 'Background' ? GREEN : '#CCC' },
            ]}
          />
        ))}
      </View>

      {/* Navigation row */}
      <View style={secStyles.navRow}>
        <TouchableOpacity
          style={[secStyles.navBtn, sectionIdx === 0 && secStyles.navBtnDisabled]}
          onPress={() => setSectionIdx(Math.max(0, sectionIdx - 1))}
          disabled={sectionIdx === 0}
        >
          <Text style={secStyles.navBtnText}>PREV</Text>
        </TouchableOpacity>

        <Text style={secStyles.navLabel}>
          SECTION {sectionIdx + 1}/{sections.length}  ·  {fmtTime(section.startSec)} – {fmtTime(section.endSec)}
        </Text>

        <TouchableOpacity
          style={[secStyles.navBtn, sectionIdx === sections.length - 1 && secStyles.navBtnDisabled]}
          onPress={() => setSectionIdx(Math.min(sections.length - 1, sectionIdx + 1))}
          disabled={sectionIdx === sections.length - 1}
        >
          <Text style={secStyles.navBtnText}>NEXT</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const secStyles = StyleSheet.create({
  card: {
    backgroundColor: 'rgba(255,255,255,0.93)',
    borderRadius: 18,
    padding: 16,
    marginTop: 12,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  headerLeft: { fontSize: 13, fontWeight: '600', color: DARK },
  badge: {
    backgroundColor: GREEN,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  badgeText: { fontSize: 10, fontWeight: '700', color: '#FFF', letterSpacing: 0.5 },
  miniWave: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 32,
    marginBottom: 12,
  },
  miniBar: {
    flex: 1,
    height: 24,
    marginHorizontal: 0.5,
    borderRadius: 2,
  },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  navBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    backgroundColor: DARK,
    borderRadius: 8,
  },
  navBtnDisabled: { backgroundColor: '#CCC' },
  navBtnText: { fontSize: 11, fontWeight: '700', color: '#FFF', letterSpacing: 0.5 },
  navLabel: { fontSize: 11, color: '#666', fontWeight: '500' },
});

// ── Main screen ───────────────────────────────────────────────────────────────
export function ClassifyScreen() {
  const insets = useSafeAreaInsets();
  const { isRecording, startRecording, stopRecording } = useRecorder();
  const { classify, loading, progress, cancel } = useClassifier();

  const [audioUri, setAudioUri]   = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [result, setResult]       = useState(null);
  const [error, setError]         = useState(null);
  const cancelledRef = useRef(false);
  const playerRef    = useRef(null);

  const noFrogFound     = result?.topMatch?.name === 'No frog found';
  const speciesInfo     = noFrogFound ? null : speciesData.find(
    s => normalize(s.name) === normalize(result?.topMatch?.name)
  );
  const confidence      = result?.topMatch?.confidence ?? 0;
  const frogImageSource = speciesInfo?.image ? frogImages[speciesInfo.image] : null;

  const runClassify = async (uri) => {
    cancelledRef.current = false;
    setError(null);
    setResult(null);
    try {
      const classResult = await classify(uri);
      if (!cancelledRef.current) setResult(classResult);
    } catch (e) {
      if (!cancelledRef.current) setError(e.message || 'Classification failed');
    }
  };

  const handleStopRecording = async () => {
    const audioFile = await stopRecording();
    const uri = audioFile?.uri ?? audioFile;
    setAudioUri(uri);
    await runClassify(uri);
  };

  const handleUpload = async () => {
    try {
      const uri = await filePickerService.pickAudioFile();
      if (!uri) return;
      setAudioUri(uri);
      await runClassify(uri);
    } catch (e) {
      setError(e.message || 'Upload failed');
    }
  };

  const handleCancel = () => {
    cancelledRef.current = true;
    cancel();
  };

  const handlePlayStop = async () => {
    if (playerRef.current) {
      playerRef.current.release();
      playerRef.current = null;
      setIsPlaying(false);
      return;
    }
    if (!audioUri) return;
    setIsPlaying(true);
    const player = createAudioPlayer(audioUri);
    playerRef.current = player;
    const sub = player.addListener('playbackStatusUpdate', (status) => {
      if (status.didJustFinish) {
        sub.remove();
        player.release();
        playerRef.current = null;
        setIsPlaying(false);
      }
    });
    player.play();
  };

  return (
    <ImageBackground
      source={require('../assets/images/background_image.png')}
      style={styles.bg}
      resizeMode="cover"
    >
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollInner}
        showsVerticalScrollIndicator={false}
      >
        {error && (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {loading ? (
          <WaveformLoader progress={progress} />

        ) : result && noFrogFound ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>No frog detected</Text>
            <Text style={styles.emptySubtitle}>
              No frog call was found in the audio. Try recording closer to the frog, or in a quieter environment.
            </Text>
          </View>

        ) : result ? (
          <>
            <View style={styles.resultCard}>
              {frogImageSource ? (
                <Image source={frogImageSource} style={styles.heroImage} resizeMode="cover" fadeDuration={0} />
              ) : (
                <View style={[styles.heroImage, styles.heroPlaceholder]}>
                  <Text style={styles.placeholderText}>No image available</Text>
                </View>
              )}

              <View style={styles.nameRow}>
                <View style={styles.nameBlock}>
                  <Text style={styles.speciesName}>{result.topMatch.name}</Text>
                  {speciesInfo?.scientific_name ? (
                    <Text style={styles.scientificName}>{speciesInfo.scientific_name}</Text>
                  ) : null}
                </View>
                <View style={styles.confidenceBlock}>
                  <Text style={styles.confidencePct}>{(confidence * 100).toFixed(0)}%</Text>
                  <Text style={styles.confidenceLabel}>model confidence</Text>
                </View>
              </View>

              <View style={styles.barTrack}>
                <View style={[styles.barFill, { width: `${(confidence * 100).toFixed(0)}%` }]} />
              </View>

              {speciesInfo && (
                <View style={styles.detailsSection}>
                  {speciesInfo.description ? (
                    <Text style={styles.detailBody}>{speciesInfo.description}</Text>
                  ) : null}

                  {[
                    ['Call',                speciesInfo.callDescription],
                    ['Habitat',            speciesInfo.habitat],
                    ['Size',               speciesInfo.size],
                    ['Conservation Status',speciesInfo.conservationStatus],
                  ].map(([label, value]) =>
                    value ? (
                      <View key={label} style={styles.detailRow}>
                        <Text style={styles.detailLabel}>{label}  </Text>
                        <Text style={styles.detailValue}>{value}</Text>
                      </View>
                    ) : null
                  )}
                </View>
              )}
            </View>

            {result.windows?.length > 0 && (
              <SectionNavigator windows={result.windows} topLabel={result.topMatch.name} />
            )}
          </>

        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>Identify a Frog</Text>
            <Text style={styles.emptySubtitle}>
              Record a frog call or upload an audio file to identify the species
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Bottom action bar — stable positioning via insets */}
      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 8 }]}>
        <TouchableOpacity
          style={[styles.sideAction, (loading || isRecording) && styles.sideActionDisabled]}
          onPress={handleUpload}
          disabled={loading || isRecording}
        >
          <Text style={styles.sideIcon}>+</Text>
          <Text style={styles.sideLabel}>UPLOAD</Text>
        </TouchableOpacity>

        {loading ? (
          <TouchableOpacity style={[styles.mainButton, styles.cancelButton]} onPress={handleCancel}>
            <Text style={styles.mainButtonText}>Cancel</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.mainButton, isRecording && styles.stopButton]}
            onPress={isRecording ? handleStopRecording : startRecording}
          >
            <Text style={styles.mainButtonText}>
              {isRecording ? 'Stop' : 'Record'}
            </Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[styles.sideAction, (!audioUri || loading) && styles.sideActionDisabled]}
          onPress={handlePlayStop}
          disabled={!audioUri || loading}
        >
          <Text style={styles.sideIcon}>{isPlaying ? 'X' : '>'}</Text>
          <Text style={styles.sideLabel}>{isPlaying ? 'STOP' : 'PLAY'}</Text>
        </TouchableOpacity>
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1 },

  scroll: { flex: 1 },
  scrollInner: { padding: 16, flexGrow: 1 },

  errorBanner: {
    backgroundColor: 'rgba(255,235,238,0.95)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  errorText: { color: '#C62828', fontSize: 14 },

  // ── Result card
  resultCard: {
    backgroundColor: 'rgba(255,255,255,0.93)',
    borderRadius: 18,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  heroImage: { width: '100%', height: 210 },
  heroPlaceholder: {
    backgroundColor: '#E8F5E9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderText: { fontSize: 14, color: '#888' },

  nameRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 10,
  },
  nameBlock: { flex: 1 },
  speciesName: { fontSize: 21, fontWeight: 'bold', color: DARK },
  scientificName: { fontSize: 13, fontStyle: 'italic', color: '#777', marginTop: 3 },

  confidenceBlock: { alignItems: 'flex-end', marginLeft: 10 },
  confidencePct: { fontSize: 30, fontWeight: 'bold', color: GREEN, lineHeight: 34 },
  confidenceLabel: {
    fontSize: 9, color: '#999', textTransform: 'uppercase',
    letterSpacing: 0.6, marginTop: 1,
  },

  barTrack: {
    height: 6, backgroundColor: '#E0E0E0',
    marginHorizontal: 16, borderRadius: 3,
    overflow: 'hidden', marginBottom: 14,
  },
  barFill: { height: '100%', backgroundColor: GREEN, borderRadius: 3 },

  detailsSection: {
    borderTopWidth: 1, borderTopColor: '#F0F0F0',
    paddingTop: 14, paddingHorizontal: 16, paddingBottom: 18,
  },
  detailBody: { fontSize: 14, color: '#444', lineHeight: 20, marginBottom: 10 },
  detailRow: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 6 },
  detailLabel: { fontSize: 13, fontWeight: '600', color: DARK },
  detailValue: { fontSize: 13, color: '#555', flex: 1 },

  // ── Empty state
  emptyState: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingVertical: 80, paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 22, fontWeight: 'bold', color: DARK,
    marginBottom: 10, textAlign: 'center',
  },
  emptySubtitle: { fontSize: 15, color: '#555', textAlign: 'center', lineHeight: 22 },

  // ── Bottom bar
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 28,
    paddingTop: 12,
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(0,0,0,0.12)',
  },
  sideAction: { alignItems: 'center', width: 64 },
  sideActionDisabled: { opacity: 0.3 },
  sideIcon: { fontSize: 22, color: DARK, fontWeight: '600' },
  sideLabel: {
    fontSize: 10, fontWeight: '700', color: DARK,
    letterSpacing: 0.8, marginTop: 3,
  },
  mainButton: {
    backgroundColor: DARK,
    paddingVertical: 15,
    paddingHorizontal: 36,
    borderRadius: 50,
  },
  stopButton:   { backgroundColor: '#B71C1C' },
  cancelButton: { backgroundColor: '#555' },
  mainButtonText: { color: '#FFF', fontSize: 16, fontWeight: '600' },
});
