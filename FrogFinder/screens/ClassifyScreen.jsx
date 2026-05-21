import { useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { createAudioPlayer } from 'expo-audio';
import { useRecorder } from '../hooks/useRecorder';
import { filePickerService } from "../services/filePickerService";

export function ClassifyScreen() {
  const { isRecording, startRecording, stopRecording } = useRecorder();

  // Holds the URI of the last recorded or uploaded file so it can be played back
  const [audioUri, setAudioUri] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);

  // These functions handle backend logic for recording and file upload, and then call classify() with the resulting audio file to get classification results
  const handleStopRecording = async () => {
    const audioFile = await stopRecording();
    setAudioUri(audioFile);
    await classify(audioFile);
  };

  //pick upload file and ctach errors
  const selectFile = async () => {
  try {
    const audioFile =
      await filePickerService.pickAudioFile();

    if (audioFile) {
      setAudioUri(audioFile);
      await classify(audioFile);
    }
  };

  // Creates a temporary player, plays the file once, then releases it
  const handlePlayAudio = async () => {
    if (!audioUri || isPlaying) {
      return;
    }

    setIsPlaying(true);
    const player = createAudioPlayer(audioUri);

    const subscription = player.addListener('playbackStatusUpdate', (status) => {
      if (status.didJustFinish) {
        subscription.remove();
        player.release();
        setIsPlaying(false);
      }
    });

    player.play();
  };

  const recordButtonText = isRecording ? 'Stop Recording' : 'Start Recording';
  const recordButtonPress = isRecording ? handleStopRecording : startRecording;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Record or Upload Frog Call</Text>

      <Text>Press record or upload an audio file to classify</Text>

{/*----------------------- RECORD BUTTON ----------------------------------------------------*/}
        <TouchableOpacity
          style={[styles.recordButton, isRecording && styles.recordButtonActive]}
          onPress={recordPress}
        >
          <Text style={styles.buttonText}>
            {isRecording ? "Stop" : "Record"}
          </Text>
        </TouchableOpacity>

{/*----------------------- UPLOAD BUTTON --------------------------------------------------*/}
        <TouchableOpacity
          style={styles.uploadButton}
          onPress={uploadPress}
        >
          <Text style={styles.buttonText}>Upload File</Text>
        </TouchableOpacity>
      </View>

      {/* Play button shown only when there is an audio file to test */}
      {audioUri && (
        <TouchableOpacity onPress={handlePlayAudio} style={styles.playButton} disabled={isPlaying}>
          <Text style={styles.buttonText}>{isPlaying ? 'Playing...' : 'Play Audio'}</Text>
        </TouchableOpacity>
      )}

      {loading && <ActivityIndicator color={Theme.colors.primary} size="large" style={{ marginVertical: 20 }} />}

{/*----------------------- UPLOAD MODAL --------------------------------------------------*/}
      <Modal
        transparent
        visible={uploadPopup}
        animationType="slide"
      >
        <View style={styles.modalBackground}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Upload Audio</Text>
            <Text style={styles.modalSubtitle}>Select a frog call recording to identify</Text>

            <TouchableOpacity
              style={[styles.selectFileButton, selectedFile && styles.selectFileButtonSelected]}
              onPress={selectFile}
            >

              <Text>{'\n'}</Text>
              <Text style={styles.browseFilesText}>
                {selectedFile ? "Change File" : "Browse Files"}
              </Text>
              <Text>{'\n'}</Text>
            </TouchableOpacity>

            {selectedFile && (
              <View style={styles.filePreview}>
                <Text style={styles.filePreviewIcon}>🎵</Text>
                <Text style={styles.fileText} numberOfLines={1}>
                  {selectedFile.fileName || "Selected File"}
                </Text>
              </View>
            )}

            {!selectedFile && (
              <Text style={styles.fileHint}>Supported formats: ??, WAV, M4A</Text>
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
                onPress={() => {
                  setUploadPopup(false);
                  setSelectedFile(null);
                }}
              >
                <Text style={styles.buttonText}>Cancel</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

{/*---------------------- CLASSIFY MODAL --------------------------------------------------*/}
      <Modal
        transparent
        visible={classifyPopup}
        animationType="slide"
      >
        <View style={styles.modalBackground}>
          <View style={styles.modalContainer}>

            <Text style={styles.modalName}>Frog: {result?.topMatch?.name}</Text>
            <Text style={styles.modalScientificName}>{result?.topMatch?.scientificName}</Text>
            <Text style={styles.modalConfidence}>{((result?.topMatch?.confidence ?? 0) * 100).toFixed(1)}% confidence</Text>
            <Text style={styles.modalAttribute}> ------------------------------------------ </Text>

            <Text style={styles.modalRowValue}>{result?.topMatch?.description}</Text>
            
            <View style={styles.modalCol}>
              <Text style={styles.modalAttribute}>Call: </Text>
              <Text style={styles.modalRowValue}>{result?.topMatch?.callDescription}</Text>
            </View>

            <View style={styles.modalCol}>
              <Text style={styles.modalAttribute}>Habitat: </Text>
              <Text style={styles.modalRowValue}>{result?.topMatch?.habitat}</Text>
            </View>

            <View style={styles.modalCol}>
              <Text style={styles.modalAttribute}>Size: </Text>
              <Text style={styles.modalRowValue}>{result?.topMatch?.size}</Text>
            </View>

            <View style={styles.modalCol}>
              <Text style={styles.modalAttribute}>Conservation Status: </Text>
              <Text style={styles.modalRowValue}>{result?.topMatch?.conservationStatus}</Text>
            </View>
            
            <Text></Text>
            
            <Pressable
              style={styles.closeButton}
              onPress={() =>
                setClassifyPopup(false)
              }
            >
              <Text style={styles.buttonText}>Close</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

{/*------------------------------------ ERROR MODAL------------------------------------------------------------------------*/}

      <Modal
        transparent
        visible={errorPopup}
        animationType="slide"
      >
        <View style={styles.modalBackground}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Error</Text>

            <Text style={styles.modalText}>
              {errorMessage}
            </Text>

            <Pressable
              style={styles.cancelButton}
              onPress={() =>
                setErrorPopup(false)
              }
            >
              <Text style={styles.buttonText}>Close</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
      </ImageBackground>
  );
}

//----------------------STYLING---------------------------------------------------------------------------------------
//General
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  background: {
  flex: 1,
  },

  overlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },

  title: {
    fontSize: 34,
    fontWeight: "bold",
    color: '#254f27',
    marginBottom: 40,
    position: 'absolute',
    top: 50,
  },

//Buttons
  recordButton: {
    width: 150,
    height: 150,
    backgroundColor: "#7c2424",
    borderRadius: 100,
    alignItems: "center",
    justifyContent: 'center',
    marginBottom: 20,
    paddingVertical: 35,
    position: 'absolute',
    top: 200,
  },

  recordButtonActive: {
    width: 150,
    height: 150,
    backgroundColor: "#c34a4a",
    borderRadius: 100,
    alignItems: "center",
    justifyContent: 'center',
    marginBottom: 20,
    paddingVertical: 35,
    position: 'absolute',
    top: 200,
  },
  playButton: {
    backgroundColor: Theme.colors.secondary,
    paddingVertical: Theme.spacing.md,
    paddingHorizontal: Theme.spacing.lg,
    borderRadius: 8,
    marginVertical: Theme.spacing.sm,
    alignItems: 'center',
  },
  buttonText: {
    color: "white",
    fontSize: 18,
    fontWeight: "bold",
  },

//Loading Modal
loadingContainer: {
  borderRadius: 20,
  padding: 40,
  alignItems: "center",
  justifyContent: "center",
},

loadingTitle: {
  fontSize: 20,
  fontWeight: "bold",
  color: "#113413",
  marginBottom: 8,
},

loadingGif: {
  width: 100,
  height: 100,
  marginBottom: 16,
},

//Classify Modal - general styles apply to error message also
  modalBackground: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    justifyContent: "center",
    alignItems: "center",
  },

  modalContainer: {
    width: "90%",
    backgroundColor: "white",
    borderRadius: 20,
    padding: 24,
    borderColor: "#d5d5d5",
    borderWidth: 0.5,
  },

  modalTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#1B5E20",
  },

  modalText: {
    fontSize: 16,
    padding: 15,
    color: "#333",
  },

  modalName: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 5,
  },

  modalScientificName: {
    fontStyle: 'italic',
    fontSize: 15,
    paddingLeft: 8,
    paddingTop: 8,
  },
};
