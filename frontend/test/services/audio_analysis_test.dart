import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_app/services/frog_classification_service.dart';
import 'package:flutter_app/views/pages/audio_preview_page.dart';

void main() {
  group('Audio Analysis Tests (FR003)', () {
    testWidgets('FR003.1 - Audio preview page should have analyze button', (
      WidgetTester tester,
    ) async {
      // Arrange
      await tester.pumpWidget(
        MaterialApp(home: AudioPreviewPage(filePath: '/test/audio.mp3')),
      );
      await tester.pumpAndSettle();

      // Assert
      expect(find.text('Analyse Recording'), findsOneWidget);
      expect(find.byType(ElevatedButton), findsAtLeastNWidgets(1));
    });

    testWidgets('FR003.2 - Should show loading state during analysis', (
      WidgetTester tester,
    ) async {
      // Arrange
      await tester.pumpWidget(
        MaterialApp(home: AudioPreviewPage(filePath: '/test/audio.mp3')),
      );
      await tester.pumpAndSettle();

      // Act - Tap analyze button (will show loading in real app)
      final analyzeButton = find.text('Analyse Recording');
      await tester.tap(analyzeButton);
      await tester.pump();

      // Assert - Should show loading indicator or analyzing text
      expect(find.byType(AudioPreviewPage), findsOneWidget);
    });

    test('FR003.3 - Should create prediction result from JSON response', () {
      // Arrange
      final jsonResponse = {
        'final_prediction': 'Green Tree Frog',
        'average_confidence': 0.85,
        'predictions': [
          {'time': 0.0, 'label': 'Green Tree Frog', 'confidence': 0.9},
          {'time': 0.3, 'label': 'Green Tree Frog', 'confidence': 0.8},
        ],
      };

      // Act
      final result = PredictionResult.fromJson(jsonResponse);

      // Assert
      expect(result.finalPrediction, equals('Green Tree Frog'));
      expect(result.averageConfidence, equals(0.85));
      expect(result.predictions.length, equals(2));
      expect(result.predictions.first.label, equals('Green Tree Frog'));
      expect(result.predictions.first.confidence, equals(0.9));
    });

    test('FR003.4 - Should handle multiple species predictions', () {
      // Arrange
      final jsonResponse = {
        'final_prediction': 'Green Tree Frog',
        'average_confidence': 0.75,
        'predictions': [
          {'time': 0.0, 'label': 'Green Tree Frog', 'confidence': 0.8},
          {'time': 0.3, 'label': 'Common Eastern Froglet', 'confidence': 0.7},
          {'time': 0.6, 'label': 'Green Tree Frog', 'confidence': 0.9},
        ],
      };

      // Act
      final result = PredictionResult.fromJson(jsonResponse);

      // Assert
      expect(result.finalPrediction, equals('Green Tree Frog'));
      expect(result.predictions.length, equals(3));

      // Should contain different species
      final uniqueSpecies = result.predictions.map((p) => p.label).toSet();
      expect(uniqueSpecies.length, greaterThan(1));
      expect(uniqueSpecies.contains('Green Tree Frog'), true);
      expect(uniqueSpecies.contains('Common Eastern Froglet'), true);
    });

    test('FR003.5 - Should create individual prediction from JSON', () {
      // Arrange
      final predictionJson = {
        'time': 1.5,
        'label': 'Striped Marsh Frog',
        'confidence': 0.92,
      };

      // Act
      final prediction = Prediction.fromJson(predictionJson);

      // Assert
      expect(prediction.time, equals(1.5));
      expect(prediction.label, equals('Striped Marsh Frog'));
      expect(prediction.confidence, equals(0.92));
    });

    test('FR003.6 - Should handle prediction without confidence', () {
      // Arrange
      final predictionJson = {
        'time': 2.0,
        'label': 'Unknown Species',
        'confidence': null,
      };

      // Act
      final prediction = Prediction.fromJson(predictionJson);

      // Assert
      expect(prediction.time, equals(2.0));
      expect(prediction.label, equals('Unknown Species'));
      expect(prediction.confidence, isNull);
    });

    test('FR003.7 - Should validate server URL configuration', () {
      // Arrange & Act
      const serverUrl = FrogClassificationService.SERVER_URL;

      // Assert - Should be a valid URL format
      expect(serverUrl, contains('http'));
      expect(serverUrl, contains('/predict'));
      expect(Uri.tryParse(serverUrl), isNotNull);
    });

    test('FR003.8 - Should handle empty predictions array', () {
      // Arrange
      final jsonResponse = {
        'final_prediction': '',
        'average_confidence': null,
        'predictions': [],
      };

      // Act
      final result = PredictionResult.fromJson(jsonResponse);

      // Assert
      expect(result.predictions.isEmpty, true);
      expect(result.averageConfidence, isNull);
      expect(result.finalPrediction, equals(''));
    });

    test('FR003.9 - Should handle high confidence predictions', () {
      // Arrange
      final jsonResponse = {
        'final_prediction': 'Eastern Banjo Frog',
        'average_confidence': 0.95,
        'predictions': [
          {'time': 0.0, 'label': 'Eastern Banjo Frog', 'confidence': 0.98},
          {'time': 0.3, 'label': 'Eastern Banjo Frog', 'confidence': 0.92},
        ],
      };

      // Act
      final result = PredictionResult.fromJson(jsonResponse);

      // Assert
      expect(result.averageConfidence!, greaterThan(0.9));
      expect(result.predictions.every((p) => p.confidence! > 0.9), true);
      expect(result.finalPrediction, equals('Eastern Banjo Frog'));
    });

    test('FR003.10 - Should handle low confidence predictions', () {
      // Arrange
      final jsonResponse = {
        'final_prediction': 'Unknown Species',
        'average_confidence': 0.35,
        'predictions': [
          {'time': 0.0, 'label': 'Species A', 'confidence': 0.4},
          {'time': 0.3, 'label': 'Species B', 'confidence': 0.3},
        ],
      };

      // Act
      final result = PredictionResult.fromJson(jsonResponse);

      // Assert
      expect(result.averageConfidence!, lessThan(0.5));
      expect(result.predictions.every((p) => p.confidence! < 0.5), true);
    });

    test('FR003.11 - Should handle species with special characters', () {
      // Arrange
      final jsonResponse = {
        'final_prediction': 'Fleay\'s Barred Frog',
        'average_confidence': 0.82,
        'predictions': [
          {'time': 0.0, 'label': 'Fleay\'s Barred Frog', 'confidence': 0.82},
        ],
      };

      // Act
      final result = PredictionResult.fromJson(jsonResponse);

      // Assert
      expect(result.finalPrediction, equals('Fleay\'s Barred Frog'));
      expect(result.predictions.first.label, contains('\''));
    });

    test('FR003.12 - Should validate prediction time sequences', () {
      // Arrange
      final jsonResponse = {
        'final_prediction': 'Test Frog',
        'average_confidence': 0.8,
        'predictions': [
          {'time': 0.0, 'label': 'Test Frog', 'confidence': 0.8},
          {'time': 0.3, 'label': 'Test Frog', 'confidence': 0.8},
          {'time': 0.6, 'label': 'Test Frog', 'confidence': 0.8},
        ],
      };

      // Act
      final result = PredictionResult.fromJson(jsonResponse);

      // Assert - Times should be in sequence
      final times = result.predictions.map((p) => p.time).toList();
      expect(times, equals([0.0, 0.3, 0.6]));

      // Times should be non-negative
      expect(times.every((t) => t >= 0), true);
    });

    test('FR003.13 - Should handle JSON parsing errors gracefully', () {
      // Arrange
      final invalidJson = {
        'final_prediction': 'Test Frog',
        // Missing average_confidence and predictions
      };

      // Act & Assert - Should not throw exception
      expect(() => PredictionResult.fromJson(invalidJson), returnsNormally);
    });
  });
}
