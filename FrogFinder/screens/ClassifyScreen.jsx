import { useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { createAudioPlayer } from 'expo-audio';
import { useRecorder } from '../hooks/useRecorder';
import { useClassifier } from '../hooks/useClassifier';
import { filePickerService } from '../services/filePickerService';
import { Theme } from '../config/Theme';

export const ClassifyScreen = () => {
  const { isRecording, startRecording, stopRecording } = useRecorder();
  const { classify, classification, loading } = useClassifier();

  // Holds the URI of the last recorded or uploaded file so it can be played back
  const [audioUri, setAudioUri] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);

  // These functions handle backend logic for recording and file upload, and then call classify() with the resulting audio file to get classification results
  const handleStopRecording = async () => {
    const audioFile = await stopRecording();
    setAudioUri(audioFile);
    await classify(audioFile);
  };

  const handleUploadFile = async () => {
    const audioFile = await filePickerService.pickAudioFile();
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

  // This is a simplified UI for demonstration purposes. In a real app, you would want to display the classification results in a more user-friendly way, and handle loading and error states appropriately.
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Record or Upload Frog Call</Text>

      <Text>Press record or upload an audio file to classify</Text>

      <TouchableOpacity onPress={recordButtonPress} style={styles.button}>
        <Text style={styles.buttonText}>{recordButtonText}</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={handleUploadFile} style={styles.button}>
        <Text style={styles.buttonText}>Upload File</Text>
      </TouchableOpacity>

      {/* Play button shown only when there is an audio file to test */}
      {audioUri && (
        <TouchableOpacity onPress={handlePlayAudio} style={styles.playButton} disabled={isPlaying}>
          <Text style={styles.buttonText}>{isPlaying ? 'Playing...' : 'Play Audio'}</Text>
        </TouchableOpacity>
      )}

      {loading && <ActivityIndicator color={Theme.colors.primary} size="large" style={{ marginVertical: 20 }} />}

      {classification && (
        <View>
          <Text>{classification.topMatch.name}</Text>
          <Text>{classification.topMatch.scientificName}</Text>
          <Text>{(classification.topMatch.confidence * 100).toFixed(1)}% confidence</Text>

          <Text>Description</Text>
          <Text>{classification.topMatch.description}</Text>

          <Text>Habitat</Text>
          <Text>{classification.topMatch.habitat}</Text>

          <Text>Size</Text>
          <Text>{classification.topMatch.size}</Text>

          <Text>Call Description</Text>
          <Text>{classification.topMatch.callDescription}</Text>

          <Text>Conservation Status</Text>
          <Text>{classification.topMatch.conservationStatus}</Text>

          <Text>Could also be:</Text>
          {classification.alternatives.map((alt, index) => (
            <View key={index}>
              <Text>{alt.name}</Text>
              <Text>{(alt.confidence * 100).toFixed(1)}% confidence</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
};

const styles = {
  container: {
    flex: 1,
    padding: Theme.spacing.md,
  },
  title: {
    ...Theme.typography.h2,
    marginBottom: Theme.spacing.md,
    color: Theme.colors.text,
  },
  button: {
    backgroundColor: Theme.colors.primary,
    paddingVertical: Theme.spacing.md,
    paddingHorizontal: Theme.spacing.lg,
    borderRadius: 8,
    marginVertical: Theme.spacing.sm,
    alignItems: 'center',
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
    color: Theme.colors.surface,
    fontWeight: 'bold',
  },
};
