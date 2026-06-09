/*
 * Purpose: Main identification screen — records or uploads a WAV, runs the
 *          on-device SVM classifier, displays the result with a waveform
 *          visualisation, and auto-saves identified sightings.
 * Inputs:  Audio via device microphone or WAV file picker.
 * Outputs: Rendered screen; classification result shown in a modal; sighting
 *          written to local storage via sightingsService.
 */
import { useState } from 'react';
import {
  View, Text, TouchableOpacity, ActivityIndicator,
  Modal, Pressable, StyleSheet, Image, ScrollView,
} from 'react-native';
import { createAudioPlayer } from 'expo-audio';
import { useRecorder } from '../hooks/useRecorder';
import { useClassifier } from '../hooks/useClassifier';
import { filePickerService } from '../services/filePickerService';
import { sightingsService } from '../services/sightingsService';
import { locationService } from '../services/locationService';
import { frogImages } from '../assets/images/frogImages';
import speciesData from '../assets/data/speciesDetails.json';

const GREEN     = '#254f27';
const GREEN_MID = '#4A7C59';
const normalize = s => (s ?? '').toLowerCase().replace(/[^a-z0-9]/g, '').trim();
const fmtSec    = s => { const t = Math.round(s); return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`; };

export function ClassifyScreen() {
  const { isRecording, startRecording, stopRecording } = useRecorder();
  const { classify, loading, progress, status, waveformSamples } = useClassifier();

  const [audioUri,        setAudioUri]        = useState(null);
  const [isPlaying,       setIsPlaying]       = useState(false);
  const [result,          setResult]          = useState(null);
  const [saved,           setSaved]           = useState(false);
  const [savedSightingId, setSavedSightingId] = useState(null);
  const [uploadPopup,     setUploadPopup]     = useState(false);
  const [classifyPopup,   setClassifyPopup]   = useState(false);
  const [errorPopup,      setErrorPopup]      = useState(false);
  const [errorMessage,    setErrorMessage]    = useState('');
  const [selectedFile,    setSelectedFile]    = useState(null);
  const [noFrogReason,   setNoFrogReason]    = useState(null);

  const noFrogFound     = result?.topMatch?.name === 'No frog found';
  const speciesInfo     = !noFrogFound && result?.topMatch?.name
    ? speciesData.find(s => normalize(s.name) === normalize(result.topMatch.name))
    : null;
  const confidence      = result?.topMatch?.confidence ?? 0;
  const frogImageSource = speciesInfo?.image ? frogImages[speciesInfo.image] : null;
  const frogBuckets     = result?.frogBuckets ?? [];

  // Detection time range from window-level predictions
  const frogWindows    = (result?.windows ?? []).filter(w => w.label !== 'Background');
  const detectionStart = frogWindows.length ? Math.min(...frogWindows.map(w => w.startSec)) : null;
  const detectionEnd   = frogWindows.length ? Math.max(...frogWindows.map(w => w.endSec))   : null;
  const detectionText  = noFrogFound
    ? 'No frog call detected in this recording'
    : detectionStart !== null
      ? `Frog call detected ${fmtSec(detectionStart)} – ${fmtSec(detectionEnd)}`
      : 'Frog call detected';

  const runClassify = async (uri, recorded) => {
    setResult(null);
    setSaved(false);
    setSavedSightingId(null);
    setNoFrogReason(null);
    try {
      const classResult = await classify(uri);
      setResult(classResult);
      if (classResult.topMatch?.name !== 'No frog found') {
        const location = recorded ? await locationService.getCurrentLocation() : null;
        const entry = await sightingsService.addSighting({
          species:      classResult.topMatch.name,
          confidence:   classResult.topMatch.confidence,
          alternatives: (classResult.alternatives ?? []).map(a => ({
            species: a.name, confidence: a.confidence,
          })),
          date:     new Date().toISOString(),
          location,
        });
        setSavedSightingId(entry.id);
        setSaved(true);
      }
      setClassifyPopup(true);
    } catch (e) {
      if (e.message === 'Audio too short to classify') {
        setResult({ topMatch: { name: 'No frog found', confidence: 0 }, alternatives: [], windows: [], frogBuckets: [], frogLabels: [], audioDuration: 0 });
        setNoFrogReason('short');
        setClassifyPopup(true);
      } else {
        setErrorMessage(e.message || 'Classification failed');
        setErrorPopup(true);
      }
    }
  };

  const handleStopRecording = async () => {
    const audioFile = await stopRecording();
    const uri = audioFile?.uri ?? audioFile;
    setAudioUri(uri);
    await runClassify(uri, true);
  };

  const selectFile = async () => {
    try {
      const uri = await filePickerService.pickAudioFile();
      if (uri) setSelectedFile(uri);
    } catch (e) {
      setErrorMessage(e.message || 'Could not open file');
      setUploadPopup(false);
      setErrorPopup(true);
    }
  };

  const confirmUpload = async () => {
    if (!selectedFile) return;
    const uri = selectedFile;
    setAudioUri(uri);
    setSelectedFile(null);
    setUploadPopup(false);
    await runClassify(uri, false);
  };

  const handlePlayAudio = async () => {
    if (!audioUri || isPlaying) return;
    setIsPlaying(true);
    const player = createAudioPlayer(audioUri);
    player.addListener('playbackStatusUpdate', (status) => {
      if (status.didJustFinish) {
        player.release();
        setIsPlaying(false);
      }
    });
    player.play();
  };

  const handleDontSave = async () => {
    if (savedSightingId) {
      await sightingsService.deleteSighting(savedSightingId);
      setSavedSightingId(null);
      setSaved(false);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Title Card ── */}
        <View style={styles.titleCard}>
          <Text style={styles.title}>Identify a Frog</Text>
          <Text style={styles.subtitle}>Use your microphone or upload a WAV recording to classify Australian frog species</Text>
        </View>

        {/* ── Buttons Card ── */}
        <View style={styles.buttonsCard}>
          <TouchableOpacity
            style={[styles.recordButton, isRecording && styles.recordButtonActive]}
            onPress={isRecording ? handleStopRecording : startRecording}
            disabled={loading}
          >
            <Text style={styles.recordButtonText}>{isRecording ? 'Stop' : 'Record'}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.uploadButton, (loading || isRecording) && styles.disabledButton]}
            onPress={() => setUploadPopup(true)}
            disabled={loading || isRecording}
          >
            <Text style={styles.buttonText}>Upload File</Text>
          </TouchableOpacity>

        </View>

        {/* ── Progress Card — visible while classifying ── */}
        {loading && (
          <View style={styles.progressCard}>
            <View style={styles.progressHeader}>
              <Text style={styles.progressLabel}>Analysing audio</Text>
              {progress !== null && (
                <Text style={styles.progressPct}>{Math.round(progress * 100)}%</Text>
              )}
            </View>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${Math.round((progress ?? 0) * 100)}%` }]} />
            </View>
            {status ? <Text style={styles.statusText}>{status}</Text> : null}
            <ActivityIndicator color={GREEN} size="small" style={{ marginTop: 4 }} />
          </View>
        )}

        {/* ── Detection Card — appears after analysis ── */}
        {result && !loading && (
          <View style={styles.detectionCard}>
            <Text style={styles.detectionTitle}>Audio Analysis</Text>
            <Text style={[styles.detectionInfo, noFrogFound && styles.detectionInfoNone]}>
              {detectionText}
            </Text>

            {waveformSamples.length > 0 && (
              <>
                <View style={styles.waveformRow}>
                  {waveformSamples.map((amp, i) => (
                    <View
                      key={i}
                      style={[styles.waveBar, {
                        height: Math.max(2, amp * 36),
                        backgroundColor: frogBuckets[i] ? GREEN_MID : 'rgba(0,0,0,0.12)',
                      }]}
                    />
                  ))}
                </View>

                {!noFrogFound && (
                  <View style={styles.waveformLegend}>
                    <View style={[styles.legendDot, { backgroundColor: GREEN_MID }]} />
                    <Text style={styles.legendText}>Frog call</Text>
                    <View style={[styles.legendDot, { backgroundColor: 'rgba(0,0,0,0.18)', marginLeft: 14 }]} />
                    <Text style={styles.legendText}>Background</Text>
                  </View>
                )}
              </>
            )}

            {result.audioDuration > 0 && (
              <Text style={styles.durationText}>
                Recording length: {fmtSec(result.audioDuration)}
              </Text>
            )}

            <View style={styles.detectionActions}>
              <TouchableOpacity
                onPress={handlePlayAudio}
                style={[styles.detectionPlayBtn, isPlaying && styles.disabledButton]}
                disabled={isPlaying}
              >
                <Text style={styles.buttonText}>{isPlaying ? 'Playing...' : 'Play Audio'}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.viewResultButton}
                onPress={() => setClassifyPopup(true)}
              >
                <Text style={styles.buttonText}>
                  {noFrogFound ? 'View Details' : 'View Result'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>

{/*----------------------- UPLOAD MODAL --------------------------------------------------*/}
      <Modal transparent visible={uploadPopup} animationType="slide">
        <View style={styles.modalBackground}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Upload Audio</Text>
            <Text style={styles.modalSubtitle}>Select a frog call recording to identify</Text>

            <TouchableOpacity
              style={[styles.selectFileButton, selectedFile && styles.selectFileButtonSelected]}
              onPress={selectFile}
            >
              <Text style={styles.browseFilesText}>
                {selectedFile ? 'Change File' : 'Browse Files'}
              </Text>
            </TouchableOpacity>

            {selectedFile ? (
              <View style={styles.filePreview}>
                <Text style={styles.filePreviewIcon}>🎵</Text>
                <Text style={styles.fileText} numberOfLines={1}>File selected</Text>
              </View>
            ) : (
              <Text style={styles.fileHint}>Supported format: WAV</Text>
            )}

            <View style={styles.modalButtons}>
              <Pressable
                style={[styles.confirmButton, !selectedFile && styles.disabledButton]}
                onPress={confirmUpload}
                disabled={!selectedFile}
              >
                <Text style={styles.buttonText}>Identify</Text>
              </Pressable>
              <Pressable
                style={styles.cancelButton}
                onPress={() => { setSelectedFile(null); setUploadPopup(false); }}
              >
                <Text style={styles.buttonText}>Cancel</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

{/*---------------------- CLASSIFY MODAL --------------------------------------------------*/}
      <Modal transparent visible={classifyPopup} animationType="slide">
        <View style={styles.modalBackground}>
          <View style={styles.modalContainer}>
            <ScrollView showsVerticalScrollIndicator={false}>
              {noFrogFound ? (
                <>
                  <Text style={styles.modalTitle}>No Frog Detected</Text>
                  <Text style={styles.modalText}>
                    {noFrogReason === 'short'
                      ? 'The recording was too short to analyse. Try recording for at least 2–3 seconds.'
                      : 'No frog call was found. Try recording closer to the frog, or in a quieter environment.'}
                  </Text>
                </>
              ) : (
                <>
                  {frogImageSource && (
                    <Image source={frogImageSource} style={styles.modalImage} resizeMode="cover" />
                  )}
                  <Text style={styles.modalName}>{result?.topMatch?.name}</Text>
                  {speciesInfo?.scientific_name && (
                    <Text style={styles.modalScientificName}>{speciesInfo.scientific_name}</Text>
                  )}
                  <Text style={styles.modalConfidence}>
                    {(confidence * 100).toFixed(1)}% confidence
                  </Text>
                  <View style={styles.barTrack}>
                    <View style={[styles.barFill, { width: `${(confidence * 100).toFixed(0)}%` }]} />
                  </View>

                  {speciesInfo?.description && (
                    <Text style={styles.modalRowValue}>{speciesInfo.description}</Text>
                  )}

                  {[
                    ['Call',                speciesInfo?.callDescription],
                    ['Habitat',             speciesInfo?.habitat],
                    ['Size',                speciesInfo?.size],
                    ['Conservation Status', speciesInfo?.conservationStatus],
                  ].map(([label, value]) =>
                    value ? (
                      <View key={label} style={styles.modalCol}>
                        <Text style={styles.modalAttribute}>{label}: </Text>
                        <Text style={styles.modalRowValue}>{value}</Text>
                      </View>
                    ) : null
                  )}

                  {saved && (
                    <View style={styles.savedRow}>
                      <Text style={styles.savedLabel}>Saved to Sightings</Text>
                      <TouchableOpacity onPress={handleDontSave}>
                        <Text style={styles.dontSaveText}>Remove</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </>
              )}

              <Pressable style={styles.closeButton} onPress={() => setClassifyPopup(false)}>
                <Text style={styles.buttonText}>Close</Text>
              </Pressable>
            </ScrollView>
          </View>
        </View>
      </Modal>

{/*------------------------------------ ERROR MODAL ----------------------------------------*/}
      <Modal transparent visible={errorPopup} animationType="slide">
        <View style={styles.modalBackground}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Error</Text>
            <Text style={styles.modalText}>{errorMessage}</Text>
            <Pressable style={styles.cancelButton} onPress={() => setErrorPopup(false)}>
              <Text style={styles.buttonText}>Close</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

//----------------------STYLING---------------------------------------------------------------------------------------
const styles = StyleSheet.create({
  container:     { flex: 1 },
  scroll:        { flex: 1 },
  scrollContent: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    gap: 16,
  },

  // ── Title Card
  titleCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.88)',
    borderRadius: 20,
    paddingVertical: 22,
    paddingHorizontal: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },

  title: {
    fontSize: 30,
    fontWeight: 'bold',
    color: '#254f27',
    textAlign: 'center',
    marginBottom: 8,
  },

  subtitle: {
    fontSize: 14,
    color: '#555',
    textAlign: 'center',
  },

  // ── Buttons Card
  buttonsCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.88)',
    borderRadius: 20,
    paddingVertical: 28,
    paddingHorizontal: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    gap: 12,
  },

  recordButton: {
    width: 150,
    height: 150,
    backgroundColor: '#7c2424',
    borderRadius: 75,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },

  recordButtonActive: {
    backgroundColor: '#c34a4a',
  },

  recordButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },

  uploadButton: {
    backgroundColor: '#4A7C59',
    paddingVertical: 14,
    paddingHorizontal: 40,
    borderRadius: 25,
    minWidth: 180,
    alignItems: 'center',
  },

  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },

  disabledButton: { opacity: 0.4 },

  // ── Detection Card
  detectionCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.88)',
    borderRadius: 20,
    paddingVertical: 20,
    paddingHorizontal: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    gap: 12,
  },

  detectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#254f27',
  },

  detectionInfo: {
    fontSize: 14,
    color: '#4A7C59',
    fontWeight: '600',
  },

  detectionInfoNone: {
    color: '#888',
  },

  waveformRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 40,
    gap: 1.5,
  },

  waveBar: {
    flex: 1,
    borderRadius: 1,
  },

  waveformLegend: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 5,
  },

  legendText: {
    fontSize: 12,
    color: '#777',
  },

  durationText: {
    fontSize: 12,
    color: '#999',
  },

  progressCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.88)',
    borderRadius: 20,
    paddingVertical: 18,
    paddingHorizontal: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    gap: 10,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#254f27',
  },
  progressPct: {
    fontSize: 13,
    color: '#888',
    fontWeight: '600',
  },

  progressTrack: {
    width: '100%',
    height: 6,
    backgroundColor: 'rgba(0,0,0,0.10)',
    borderRadius: 99,
    overflow: 'hidden',
    marginTop: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: GREEN_MID,
    borderRadius: 99,
  },
  statusText: {
    fontSize: 12,
    color: GREEN_MID,
    fontWeight: '600',
    textAlign: 'center',
  },

  detectionActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  detectionPlayBtn: {
    flex: 1,
    backgroundColor: GREEN_MID,
    paddingVertical: 13,
    borderRadius: 12,
    alignItems: 'center',
  },
  viewResultButton: {
    flex: 1,
    backgroundColor: '#254f27',
    paddingVertical: 13,
    borderRadius: 12,
    alignItems: 'center',
  },

  // ── Modals
  modalBackground: {
    flex: 1,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
  },

  modalContainer: {
    width: '90%',
    maxHeight: '82%',
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 24,
    borderColor: '#d5d5d5',
    borderWidth: 0.5,
  },

  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1B5E20',
    marginBottom: 6,
  },

  modalSubtitle: {
    fontSize: 15,
    color: '#666',
    marginBottom: 20,
  },

  modalText: {
    fontSize: 16,
    color: '#333',
    lineHeight: 22,
    marginBottom: 12,
    paddingVertical: 8,
  },

  modalImage: {
    width: '100%',
    height: 180,
    borderRadius: 12,
    marginBottom: 14,
    overflow: 'hidden',
  },

  modalName: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
    color: '#1C1C1E',
  },

  modalScientificName: {
    fontStyle: 'italic',
    fontSize: 15,
    color: '#777',
    marginBottom: 8,
  },

  modalConfidence: {
    fontSize: 16,
    color: '#4A7C59',
    fontWeight: '600',
    marginBottom: 8,
  },

  barTrack: {
    height: 6,
    backgroundColor: '#E0E0E0',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 14,
  },
  barFill: { height: '100%', backgroundColor: '#4A7C59', borderRadius: 3 },

  modalCol: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 8,
    alignItems: 'flex-start',
  },

  modalAttribute: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1C1C1E',
  },

  modalRowValue: {
    fontSize: 14,
    color: '#444',
    lineHeight: 20,
    flex: 1,
  },

  savedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginVertical: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: '#F0F8F0',
    borderRadius: 10,
  },
  savedLabel:   { fontSize: 14, color: '#555' },
  dontSaveText: { fontSize: 14, color: '#B83428', fontWeight: '600' },

  selectFileButton: {
    borderWidth: 2,
    borderColor: '#4A7C59',
    borderStyle: 'dashed',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    marginBottom: 12,
  },
  selectFileButtonSelected: {
    borderColor: '#254f27',
    backgroundColor: 'rgba(74, 124, 89, 0.05)',
  },
  browseFilesText: {
    fontSize: 16,
    color: '#4A7C59',
    fontWeight: '600',
  },

  filePreview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  filePreviewIcon: { fontSize: 18 },
  fileText: {
    fontSize: 14,
    color: '#555',
    flex: 1,
  },
  fileHint: {
    fontSize: 13,
    color: '#999',
    textAlign: 'center',
    marginBottom: 12,
  },

  modalButtons: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
  },

  confirmButton: {
    flex: 1,
    backgroundColor: '#254f27',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },

  cancelButton: {
    flex: 1,
    backgroundColor: '#7c2424',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },

  closeButton: {
    backgroundColor: '#254f27',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 16,
  },
});
