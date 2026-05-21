import * as DocumentPicker from 'expo-document-picker';

// Accepted MIME types passed to the document picker to filter the file browser
const SUPPORTED_MIME_TYPES = ['audio/mpeg', 'audio/mp4', 'audio/x-m4a', 'audio/wav', 'audio/wave'];

// Extensions used for a secondary validation check after the file is chosen
const SUPPORTED_EXTENSIONS = ['.mp3', '.m4a', '.wav'];

class FilePickerService {
    async pickAudioFile() {
        // Open the system file picker filtered to supported audio types
        const result = await DocumentPicker.getDocumentAsync({
            type: SUPPORTED_MIME_TYPES,
            copyToCacheDirectory: true,
        });

        // User dismissed the picker without selecting a file
        if (result.canceled) {
            return null;
        }

        const asset = result.assets[0];

        // Extract the file extension so we can validate it
        let ext = '';
        if (asset.name) {
            ext = asset.name.slice(asset.name.lastIndexOf('.')).toLowerCase();
        }

        // Reject files that are not mp3, m4a, or wav
        if (!SUPPORTED_EXTENSIONS.includes(ext)) {
            throw new Error(`Unsupported file type "${ext}". Please choose an mp3, m4a, or wav file.`);
        }

        return asset.uri;
    }
}

export const filePickerService = new FilePickerService();
