
// Elements: 
// two buttons - record with "record" text  and upload "upload file". 
// Title "Identify Frog Call". 
// Image background of frog prints. 
// Nav bar at bottom. 
// modal popups for frog classification, error/frog not found, upload file
// function: 
// record button when pressed checks for app mic access.
// If available turns to "stop" text, inputs audio.
// If unavailable, pulls error modal to alert
// once pressed for second time: "stop", activates cladsify function. 
// after classifying, if frog found -> pull up classify modal with frog info. 
// if not found or other error, previous error popup triggerred.
// Upload button -> allow user to select a video from their phone (need to specify file types?)
// upload file modal -> appear after clicking "upload file" button. allows user to select file, displays selected file and asks for confirmation.
// uploaded file processed -> classify process begins, if found -> pull up classify modal with frog info. 
// if not found or other error, previous error popup triggerred.
//last touches - image to frog identification modal (same system as search page modal), update supported file formats, 

import React, {useState } from "react";
import {View, Text, TouchableOpacity, StyleSheet, Modal, Pressable, Image, ImageBackground} from "react-native";
import { useClassifier } from '../hooks/useClassifier'; //to pull classification model
import { useRecorder } from '../hooks/useRecorder';
import { filePickerService } from "../services/filePickerService";

export function ClassifyScreen() {
  const { isRecording, startRecording, stopRecording } = useRecorder();

  //Modals
  const [uploadPopup, setUploadPopup] = useState(false);
  const [classifyPopup, setClassifyPopup] = useState(false);
  const [errorPopup, setErrorPopup] = useState(false);
  const [isLoading, setLoading] = useState(false);

  const { classify } = useClassifier();
  const [result, setResult] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");

//----------------------- RECORD and CLASSIFY AUDIO --------------------------------------------------

  const recordPress = async () => {
  try {
    if (isRecording) {
      const audioFile = await stopRecording();
      setLoading(true); //enables loading popup
      const res = await classify(audioFile);
      setLoading(false); //closes loading popup
      if (res) {
        setResult(res);
        setClassifyPopup(true);
      
      } else {
        setErrorMessage("Frog not found.");
        setErrorPopup(true);
      }
    } else {
      const success = await startRecording();
      if (!success) {
        setErrorMessage("Please enable microphone access");
        setErrorPopup(true);
      }
    }
  } catch {
    setLoading(true); 
    setErrorMessage("Recording failed.");
    setErrorPopup(true);
  }
};

//----------------------- UPLOAD FILE SELECTION --------------------------------------------------
  //open upload modal
  const uploadPress = () => {
    setUploadPopup(true);
  };

  //pick upload file and ctach errors
  const selectFile = async () => {
  try {
    const audioFile =
      await filePickerService.pickAudioFile();

    if (audioFile) {
      setSelectedFile(audioFile);
    }
  } catch {
    setErrorMessage(
      "Unable to select file."
    );
    setErrorPopup(true);
  }
};

// confirm upload file and ensure file exists
  const confirmUpload = async () => {
    try {
      if (!selectedFile) {
        setErrorMessage(
          "No file selected."
        );
        setErrorPopup(true);
        return;
      }

      setUploadPopup(false);

      setLoading(true);  
      const res = await classify(selectedFile);
      setLoading(false); 

      if (res) {
        setResult(res);
        setClassifyPopup(true);
      } else {
        setErrorMessage(
          "Frog not found."
        );
        setErrorPopup(true);
      }
    } catch {
      setLoading(false); 
      setErrorMessage(
        "Classification failed."
      );
      setErrorPopup(true);
    }
  };

//----------------------- PAGE BUILD --------------------------------------------------

  return (
    <ImageBackground
          source={require('../assets/background_image.png')}
          style={styles.background}
          resizeMode="cover"
          >
      <View style={styles.overlay}>
        <Text style={styles.title}>Identify Frog Call</Text>

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

{/*----------------------- LOADING MODAL --------------------------------------------------*/}
<Modal transparent visible={isLoading} animationType="fade">
  <View style={styles.modalBackground}>
    <View style={styles.loadingContainer}>
      <Image
        source={require('../assets/frog-spin.gif')}
        style={styles.loadingGif}
      />
      <Text style={styles.loadingTitle}>Finding Frog...</Text>
    </View>
  </View>
</Modal>

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

  closeButton: {
    backgroundColor: "#254f27",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
  },

  uploadButton: {
    width: 220,
    height:100,
    backgroundColor: "#254f27",
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: 'center',
    position: 'absolute',
    top: 450,
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

  modalConfidence: {
    fontWeight: 'bold',
    fontSize: 15,
    paddingLeft: 8,
    paddingTop: 8,
  },

  modalAttribute: {
  fontWeight: 'bold',
  textAlign: 'left',
  },

  modalRow: {
    flexDirection: 'row',
    marginTop: 12,
    marginBottom: 8,
  },

  modalRowValue: {
    flexShrink: 1,
    textAlign: 'left',
  },

  modalCol: {
    flexDirection: 'column',
    marginTop: 6,
    marginBottom: 6,
  },

//Upload Modal
modalSubtitle: {
    fontSize: 14,
    color: "#4a4a4a",
    marginBottom: 20,
  },

  selectFileButtonSelected: {
    backgroundColor: "#538356",
    borderColor: "#0c2a0e",
    borderWidth: 2,
  },

  browseFilesText: {
    color: "white",
    fontSize: 20,
  },

  selectFileButton: {
    backgroundColor: "#a8a8a8",
    borderColor: "#292929",
    borderWidth: 2,
    paddingVertical: 14,
    borderRadius: 2,
    alignItems: "center",
    marginBottom: 16,
  },

  filePreview: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#c4c4c4",
    borderRadius: 10,
    padding: 12,
    marginVertical: 15,
    marginBottom:18,
    borderWidth: 1,
    borderColor: "#565656",
  },

  filePreviewIcon: {
    fontSize: 20,
    marginRight: 10,
  },

  fileText: {
    flex: 1,
    color: "#000000",
    fontWeight: "600",
    fontSize: 14,
  },

  fileHint: {
    fontSize: 12,
    color: "#747474",
    textAlign: "center",
    marginVertical: 12,
  },

  disabledButton: {
    backgroundColor: "#A5D6A7",
    opacity: 0.6,
  },

  modalButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
  },

  confirmButton: {
    backgroundColor: "#254f27",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
  },

  cancelButton: {
    backgroundColor: "#c34a4a",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
});