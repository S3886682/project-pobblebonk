import 'package:flutter_app/services/ip_manager.dart';
import 'package:http/http.dart' as http;
import 'package:file_picker/file_picker.dart';
import 'package:flutter/foundation.dart' show kIsWeb;
import 'dart:convert';
import 'dart:io';
import 'dart:typed_data';

// Data Classes
class Prediction {
  final double time;
  final String label;
  final double? confidence;

  Prediction({required this.time, required this.label, this.confidence});

  factory Prediction.fromJson(Map<String, dynamic> json) {
    return Prediction(
      time: json['time'].toDouble(),
      label: json['label'],
      confidence: json['confidence']?.toDouble(),
    );
  }
}

class PredictionResult {
  final String finalPrediction;
  final List<Prediction> predictions;
  final double? averageConfidence;

  PredictionResult({
    required this.finalPrediction,
    required this.predictions,
    this.averageConfidence,
  });

  factory PredictionResult.fromJson(Map<String, dynamic> json) {
    var predictions = <Prediction>[];
    if (json['predictions'] != null) {
      json['predictions'].forEach((v) {
        predictions.add(Prediction.fromJson(v));
      });
    }
    return PredictionResult(
      finalPrediction: json['final_prediction'],
      predictions: predictions,
      averageConfidence: json['average_confidence']?.toDouble(),
    );
  }
}

class FrogClassificationService {
  // For Android Emulator use http://10.0.2.2:5000/predict
  // For IOS Emulator use http://127.0.0.1:5000/predict

  //If running on physical device use computers ip address
  // run ipconfg in terminal

  //for testing change ip to your actual ip http://x.x.x.x:5000/predict
  // static const String serverUrl = "http://192.168.0.50:5000/predict";
  static const String SERVER_URL= "http://127.0.0.1:5000/predict";



  // static String getServerUrl() {
  //   if (kIsWeb) {
  //     return "http://127.0.0.1:5000/predict"; // For web testing
  //   } else if (Platform.isAndroid) {
  //     return "http://10.0.2.2:5000/predict"; // For Android emulator
  //   } else if (Platform.isIOS) {
  //     return "http://localhost:5000/predict"; // For iOS simulator
  //   } else {
  //     // For physical devices, you'll need the actual IP address of your server
  //     return "http://127.0.0.1:5000/predict"; // TODO change to actual server IP once implemented
  //   }
  // }

  static Future<void> testConnection() async { 
    String serverUrl = await getServerUrl();
    print("Testing connection to: $serverUrl");

    // Connection Test
    try {
      final response = await http.get(
        Uri.parse(serverUrl.replaceAll('/predict', '')),
      );
      print("Connection test response: ${response.statusCode}");
    } catch (e) {
      print("Connection test failed: $e");
    }
  }

  static Future<void> testPrediction() async {
    print("Testing prediction service...");
    String serverUrl = await getServerUrl();
    try {
      // Open File Picker
      FilePickerResult? result = await FilePicker.platform.pickFiles(
        type: FileType.audio,
        withData: true,
      );

      if (result != null) {
        if (kIsWeb) {
          // Web Specific handling
          final bytes = result.files.single.bytes;
          final fileName = result.files.single.name;

          if (bytes != null) {
            //Create multipart request
            final request = http.MultipartRequest(
              'POST',
              Uri.parse(serverUrl),
            );

            //Add File from bytes
            request.files.add(
              http.MultipartFile.fromBytes('file', bytes, filename: fileName),
            );

            print("Sending request...");
            final response = await request.send();

            print("Response status: ${response.statusCode}");

            if (response.statusCode == 200) {
              final responseData = await response.stream.bytesToString();
              print("Response body: $responseData");

              final jsonData = jsonDecode(responseData);
              print("Final prediction: &{jsonData['final_prediction']}");
              print("Confidence: ${jsonData['average_confidence']}");
            } else {
              print("Error: ${response.statusCode}");
            }
          }
        }
      }
    } catch (e) {
      print("Test failed: $e");
    }
  }

  static Future<PredictionResult?> predictFromBytes(String? filePath, String fileName) async {
    String serverUrl = await getServerUrl();
    try {
      if (filePath != null){
        filePath = filePath;
      }else{
        return null;
      }
      final request = http.MultipartRequest('POST', Uri.parse(serverUrl));

      if (kIsWeb) {
        // Web Is handled differently
        Uint8List bytes = base64Decode(filePath);
        request.files.add(
              http.MultipartFile.fromBytes('file', bytes, filename: fileName),
            );
      } else {
        // For Mobile/Desktop
        final file = File(filePath);
        if (!await file.exists()) {
          throw Exception('File does not exist');
        }
        request.files.add(await http.MultipartFile.fromPath('file', filePath));
      }

      print("Sending request...");
      final response = await request.send();

      if (response.statusCode == 200) {
        final responseData = await response.stream.bytesToString();
        final jsonData = jsonDecode(responseData);
        return PredictionResult.fromJson(jsonData);
      } else {
        print("Error: ${response.statusCode}");
        return null;
      }
    } catch (e) {
      print("Prediction Failed: $e");
      return null;
    }
  }

  static Future<PredictionResult?> predictFromFilePath(String filePath) async {
    String serverUrl = await getServerUrl();
    try {
      print("Predicting from file: $filePath");

      if (!kIsWeb) {
        final file = File(filePath);
        if (!await file.exists()) {
          print("File does not exis: $filePath");
          throw Exception('File does not exist');
        }

        // Check file size
        final fileSize = await file.length();
        print("File size: ${fileSize} bytes");

        if (fileSize <= 0) {
          throw Exception('File is empty');
        }
      }

      // Create request with server url
      print("Using server URL: $serverUrl");
      final request = http.MultipartRequest('POST', Uri.parse(serverUrl));

      if (kIsWeb) {
        // Web Is handled differently
        Uint8List bytes = base64Decode(filePath);
        request.files.add(
              http.MultipartFile.fromBytes('file', bytes, filename: filePath),
            );
      } else {
        // For Mobile/Desktop
        print("Adding file to request: $filePath");
        request.files.add(await http.MultipartFile.fromPath('file', filePath));
      }

      print("Sending request...");
      final response = await request.send();

      print("Response Status: ${response.statusCode}");
      if (response.statusCode == 200) {
        final responseData = await response.stream.bytesToString();
        final jsonData = jsonDecode(responseData);
        return PredictionResult.fromJson(jsonData);
      } else {
        print("Error: ${response.statusCode}");
        final errorBody = await response.stream.bytesToString();
        print("Error body: $errorBody");
        return null;
      }
    } catch (e) {
      print("Prediction Failed: $e");
      return null;
    }
  }

  static Future<String> getServerUrl() async {
    String? ip = await getIpAddress();
    if (ip != null) {
      print('Saved IP is: $ip');
      return 'http://$ip:5000/predict';
    } else {
      return 'http://127.0.0.1:5000/predict';
    }
  }
}
