import * as DocumentPicker from 'expo-document-picker';

class FilePickerService {
  async pickAudioFile() {
    const result = await DocumentPicker.getDocumentAsync({
      type: ['audio/*'],
      copyToCacheDirectory: true,
    });

    if (result.canceled) return null;

    const file = result.assets[0];

    return {
      uri: file.uri,
      fileName: file.name,
      mimeType: file.mimeType,
    };
  }
}

export const filePickerService = new FilePickerService();