import 'dart:async';

import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:flutter/material.dart';
import 'dart:io';
import 'package:audioplayers/audioplayers.dart';
import 'package:flutter_app/services/frog_classification_service.dart';
import 'package:flutter_app/services/frog_service.dart';
import 'package:flutter_app/models/frog_model.dart';
import 'package:flutter_app/widgets/frog_details_widget.dart';
import 'package:flutter_app/services/audio_manager.dart';

class AudioPreviewPage extends StatefulWidget {
  final String filePath;
  final String? encodedFile;

  const AudioPreviewPage({super.key, required this.filePath, this.encodedFile});

  @override
  State<AudioPreviewPage> createState() => _AudioPreviewPageState();
}

class _AudioPreviewPageState extends State<AudioPreviewPage> {
  // AUDIO PLAYER VARIABLES
  AudioPlayer? _audioPlayer;
  bool _isPlaying = false;
  Duration _position = Duration.zero;
  Duration _duration = Duration.zero;

  Timer? _uiUpdateTimer;
  // ANALYSIS VARIABLES
  bool _isAnalyzing = false;
  PredictionResult? _predictionResult;
  double _uploadProgress = 0.0;

  final _audioManager = AudioManager();

  // FROG DATA
  Frog? _matchedFrog;
  bool _isLoadingFrog = false;

  @override
  void initState() {
    super.initState();
    _initialiseAudioPlayer();

    // Start a UI update timer as backup for Android.
    _uiUpdateTimer = Timer.periodic(Duration(milliseconds: 500), (timer) async {
      if (_audioPlayer != null && _isPlaying) {
        final position = await _audioPlayer!.getCurrentPosition();
        if (position != null && mounted) {
          setState(() {
            _position = position;
          });
        }
      }
    });
  }

  void _setupEventListeners() {
    // Remove existing listeners
    _audioPlayer!.onPlayerStateChanged.listen(null);
    _audioPlayer!.onDurationChanged.listen(null);
    _audioPlayer!.onPositionChanged.listen(null);
    _audioPlayer!.onPlayerComplete.listen(null);

    // Player state changes
    _audioPlayer!.onPlayerStateChanged.listen((state) {
      if (mounted) {
        setState(() {
          _isPlaying = state == PlayerState.playing;
          print("Player state changed: ${state.name}");
        });
      }
    });

    // Duration changes
    _audioPlayer!.onDurationChanged.listen((newDuration) {
      if (mounted && newDuration.inMilliseconds > 0) {
        setState(() {
          _duration = newDuration;
          print("Duration changed: ${_formatDuration(_duration)}");
        });
      }
    });

    // Position changed
    _audioPlayer!.onPositionChanged.listen((newPosition) {
      if (mounted) {
        setState(() {
          _position = newPosition;
        });
      }
    });

    // Playback completed
    _audioPlayer!.onPlayerComplete.listen((_) async {
      if (!mounted) return;
      setState(() {
        _isPlaying = false;
        _position = Duration.zero;
      });
      // Resets the player when the audio finishes playing
      if (kIsWeb) {
        await _audioPlayer!.setSource(UrlSource(widget.filePath));
      } else {
        await _audioPlayer!.setSourceDeviceFile(widget.filePath);
      }
    });
  }

  Future<void> _initialiseAudioPlayer() async {
    _audioPlayer = await _audioManager.getPlayer();
    try {
      print("Initialising audio player with file ${widget.filePath}");

      if (kIsWeb) {
        // On web, the filePath is actually a blob URL
        _audioPlayer?.setSource(UrlSource(widget.filePath));
      } else {
        // Check if file exists
        final file = File(widget.filePath);
        final exists = await file.exists();
        if (exists) {
          final fileSize = await file.length();
          print("Audio file exists: Yes, size: $fileSize bytes");

          // On mobile/desktop, use file path
          await _audioPlayer?.setSourceDeviceFile(widget.filePath);
        } else {
          print("Audio file does not exist ${widget.filePath}");
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text('Unable to play file: File not found')),
          );
        }
      }

      // Reset state variables
      setState(() {
        _position = Duration.zero;
        _duration = Duration.zero;
        _isPlaying = false;
      });

      _setupEventListeners();
    } catch (e) {
      print("Error initialising audio player: $e");
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error playing audio: ${e.toString()}')),
        );
      }
    }
  }

  String _formatDuration(Duration d) {
    String twoDigits(int n) => n.toString().padLeft(2, '0');
    return "${twoDigits(d.inMinutes)}:${twoDigits(d.inSeconds % 60)}";
  }

  @override
  void dispose() {
    _audioManager.release();
    _uiUpdateTimer?.cancel();
    super.dispose();
  }

  void _playPauseAudio() async {
    if (_audioPlayer == null) {
      await _initialiseAudioPlayer();
    }

    if (_isPlaying) {
      await _audioPlayer?.pause();
    } else {
      // If at end, go to beginning
      if (_position >= _duration && _duration > Duration.zero) {
        await _audioPlayer?.seek(Duration.zero);
      }
      await _audioPlayer?.resume();
    }
  }

  Future<void> _performAnalysis() async {
    setState(() {
      _isAnalyzing = true;
      _predictionResult = null;
      _uploadProgress = 0.0;
    });

    try {
      print("Analysing file: ${widget.filePath}");
      PredictionResult? result;
      if (!kIsWeb) {
        final file = File(widget.filePath);
        final exists = await file.exists();
        print("File exists: $exists");
        if (exists) {
          final size = await file.length();
          print("File size: $size bytes");
        }
        result = await FrogClassificationService.predictFromFilePath(
          widget.filePath,
        );
        if (mounted) {
          setState(() {
            _predictionResult = result;
            _isAnalyzing = false;
          });
          if (result == null) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(content: Text('Analysis failed: No result returned')),
            );
          } else {
            _loadFrogDetails(result.finalPrediction);
          }
        }
      }else{
        final result = await FrogClassificationService.predictFromBytes(widget.encodedFile, widget.filePath);
        setState(() {
          _predictionResult = result;
        });

        if (result != null && result.finalPrediction.isNotEmpty) {
          await _loadFrogDetails(result.finalPrediction);
        }
      }
    } catch (e) {
      print('Analysis failed: $e');
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Analysis failed: ${e.toString()}')),
        );
        setState(() {
          _isAnalyzing = false;
        });
      }
    }
  }

  // Load Frog Details based on prediction
  Future<void> _loadFrogDetails(String frogName) async {
    setState(() {
      _isLoadingFrog = true;
    });

    try {
      final frog = await FrogService.findFrogByName(frogName);
      setState(() {
        _matchedFrog = frog;
        print(_matchedFrog?.imageFileName);
      });
    } catch (e) {
      print('Error loading frog details: $e');
    } finally {
      setState(() {
        _isLoadingFrog = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Preview Audio')),
      body: Padding(
        padding: const EdgeInsets.all(20.0),
        child: SingleChildScrollView(
          child: Column(
            children: [
              const Text("🎧 Preview your uploaded audio"),
              const SizedBox(height: 30),
              // === AUDIO PLAYER SECTION ===
              Card(
                elevation: 3,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Padding(
                  padding: EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        "Audio Preview",
                        style: Theme.of(context).textTheme.titleLarge,
                      ),
          
                      SizedBox(height: 20),
          
                      //Audio Progress bar
                      SliderTheme(
                        data: SliderTheme.of(context).copyWith(
                          thumbShape: RoundSliderThumbShape(
                            enabledThumbRadius: 8,
                          ),
                          trackHeight: 4,
                          thumbColor: Colors.teal,
                          activeTrackColor: Colors.teal,
                          inactiveTrackColor: Colors.grey,
                        ),
                        child: Slider(
                          min: 0,
                          max:
                              _duration.inMilliseconds > 0
                                  ? _duration.inSeconds.toDouble()
                                  : 1.0,
                          value: _position.inSeconds.toDouble().clamp(
                            0,
                            _duration.inMilliseconds > 0
                                ? _duration.inSeconds.toDouble()
                                : 0.0,
                          ),
                          onChanged:
                              _duration.inMilliseconds == 0
                                  ? null
                                  : (value) {
                                    final position = Duration(
                                      seconds: value.toInt(),
                                    );
                                    _audioPlayer?.seek(position);
                                  },
                        ),
                      ),
          
                      // Time Indicatiors
                      Padding(
                        padding: EdgeInsets.symmetric(horizontal: 12),
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text(
                              _formatDuration(_position),
                              style: TextStyle(fontSize: 12, color: Colors.grey),
                            ),
                            Text(
                              _formatDuration(_duration),
                              style: TextStyle(fontSize: 12, color: Colors.grey),
                            ),
                          ],
                        ),
                      ),
                      SizedBox(height: 16),
          
                      //Playback Controls
                      Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          //Back 5 seconds
                          IconButton(
                            icon: Icon(Icons.replay_5),
                            iconSize: 36,
                            color: Colors.grey,
                            onPressed:
                                _audioPlayer == null
                                    ? null
                                    : () {
                                      _audioPlayer?.seek(
                                        Duration(
                                          seconds: (_position.inSeconds - 5)
                                              .clamp(0, _duration.inSeconds),
                                        ),
                                      );
                                    },
                          ),
                          SizedBox(width: 12),
          
                          // Play/Pause Button
                          Container(
                            decoration: BoxDecoration(
                              color: Colors.teal,
                              shape: BoxShape.circle,
                            ),
                            child: IconButton(
                              icon: Icon(
                                _isPlaying ? Icons.pause : Icons.play_arrow,
                              ),
                              iconSize: 42,
                              color: Colors.white,
                              onPressed: _playPauseAudio,
                            ),
                          ),
          
                          SizedBox(width: 12),
          
                          // Forward 5 seconds button
                          IconButton(
                            icon: Icon(Icons.forward_5),
                            iconSize: 36,
                            color: Colors.grey,
                            onPressed: () {
                              _audioPlayer?.seek(
                                Duration(
                                  seconds: (_position.inSeconds + 5).clamp(
                                    0,
                                    _duration.inSeconds,
                                  ),
                                ),
                              );
                            },
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              ),
              SizedBox(height: 24),
          
              // === ANALYSIS SECTION ===
              // Analysis Button
              ElevatedButton(
                onPressed: _isAnalyzing ? null : _performAnalysis,
                child:
                    _isAnalyzing
                        ? Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            SizedBox(
                              width: 20,
                              height: 20,
                              child: CircularProgressIndicator(strokeWidth: 2),
                            ),
                            SizedBox(width: 10),
                            Text(
                              _uploadProgress > 0
                                  ? "Uploading... ${(_uploadProgress * 100).toStringAsFixed(0)}%"
                                  : "Analysing...",
                            ),
                          ],
                        )
                        : Text("Analyse Recording"),
              ),
              SizedBox(height: 12),
              Divider(height: 10),
              SizedBox(height: 12),
              // === RESULTS SECTION ===
              if (_predictionResult != null)
                SingleChildScrollView(
                  child: Column(
                    children: [
                      //Loading Indicator or no results message
                      if (_isLoadingFrog)
                        Center(
                          child: Column(
                            children: [
                              CircularProgressIndicator(color: Colors.teal),
                              SizedBox(height: 12),
                              Text('Loading frog information...'),
                            ],
                          ),
                        )
                      else if (_matchedFrog == null)
                        Card(
                          child: Padding(
                            padding: EdgeInsets.all(16),
                            child: Column(
                              children: [
                                Icon(
                                  Icons.warning_amber,
                                  size: 48,
                                  color: Colors.orange,
                                ),
                                SizedBox(height: 8),
                                Text(
                                  'Identified: ${_predictionResult!.finalPrediction}',
                                  style: TextStyle(
                                    fontSize: 18,
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                                SizedBox(height: 8),
                                Text(
                                  'Details for this frog species are not available.',
                                  textAlign: TextAlign.center,
                                ),
                              ],
                            ),
                          ),
                        )
                      else
                        FrogDetailsWidget(
                          frog: _matchedFrog!,
                          confidenceLevel: _predictionResult!.averageConfidence,
                        ),
                    ],
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }
}
