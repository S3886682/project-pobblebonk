import 'dart:async';
import 'package:flutter/material.dart';
import 'package:file_picker/file_picker.dart';
import 'package:record/record.dart';
import 'package:flutter_app/data/constants.dart';
import 'package:flutter_app/views/pages/audio_preview_page.dart';
import 'dart:io';
import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:path_provider/path_provider.dart';
import 'dart:typed_data';
import 'dart:convert';

class AudioPage extends StatefulWidget {
  const AudioPage({super.key});

  @override
  State<AudioPage> createState() => _AudioPageState();
}

class _AudioPageState extends State<AudioPage> {
  final AudioRecorder _recorder = AudioRecorder();
  bool _isRecording = false;
  Duration _recordDuration = Duration.zero;
  Timer? _timer;

  @override
  void dispose() {
    _timer?.cancel();
    _recorder.dispose();
    super.dispose();
  }

  Future<bool> _requestPermissions() async {
    bool hasPermission = await _recorder.hasPermission();

    if (!hasPermission) {
      showDialog(
        context: context,
        builder:
            (context) => AlertDialog.adaptive(
              title: Text('Microphone Permission Required'),
              content: Text(
                'FrogFinder needs access to your microphone to record frog sounds for identification.',
              ),
              actions: [
                TextButton(
                  onPressed: () => Navigator.pop(context),
                  child: Text('OK'),
                ),
              ],
            ),
      );

      hasPermission = await _recorder.hasPermission();
    }
    return hasPermission;
  }

  Future<void> _pickAndProcessAudioFile() async {
    try {
      // Launch File Picker
      FilePickerResult? result = await FilePicker.platform.pickFiles(
        type: FileType.custom,
        allowedExtensions: ['mp3', 'wav', 'm4a'],
        withData: kIsWeb
      );

      if (result != null && result.files.single.path != null) {
        String filePath = result.files.single.path!;
        print("Selected file: $filePath");
        
        if (kIsWeb) {
          Uint8List fileBytes = result.files.single.bytes!;
          String encodedFile = base64Encode(fileBytes);

          Navigator.push(
            context,
            MaterialPageRoute(
              builder:
                (context) => AudioPreviewPage(filePath: filePath, encodedFile: encodedFile,),
          )
          );
        }
        else{
        // Check if file exists
        final file = File(filePath);
        if (await file.exists()) {
          final fileSize = await file.length();
          print("File size: $fileSize bytes");

          if (fileSize > 0) {
            // Navigate to preview page with selected file
            Navigator.push(
              context,
              MaterialPageRoute(
                builder: (context) => AudioPreviewPage(filePath: filePath),
              ),
            ).then((_) {
              setState(() {
                _isRecording = false;
                _recordDuration = Duration.zero;
              });
            });
          } else {
            print("Selected file is empty");
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(content: Text('Selected file does not exist')),
            );
          }
        } else {
          print("No file selected ");
          ScaffoldMessenger.of(
            context,
          ).showSnackBar(SnackBar(content: Text('No file selected')));
        }
      }
    }} catch (e) {
      print("Error selecting file: $e");
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Error selecting file: ${e.toString()}')),
      );
    }
  }

  void _startRecording() async {
    if (_isRecording) {
      await _stopRecording(navigateToPreview: false);
    }

    if (await _recorder.hasPermission()) {
      try {
        String path;
        if(!kIsWeb){
        final directory = await getApplicationDocumentsDirectory();
        final fileName = '${DateTime.now().millisecondsSinceEpoch}.m4a';
        path = '${directory.path}/$fileName';

        print("Recording to path: $path");
      }
      else{path = '${DateTime.now().millisecondsSinceEpoch}.m4a';}

      await _recorder.start(
          RecordConfig(encoder: AudioEncoder.aacLc),
          path: path,
        );

        _startTimer();
        setState(() => _isRecording = true);
      }

       catch (e) {
        print("Error starting recording: $e");
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to start recording: ${e.toString()}')),
        );
      }
    } else {
      print("Recording permission not granted");
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Microphone permission is required')),
      );
    }
  }

  Future _stopRecording({bool navigateToPreview = true}) async {
    try {
      _timer?.cancel();
      final path = await _recorder.stop();

      setState(() {
        _isRecording = false;
        _recordDuration = Duration.zero;
      });

      if (path != null) {
        print("Recording saved to: $path");

        // Check if file exists
        if (await File(path).exists()) {
          if (!kIsWeb) {
            Navigator.push(
              context,
              MaterialPageRoute(
                builder: (context) => AudioPreviewPage(filePath: path),
              ),
            ).then((_) {
              setState(() {});
            });
        }else{
            Navigator.push(
              context,
              MaterialPageRoute(
                builder: (context) => AudioPreviewPage(filePath: path, encodedFile: path),
              ),
            );
        }}else {
          print("Recorded file doesn't exist : $path");
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text('Recording failed: File not found')),
          );
        }
      } else {
        print("Failed to get recording path");
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Recording failed: No file path')),
        );
      }
    } catch (e) {
      print(" Error stopping recording: $e");
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Error stopping recording ${e.toString()}')),
      );
    }
  }

  void _startTimer() {
    _recordDuration = Duration.zero;
    _timer = Timer.periodic(Duration(seconds: 1), (timer) {
      setState(() {
        _recordDuration += Duration(seconds: 1);
      });
    });
  }

  String _formatDuration(Duration d) {
    String twoDigits(int n) => n.toString().padLeft(2, '0');
    return "${twoDigits(d.inMinutes)}:${twoDigits(d.inSeconds % 60)}";
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Padding(
        padding: EdgeInsets.all(18.0),
        child: SingleChildScrollView(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // === INFO CARD SECTION ===
              // Provides Instructions for using the audio page
              Card(
                elevation: 4,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12.0),
                ),
                child: Padding(
                  padding: EdgeInsets.all(24.0),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Identify Your Frog Call',
                        style: kTextStyle.titleTealText,
                      ),
                      SizedBox(height: 8),
                      Text(
                        kTextStyle.audioHowToDescription,
                        style: kTextStyle.descriptiontext,
                      ),
                    ],
                  ),
                ),
              ),

              SizedBox(height: 20),

              // === RECORDING STATUS SECTION ===
              // Visual indicator of recording state with timer
              Container(
                padding: EdgeInsets.symmetric(vertical: 12, horizontal: 16),
                decoration: BoxDecoration(
                  color:
                      _isRecording
                          ? Colors.red.withAlpha(25)
                          : Colors.grey.withAlpha(25),
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(
                    color:
                        _isRecording
                            ? Colors.red.withAlpha(125)
                            : Colors.grey.withAlpha(75),
                    width: 1,
                  ),
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    // Recording Indicator Dot
                    Container(
                      width: 12,
                      height: 12,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        color: _isRecording ? Colors.red : Colors.grey,
                      ),
                    ),

                    SizedBox(width: 12),
                    // Status Text
                    Text(
                      _isRecording
                          ? 'Recording: ${_formatDuration(_recordDuration)}'
                          : 'Press start to record',
                      style: TextStyle(
                        fontSize: 16,
                        fontWeight:
                            _isRecording ? FontWeight.bold : FontWeight.normal,
                        color: _isRecording ? Colors.red : Colors.black,
                      ),
                    ),
                  ],
                ),
              ),

              SizedBox(height: 16),

              // === RECORDING BUTTONS SECTIONS ===
              // Stop and Start Recording Buttons
              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Flexible(
                    child: ElevatedButton.icon(
                      onPressed: _isRecording ? null : _startRecording,
                      icon: Icon(Icons.mic_rounded),
                      label: Text('Start Recording'),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: Colors.red,
                        foregroundColor: Colors.white,
                        padding: EdgeInsets.symmetric(horizontal: 16.0, vertical: 12.0),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12.0),
                        ),
                      ),
                    ),
                  ),
                  SizedBox(width: 10),
                  Flexible(
                    child: ElevatedButton.icon(
                      onPressed: _isRecording ? _stopRecording : null,
                      icon: Icon(Icons.stop),
                      label: Text('Stop Recording'),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: Colors.black,
                        foregroundColor: Colors.white,
                        padding: EdgeInsets.symmetric(horizontal: 16.0, vertical: 12.0),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12.0),
                        ),
                      ),
                    ),
                  ),
                ],
              ),


              SizedBox(height: 24),

              // === UPLOAD SECTION ===
              Divider(color: Colors.teal.withAlpha(50), thickness: 1.0),

              // Upload Section Title
              Padding(
                padding: EdgeInsets.symmetric(vertical: 12),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Text(
                      "Or Upload a Recording",
                      style: TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.w500,
                        color: Colors.teal,
                      ),
                    ),
                  ],
                ),
              ),

              // Upload card
              Card(
                elevation: 2,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
                child: InkWell(
                  borderRadius: BorderRadius.circular(12),
                  onTap: _pickAndProcessAudioFile,
                  child: Padding(
                    padding: EdgeInsets.all(16),
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Row(
                          children: [
                            Container(
                              padding: EdgeInsets.all(12),
                              decoration: BoxDecoration(
                                color: Colors.teal.withAlpha(50),
                                shape: BoxShape.circle,
                              ),
                              child: Icon(
                                Icons.upload_file,
                                size: 36,
                                color: Colors.teal,
                              ),
                            ),
                            SizedBox(width: 16),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    'Select Audio File',
                                    style: TextStyle(
                                      fontSize: 16,
                                      fontWeight: FontWeight.bold,
                                    ),
                                    textAlign: TextAlign.center,
                                  ),
                                  SizedBox(height: 4),
                                  Text(
                                    'Choose an existing frog recording.',
                                    style: TextStyle(
                                      fontSize: 14,
                                      color: Colors.grey[700],
                                    ),
                                    textAlign: TextAlign.center,
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ),

                        // Supported formats info
                        Padding(
                          padding: EdgeInsets.only(top: 16),
                          child: Row(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Icon(
                                Icons.info_outline,
                                size: 16,
                                color: Colors.grey,
                              ),
                              SizedBox(width: 8),
                              Text(
                                'Supported Formats: mp3, wav, m4a',
                                style: TextStyle(
                                  fontSize: 14,
                                  fontStyle: FontStyle.italic,
                                  color: Colors.grey[700],
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
