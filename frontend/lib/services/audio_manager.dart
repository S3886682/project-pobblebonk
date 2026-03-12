// In a new file called audio_manager.dart
import 'package:audioplayers/audioplayers.dart';

class AudioManager {
  static final AudioManager _instance = AudioManager._internal();

  factory AudioManager() {
    return _instance;
  }

  AudioManager._internal();

  AudioPlayer? _player;

  Future<AudioPlayer> getPlayer() async {
    if (_player == null) {
      _player = AudioPlayer();
    }
    return _player!;
  }

  Future<void> release() async {
    await _player?.stop();
    await _player?.dispose();
    _player = null;
  }
}
