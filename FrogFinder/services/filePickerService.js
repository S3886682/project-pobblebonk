import * as DocumentPicker from 'expo-document-picker';

const SUPPORTED_MIME_TYPES = ['audio/wav', 'audio/wave', 'audio/x-wav'];
const SUPPORTED_EXTENSIONS = ['.wav'];

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

        if (!SUPPORTED_EXTENSIONS.includes(ext)) {
            throw new Error(`Unsupported file type "${ext}". Please choose a WAV file.`);
        }

        return asset.uri;
    }
}

export const filePickerService = new FilePickerService();
