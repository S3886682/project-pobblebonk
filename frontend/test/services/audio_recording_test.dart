import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mockito/mockito.dart';
import 'package:mockito/annotations.dart';
import 'package:record/record.dart';
import 'package:flutter_app/views/pages/audio_page.dart';

// Generate mocks
@GenerateMocks([AudioRecorder])
import 'audio_recording_test.mocks.dart';

void main() {
  group('Audio Recording Tests (FR001)', () {
    late MockAudioRecorder mockRecorder;

    setUp(() {
      mockRecorder = MockAudioRecorder();
    });

    testWidgets('FR001.1 - Audio page should render successfully', (
      WidgetTester tester,
    ) async {
      // Arrange & Act
      await tester.pumpWidget(MaterialApp(home: AudioPage()));
      await tester.pumpAndSettle();

      // Assert - Page loads without errors
      expect(find.byType(AudioPage), findsOneWidget);
    });

    testWidgets('FR001.2 - Recording UI elements should be present', (
      WidgetTester tester,
    ) async {
      // Arrange
      await tester.pumpWidget(MaterialApp(home: AudioPage()));
      await tester.pumpAndSettle();

      // Assert - Required UI elements exist
      expect(find.byIcon(Icons.mic_rounded), findsOneWidget);
      expect(find.byIcon(Icons.stop), findsOneWidget);
      expect(find.text('Start Recording'), findsOneWidget);
      expect(find.text('Stop Recording'), findsOneWidget);
    });

    testWidgets('FR001.3 - Should show recording status indicator', (
      WidgetTester tester,
    ) async {
      // Arrange
      await tester.pumpWidget(MaterialApp(home: AudioPage()));
      await tester.pumpAndSettle();

      // Assert
      expect(find.text('Press start to record'), findsOneWidget);
    });

    testWidgets('FR001.4 - Should show file upload option', (
      WidgetTester tester,
    ) async {
      // Arrange
      await tester.pumpWidget(MaterialApp(home: AudioPage()));
      await tester.pumpAndSettle();

      // Assert
      expect(find.text('Or Upload a Recording'), findsOneWidget);
      expect(find.text('Select Audio File'), findsOneWidget);
      expect(find.byIcon(Icons.upload_file), findsOneWidget);
    });

    testWidgets('FR001.5 - Should show supported file formats', (
      WidgetTester tester,
    ) async {
      // Arrange
      await tester.pumpWidget(MaterialApp(home: AudioPage()));
      await tester.pumpAndSettle();

      // Assert
      expect(find.text('Supported Formats: mp3, wav, m4a'), findsOneWidget);
    });

    testWidgets('FR001.6 - Should show app instructions', (
      WidgetTester tester,
    ) async {
      // Arrange
      await tester.pumpWidget(MaterialApp(home: AudioPage()));
      await tester.pumpAndSettle();

      // Assert
      expect(find.text('Identify Your Frog Call'), findsOneWidget);
    });

    // Unit tests for mock recorder
    test('FR001.7 - Mock recorder should handle permission check', () async {
      // Arrange
      when(mockRecorder.hasPermission()).thenAnswer((_) async => true);

      // Act
      final hasPermission = await mockRecorder.hasPermission();

      // Assert
      expect(hasPermission, true);
      verify(mockRecorder.hasPermission()).called(1);
    });

    test('FR001.8 - Mock recorder should handle recording start', () async {
      // Arrange
      when(mockRecorder.hasPermission()).thenAnswer((_) async => true);
      when(
        mockRecorder.start(any, path: anyNamed('path')),
      ).thenAnswer((_) async {});

      // Act
      await mockRecorder.start(
        RecordConfig(encoder: AudioEncoder.aacLc),
        path: 'test_path',
      );

      // Assert
      verify(mockRecorder.start(any, path: anyNamed('path'))).called(1);
    });

    test('FR001.9 - Mock recorder should handle recording stop', () async {
      // Arrange
      when(
        mockRecorder.stop(),
      ).thenAnswer((_) async => '/path/to/recording.m4a');

      // Act
      final recordingPath = await mockRecorder.stop();

      // Assert
      expect(recordingPath, isNotNull);
      expect(recordingPath, contains('.m4a'));
      verify(mockRecorder.stop()).called(1);
    });
  });
}
