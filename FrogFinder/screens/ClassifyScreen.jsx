import { useState, useEffect, useRef, useMemo } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  Animated, Image, StyleSheet, Dimensions, Easing,
} from 'react-native';
import * as Sharing from 'expo-sharing';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { createAudioPlayer } from 'expo-audio';
import { useRecorder } from '../hooks/useRecorder';
import { useClassifier } from '../hooks/useClassifier';
import { filePickerService } from '../services/filePickerService';
import { sightingsService } from '../services/sightingsService';
import { locationService } from '../services/locationService';
import { frogImages } from '../assets/images/frogImages';
import speciesData from '../assets/data/speciesDetails.json';

const DARK    = '#1C1C1E';
const GREEN   = '#4A7C59';
const BORDER  = 'rgba(0,0,0,0.10)';
const FROG_UNPLAYED = 'rgba(74,124,89,0.45)';

const { width: SCREEN_W } = Dimensions.get('window');
// scrollInner padding:16 each side + card padding:16 each side
const CARD_INNER_W = SCREEN_W - 32 - 32;

const normalize = s => (s ?? '').toLowerCase().replace(/[^a-z0-9]/g, '').trim();
const fmtSec    = s => { const t = Math.round(s); return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`; };

// ── StatusTicker — fades between status messages, lingers on species names ────
function StatusTicker({ text }) {
  const opacity  = useRef(new Animated.Value(1)).current;
  const [shown, setShown] = useState(text);
  const lastSpecies = useRef(null);

  useEffect(() => {
    const isBg = !text || text.startsWith('Background') || text === 'Classifying...';
    const speciesOf = (t) => { const d = t?.indexOf(' · '); return d >= 0 ? t.slice(0, d) : t; };

    const doFade = (t) => {
      Animated.timing(opacity, { toValue: 0, duration: 100, useNativeDriver: true })
        .start(({ finished }) => {
          if (!finished) return;
          setShown(t);
          Animated.timing(opacity, { toValue: 1, duration: 150, useNativeDriver: true }).start();
        });
    };

    if (!isBg) {
      const prevSpecies = speciesOf(lastSpecies.current);
      const nextSpecies = speciesOf(text);
      if (nextSpecies !== prevSpecies) {
        doFade(text);        // new species — fade transition
      } else {
        setShown(text);      // same species, count incremented — silent update, no flash
      }
      lastSpecies.current = text;
    } else if (!lastSpecies.current) {
      doFade(text);
    }
    // else: background window, species seen before — keep showing last species
  }, [text]);

  return (
    <Animated.Text style={[styles.ticker, { opacity }]}>{shown}</Animated.Text>
  );
}

// ── WaveformDisplay — bars with playback cursor and selection overlay ─────────
function WaveformDisplay({ samples, frogBuckets, playbackFraction, selection, containerW }) {
  return (
    <View style={{ height: 44, justifyContent: 'flex-end' }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', height: 36, gap: 1.5 }}>
        {samples.map((amp, i) => {
          const frac = (i + 0.5) / samples.length;
          const played = frac < (playbackFraction ?? 0);
          const frog = frogBuckets?.[i];
          const bg = frog
            ? (played ? GREEN : FROG_UNPLAYED)
            : (played ? '#888' : BORDER);
          return (
            <View key={i} style={{
              flex: 1, height: Math.max(2, amp * 36), borderRadius: 1,
              backgroundColor: bg,
            }} />
          );
        })}
      </View>

      {/* Always mounted so position changes don't cause a mount-flash; collapsed when no selection */}
      <View pointerEvents="none" style={{
        position: 'absolute', top: 0, bottom: 0,
        left: selection && containerW > 0 ? selection.start * containerW : 0,
        width: selection && containerW > 0 ? Math.max(2, (selection.end - selection.start) * containerW) : 0,
        backgroundColor: 'rgba(74,124,89,0.12)',
        borderWidth: selection ? 1 : 0, borderColor: 'rgba(74,124,89,0.45)',
        borderRadius: 2,
      }} />

      {(playbackFraction ?? 0) > 0 && containerW > 0 && (
        <View style={{
          position: 'absolute', top: 0, bottom: 0,
          left: Math.max(0, (playbackFraction ?? 0) * containerW - 1), width: 2,
          borderRadius: 1, backgroundColor: DARK,
        }} />
      )}
    </View>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────
export function ClassifyScreen() {
  const insets = useSafeAreaInsets();
  const { isRecording, startRecording, stopRecording } = useRecorder();
  const { classify, loading, progress, status, cancel, waveformSamples } = useClassifier();

  const [audioUri,        setAudioUri]        = useState(null);
  const [isRecorded,      setIsRecorded]      = useState(false);
  const [isPlaying,       setIsPlaying]       = useState(false);
  const [playbackPos,     setPlaybackPos]     = useState(0);
  const [audioDuration,   setAudioDuration]   = useState(0);
  const [result,          setResult]          = useState(null);
  const [error,           setError]           = useState(null);
  const [saved,           setSaved]           = useState(false);
  const [savedSightingId, setSavedSightingId] = useState(null);
  const [waveSelection,   setWaveSelection]   = useState(null);
  const [segmentIdx,      setSegmentIdx]      = useState(null);
  const [waveContainerW,  setWaveContainerW]  = useState(0);

  const cancelledRef  = useRef(false);
  const playerRef     = useRef(null);
  const playerGenRef  = useRef(0);

  const progressAnim     = useRef(new Animated.Value(0)).current;
  const progressFadeAnim = useRef(new Animated.Value(0)).current;
  const resultDropAnim   = useRef(new Animated.Value(0)).current;

  // Animate progress bar smoothly using translateX (useNativeDriver: true)
  useEffect(() => {
    if (loading && progress !== null) {
      Animated.timing(progressAnim, {
        toValue:  progress,
        duration: 250,
        easing:   Easing.out(Easing.quad),
        useNativeDriver: true,
      }).start();
    }
  }, [progress, loading]);

  useEffect(() => {
    if (loading) {
      progressAnim.setValue(0);
      Animated.timing(progressFadeAnim, { toValue: 1, duration: 220, useNativeDriver: true }).start();
    } else {
      Animated.sequence([
        Animated.timing(progressAnim,     { toValue: 1, duration: 300, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.timing(progressFadeAnim, { toValue: 0, duration: 240, useNativeDriver: true }),
      ]).start();
    }
  }, [loading]);

  useEffect(() => {
    if (result) {
      resultDropAnim.setValue(0);
      Animated.timing(resultDropAnim, { toValue: 1, duration: 300, useNativeDriver: true }).start();
    }
  }, [result]);

  // Derived species info
  const noFrogFound     = result?.topMatch?.name === 'No frog found';
  const speciesInfo     = noFrogFound ? null : speciesData.find(s => normalize(s.name) === normalize(result?.topMatch?.name));
  const confidence      = result?.topMatch?.confidence ?? 0;
  const frogImageSource = speciesInfo?.image ? frogImages[speciesInfo.image] : null;
  const frogBuckets     = result?.frogBuckets ?? [];
  const frogLabels      = result?.frogLabels  ?? [];
  const playbackFraction = audioDuration > 0 ? playbackPos / audioDuration : 0;

  // Contiguous frog segments from waveform buckets
  const frogSegments = useMemo(() => {
    if (!frogBuckets?.length) return [];
    const n = frogBuckets.length;
    const segments = [];
    let inSeg = false, segStart = 0;
    for (let i = 0; i < n; i++) {
      if (frogBuckets[i] && !inSeg)  { inSeg = true;  segStart = i; }
      if (!frogBuckets[i] && inSeg)  { inSeg = false; segments.push({ start: Math.max(0, (segStart - 1) / n), end: Math.min(1, (i + 1) / n) }); }
    }
    if (inSeg) segments.push({ start: Math.max(0, (segStart - 1) / n), end: 1 });
    return segments;
  }, [frogBuckets]);

  // Label of the first frog species within the current selection
  const firstFrogInSelection = useMemo(() => {
    if (!waveSelection || !frogLabels?.length) return null;
    const n = frogLabels.length;
    for (let i = Math.floor(waveSelection.start * n); i <= Math.min(Math.ceil(waveSelection.end * n), n - 1); i++) {
      if (frogLabels[i]) return frogLabels[i];
    }
    return null;
  }, [waveSelection, frogLabels]);

  const handleShareAudio = async () => {
    if (!audioUri) return;
    try { await Sharing.shareAsync(audioUri); } catch {}
  };

  const handleDontSave = async () => {
    if (savedSightingId) {
      await sightingsService.deleteSighting(savedSightingId);
      setSavedSightingId(null);
      setSaved(false);
    }
  };

  const runClassify = async (uri, recorded) => {
    cancelledRef.current = false;
    setError(null);
    setResult(null);
    setSaved(false);
    setSavedSightingId(null);
    setWaveSelection(null);
    setSegmentIdx(null);
    setPlaybackPos(0);
    setAudioDuration(0);
    try {
      const classResult = await classify(uri);
      if (!cancelledRef.current) {
        setResult(classResult);
        if (classResult.audioDuration) setAudioDuration(Math.round(classResult.audioDuration));
        if (classResult.topMatch?.name !== 'No frog found') {
          const location = recorded ? await locationService.getCurrentLocation() : null;
          const entry = await sightingsService.addSighting({
            species:      classResult.topMatch.name,
            confidence:   classResult.topMatch.confidence,
            alternatives: (classResult.topMatch.all ?? []).slice(1).map(a => ({ species: a.label, confidence: a.confidence })),
            date:         new Date().toISOString(),
            location,
          });
          setSavedSightingId(entry.id);
          setSaved(true);
        }
      }
    } catch (e) {
      if (!cancelledRef.current) setError(e.message || 'Classification failed');
    }
  };

  const handleStopRecording = async () => {
    const audioFile = await stopRecording();
    const uri = audioFile?.uri ?? audioFile;
    setAudioUri(uri);
    setIsRecorded(true);
    await runClassify(uri, true);
  };

  const handleUpload = async () => {
    try {
      const uri = await filePickerService.pickAudioFile();
      if (!uri) return;
      setAudioUri(uri);
      setIsRecorded(false);
      await runClassify(uri, false);
    } catch (e) {
      setError(e.message || 'Upload failed');
    }
  };

  const handleCancel = () => {
    cancelledRef.current = true;
    cancel();
  };

  const handlePlayPause = async () => {
    if (playerRef.current) {
      ++playerGenRef.current;
      playerRef.current.release();
      playerRef.current = null;
      setIsPlaying(false);
      return;
    }
    if (!audioUri) return;
    const gen = ++playerGenRef.current;
    const player = createAudioPlayer(audioUri);
    playerRef.current = player;
    setIsPlaying(true);
    player.addListener('playbackStatusUpdate', (s) => {
      if (playerGenRef.current !== gen) return;
      if (s.currentTime !== undefined && s.currentTime > 50) setPlaybackPos(s.currentTime / 1000);
      if (s.didJustFinish) {
        player.release();
        playerRef.current = null;
        setIsPlaying(false);
        setPlaybackPos(0);
      }
    });
    player.play();
  };

  const seekAudio = (posSec) => {
    try { playerRef.current?.seekTo(posSec * 1000); } catch {}
    setPlaybackPos(posSec);
  };

  const goToSegment = (idx) => {
    if (!frogSegments.length || !audioUri) return;
    const i   = ((idx % frogSegments.length) + frogSegments.length) % frogSegments.length;
    const seg = frogSegments[i];
    setSegmentIdx(i);
    setWaveSelection(seg);
    const targetSec = audioDuration > 0 ? seg.start * audioDuration : 0;

    ++playerGenRef.current;
    if (playerRef.current) { playerRef.current.release(); playerRef.current = null; }
    const gen = ++playerGenRef.current;

    const player = createAudioPlayer(audioUri);
    playerRef.current = player;
    setIsPlaying(true);
    player.addListener('playbackStatusUpdate', (s) => {
      if (playerGenRef.current !== gen) return;
      if (s.currentTime !== undefined && s.currentTime > 50) setPlaybackPos(s.currentTime / 1000);
      if (s.didJustFinish) {
        player.release(); playerRef.current = null;
        setIsPlaying(false); setPlaybackPos(0);
      }
    });
    player.seekTo(targetSec * 1000);
    setPlaybackPos(targetSec);
    player.play();
  };

  const showCards = loading || !!result;

  return (
    <View style={styles.bg}>
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

        {showCards ? (
          <>
            {/* ── Card 1: Analysing / Recording analysed ── */}
            <View style={styles.card}>

              {/* PROCESSING STATE */}
              {loading && (
                <>
                  <View style={styles.cardHeaderRow}>
                    <Text style={styles.cardHeaderTitle}>Analysing audio</Text>
                    {progress !== null && (
                      <Text style={styles.progressPct}>{Math.round(progress * 100)}%</Text>
                    )}
                  </View>

                  <StatusTicker text={status || 'Starting...'} />

                  {/* Waveform shading — green fills left-to-right as windows complete */}
                  {waveformSamples.length > 0 && (
                    <View style={[styles.waveRow, { marginTop: 14 }]}>
                      {waveformSamples.map((amp, i) => {
                        const analysed = progress !== null && i < progress * waveformSamples.length;
                        return (
                          <View key={i} style={{
                            flex: 1, height: Math.max(2, amp * 36),
                            borderRadius: 1,
                            backgroundColor: analysed ? GREEN : BORDER,
                          }} />
                        );
                      })}
                    </View>
                  )}

                  {/* Smooth translateX progress bar — useNativeDriver: true */}
                  {progress !== null && (
                    <Animated.View style={{ opacity: progressFadeAnim, marginTop: 10 }}>
                      <View style={styles.confTrack}>
                        <Animated.View style={[styles.confFill, {
                          width: CARD_INNER_W,
                          transform: [{
                            translateX: progressAnim.interpolate({
                              inputRange:  [0, 1],
                              outputRange: [-CARD_INNER_W, 0],
                            }),
                          }],
                        }]} />
                      </View>
                    </Animated.View>
                  )}
                </>
              )}

              {/* RESULT STATE */}
              {!loading && result && (
                <Animated.View style={{ opacity: resultDropAnim }}>
                  <View style={styles.cardHeaderRow}>
                    <View style={styles.micRow}>
                      <View style={styles.micCircle}>
                        <Text style={styles.micIcon}>i</Text>
                      </View>
                      <View>
                        <Text style={styles.cardHeaderTitle}>Recording analysed</Text>
                        {audioDuration > 0 && (
                          <Text style={styles.durationText}>{audioDuration}s · just now</Text>
                        )}
                      </View>
                    </View>
                    {firstFrogInSelection && (
                      <View style={{ alignItems: 'flex-end', maxWidth: 120 }}>
                        <Text style={styles.inSelLabel}>IN SELECTION</Text>
                        <Text style={styles.inSelSpecies} numberOfLines={1}>{firstFrogInSelection}</Text>
                      </View>
                    )}
                  </View>

                  {waveformSamples.length > 0 && (
                    <View
                      style={{ marginTop: 12 }}
                      onLayout={e => setWaveContainerW(e.nativeEvent.layout.width)}
                    >
                      <WaveformDisplay
                        samples={waveformSamples}
                        frogBuckets={frogBuckets}
                        playbackFraction={playbackFraction}
                        selection={waveSelection}
                        containerW={waveContainerW}
                      />

                      {frogSegments.length > 0 && (
                        <View style={styles.segNav}>
                          <TouchableOpacity
                            onPress={() => goToSegment((segmentIdx ?? 1) - 1)}
                            activeOpacity={0.7}
                            style={styles.segNavBtn}
                          >
                            <Text style={styles.segNavArrow}>‹</Text>
                            <Text style={styles.segNavText}>PREV</Text>
                          </TouchableOpacity>

                          <View style={{ alignItems: 'center' }}>
                            <Text style={styles.segNavCenter}>
                              {segmentIdx !== null
                                ? `SECTION ${segmentIdx + 1} / ${frogSegments.length} · LOOPING`
                                : `${frogSegments.length} FROG SECTION${frogSegments.length !== 1 ? 'S' : ''}`}
                            </Text>
                            {waveSelection && audioDuration > 0 && (
                              <Text style={styles.segNavTime}>
                                {fmtSec(waveSelection.start * audioDuration)} – {fmtSec(waveSelection.end * audioDuration)}
                              </Text>
                            )}
                          </View>

                          <TouchableOpacity
                            onPress={() => goToSegment((segmentIdx ?? -1) + 1)}
                            activeOpacity={0.7}
                            style={styles.segNavBtn}
                          >
                            <Text style={styles.segNavText}>NEXT</Text>
                            <Text style={styles.segNavArrow}>›</Text>
                          </TouchableOpacity>
                        </View>
                      )}
                    </View>
                  )}
                </Animated.View>
              )}
            </View>

            {/* ── Card 2: Species result ── */}
            {!loading && result && noFrogFound && (
              <View style={styles.emptyState}>
                <Text style={styles.emptyTitle}>No frog detected</Text>
                <Text style={styles.emptySubtitle}>
                  No frog call was found in the audio. Try recording closer to the frog, or in a quieter environment.
                </Text>
              </View>
            )}

            {!loading && result && !noFrogFound && (
              <Animated.View style={{ opacity: resultDropAnim }}>
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
                      {speciesInfo?.scientific_name && (
                        <Text style={styles.scientificName}>{speciesInfo.scientific_name}</Text>
                      )}
                    </View>
                    <View style={styles.confidenceBlock}>
                      <Text style={styles.confidencePct}>{(confidence * 100).toFixed(0)}%</Text>
                      <Text style={styles.confidenceLabel}>model confidence</Text>
                    </View>
                  </View>

                  <View style={styles.barTrack}>
                    <View style={[styles.barFill, { width: `${(confidence * 100).toFixed(0)}%` }]} />
                  </View>

                  {saved && (
                    <View style={styles.savedRow}>
                      <Text style={styles.savedLabel}>
                        {isRecorded ? 'Recording saved to Sightings' : 'Saved to Sightings'}
                      </Text>
                      <TouchableOpacity onPress={handleDontSave}>
                        <Text style={styles.dontSaveText}>Remove</Text>
                      </TouchableOpacity>
                    </View>
                  )}

                  {speciesInfo && (
                    <View style={styles.detailsSection}>
                      {speciesInfo.description && (
                        <Text style={styles.detailBody}>{speciesInfo.description}</Text>
                      )}
                      {[
                        ['Call',                 speciesInfo.callDescription],
                        ['Habitat',              speciesInfo.habitat],
                        ['Size',                 speciesInfo.size],
                        ['Conservation Status',  speciesInfo.conservationStatus],
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
              </Animated.View>
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

      {/* ── Bottom action bar ── */}
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
            <Text style={styles.mainButtonText}>{isRecording ? 'Stop' : 'Record'}</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[styles.sideAction, (!audioUri || loading) && styles.sideActionDisabled]}
          onPress={handlePlayPause}
          disabled={!audioUri || loading}
        >
          <Text style={styles.sideIcon}>{isPlaying ? '■' : '▶'}</Text>
          <Text style={styles.sideLabel}>{isPlaying ? 'STOP' : 'PLAY'}</Text>
        </TouchableOpacity>
      </View>

      {/* ── Spinning frog — centered overlay during analysis ── */}
      {loading && (
        <View pointerEvents="none" style={styles.spinOverlay}>
          <Image source={require('../assets/frog-spin.gif')} style={styles.spinGif} resizeMode="contain" />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  bg:          { flex: 1 },
  scroll:      { flex: 1 },
  scrollInner: { padding: 16, flexGrow: 1, gap: 12 },

  errorBanner: {
    backgroundColor: 'rgba(255,235,238,0.95)',
    borderRadius: 12, padding: 12, marginBottom: 0,
  },
  errorText: { color: '#C62828', fontSize: 14 },

  // ── Shared card
  card: {
    backgroundColor: 'rgba(255,255,255,0.93)',
    borderRadius: 18, padding: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08, shadowRadius: 8, elevation: 3,
  },
  cardHeaderRow: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginBottom: 4,
  },
  cardHeaderTitle: { fontSize: 15, fontWeight: '600', color: DARK },
  progressPct:     { fontSize: 13, color: '#999' },

  // StatusTicker
  ticker: { color: GREEN, fontSize: 12, marginTop: 5 },

  // Spinning frog overlay
  spinOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    alignItems: 'center', justifyContent: 'center',
  },
  spinGif: { width: 120, height: 120 },

  // Progress waveform row
  waveRow: { flexDirection: 'row', alignItems: 'flex-end', height: 36, gap: 1.5 },

  // Smooth progress bar
  confTrack: { height: 4, backgroundColor: BORDER, borderRadius: 99, overflow: 'hidden' },
  confFill:  { height: '100%', backgroundColor: GREEN, borderRadius: 99 },

  // Recording analysed header
  micRow:    { flexDirection: 'row', alignItems: 'center', gap: 10 },
  micCircle: {
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: 'rgba(0,0,0,0.06)',
    alignItems: 'center', justifyContent: 'center',
  },
  micIcon:      { fontSize: 15, fontWeight: '700', fontStyle: 'italic', color: '#555' },
  durationText: { fontSize: 11, color: '#999', marginTop: 1 },

  inSelLabel:   { fontSize: 9, fontWeight: '700', color: '#AAA', letterSpacing: 0.8, textTransform: 'uppercase' },
  inSelSpecies: { fontSize: 12, fontWeight: '600', color: GREEN, marginTop: 1 },

  // Segment navigation
  segNav: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginTop: 10,
  },
  segNavBtn:    { flexDirection: 'row', alignItems: 'center', gap: 2, paddingVertical: 4, paddingHorizontal: 2 },
  segNavArrow:  { fontSize: 18, color: GREEN, lineHeight: 20 },
  segNavText:   { fontSize: 10, fontWeight: '700', color: GREEN, letterSpacing: 0.5 },
  segNavCenter: { fontSize: 9, fontWeight: '600', color: '#AAA', letterSpacing: 0.5, textTransform: 'uppercase' },
  segNavTime:   { fontSize: 9, color: GREEN, fontWeight: '600', marginTop: 1 },

  // ── Result card
  resultCard: {
    backgroundColor: 'rgba(255,255,255,0.93)',
    borderRadius: 18, overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08, shadowRadius: 8, elevation: 3,
  },
  heroImage:       { width: '100%', height: 210 },
  heroPlaceholder: { backgroundColor: '#E8F5E9', alignItems: 'center', justifyContent: 'center' },
  placeholderText: { fontSize: 14, color: '#888' },

  nameRow:    { flexDirection: 'row', alignItems: 'flex-start', paddingHorizontal: 16, paddingTop: 14, paddingBottom: 10 },
  nameBlock:  { flex: 1 },
  speciesName:    { fontSize: 21, fontWeight: 'bold', color: DARK },
  scientificName: { fontSize: 13, fontStyle: 'italic', color: '#777', marginTop: 3 },

  confidenceBlock: { alignItems: 'flex-end', marginLeft: 10 },
  confidencePct:   { fontSize: 30, fontWeight: 'bold', color: GREEN, lineHeight: 34 },
  confidenceLabel: { fontSize: 9, color: '#999', textTransform: 'uppercase', letterSpacing: 0.6, marginTop: 1 },

  barTrack: {
    height: 6, backgroundColor: '#E0E0E0',
    marginHorizontal: 16, borderRadius: 3,
    overflow: 'hidden', marginBottom: 14,
  },
  barFill: { height: '100%', backgroundColor: GREEN, borderRadius: 3 },

  saveBtn:     { marginHorizontal: 16, marginBottom: 10, backgroundColor: GREEN, borderRadius: 10, paddingVertical: 11, alignItems: 'center' },
  saveBtnText: { color: '#FFF', fontSize: 14, fontWeight: '600' },

  savedRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginHorizontal: 16, marginBottom: 14,
  },
  savedLabel:   { fontSize: 13, color: '#777' },
  dontSaveText: { fontSize: 13, color: '#B83428', fontWeight: '600' },

  detailsSection: { borderTopWidth: 1, borderTopColor: '#F0F0F0', paddingTop: 14, paddingHorizontal: 16, paddingBottom: 18 },
  detailBody:     { fontSize: 14, color: '#444', lineHeight: 20, marginBottom: 10 },
  detailRow:      { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 6 },
  detailLabel:    { fontSize: 13, fontWeight: '600', color: DARK },
  detailValue:    { fontSize: 13, color: '#555', flex: 1 },

  // ── Empty state
  emptyState:    { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 80, paddingHorizontal: 32 },
  emptyTitle:    { fontSize: 22, fontWeight: 'bold', color: DARK, marginBottom: 10, textAlign: 'center' },
  emptySubtitle: { fontSize: 15, color: '#555', textAlign: 'center', lineHeight: 22 },

  // ── Bottom bar
  bottomBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 28, paddingTop: 12,
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: 'rgba(0,0,0,0.12)',
  },
  sideAction:         { alignItems: 'center', width: 64 },
  sideActionDisabled: { opacity: 0.3 },
  sideIcon:  { fontSize: 20, color: DARK, fontWeight: '600' },
  sideLabel: { fontSize: 10, fontWeight: '700', color: DARK, letterSpacing: 0.8, marginTop: 3 },

  mainButton: {
    flex: 1, marginHorizontal: 12,
    backgroundColor: DARK, borderRadius: 50,
    paddingVertical: 15, alignItems: 'center',
  },
  stopButton:      { backgroundColor: '#B83428' },
  cancelButton:    { backgroundColor: '#B83428' },
  mainButtonText:  { color: '#FFF', fontSize: 16, fontWeight: '700' },
});
