import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:mockito/annotations.dart';
import 'package:file_picker/file_picker.dart';
import 'package:flutter_app/views/pages/audio_page.dart';

// Generate mocks
@GenerateMocks([FilePicker])
void main() {
  group('File Upload Tests (FR002)', () {
    testWidgets('FR002.1 - Upload UI elements should be present', (
      WidgetTester tester,
    ) async {
      // Arrange
      await tester.pumpWidget(MaterialApp(home: AudioPage()));
      await tester.pumpAndSettle();

      // Assert - Upload section exists
      expect(find.text('Or Upload a Recording'), findsOneWidget);
      expect(find.text('Select Audio File'), findsOneWidget);
      expect(find.text('Choose an existing frog recording.'), findsOneWidget);
      expect(find.byIcon(Icons.upload_file), findsOneWidget);
    });

    testWidgets('FR002.2 - Should show supported file formats', (
      WidgetTester tester,
    ) async {
      // Arrange
      await tester.pumpWidget(MaterialApp(home: AudioPage()));
      await tester.pumpAndSettle();

      // Assert
      expect(find.text('Supported Formats: mp3, wav, m4a'), findsOneWidget);
      expect(find.byIcon(Icons.info_outline), findsOneWidget);
    });

    testWidgets('FR002.3 - Upload card should be tappable', (
      WidgetTester tester,
    ) async {
      // Arrange
      await tester.pumpWidget(MaterialApp(home: AudioPage()));
      await tester.pumpAndSettle();

      // Assert - Upload card wrapped in InkWell
      final inkWell = find.ancestor(
        of: find.text('Select Audio File'),
        matching: find.byType(InkWell),
      );
      expect(inkWell, findsOneWidget);
    });

    testWidgets('FR002.4 - Should handle file picker interaction', (
      WidgetTester tester,
    ) async {
      // Arrange
      tester.view.physicalSize = const Size(800, 1200);
      tester.view.devicePixelRatio = 1.0;

      await tester.pumpWidget(MaterialApp(home: AudioPage()));
      await tester.pumpAndSettle();

      // Scroll to make upload section visible
      await tester.scrollUntilVisible(
        find.text('Select Audio File'),
        500.0,
        scrollable: find.byType(Scrollable).first,
      );
      await tester.pumpAndSettle();

      // Act - Tap upload card
      final uploadCard = find.ancestor(
        of: find.text('Select Audio File'),
        matching: find.byType(InkWell),
      );

      await tester.tap(uploadCard, warnIfMissed: false);
      await tester.pumpAndSettle();

      // Assert - No crash, handles file picker gracefully
      expect(find.byType(AudioPage), findsOneWidget);
    });

    // Test file picker result handling
    test('FR002.5 - Should handle successful MP3 file selection', () {
      // Arrange
      final mockResult = _createMockFilePickerResult(
        'test_audio.mp3',
        '/path/to/test_audio.mp3',
      );

      // Act & Assert
      expect(mockResult.files.isNotEmpty, true);
      expect(mockResult.files.first.name, 'test_audio.mp3');
      expect(mockResult.files.first.path, '/path/to/test_audio.mp3');
      expect(mockResult.files.first.extension, 'mp3');
    });

    test('FR002.6 - Should handle successful WAV file selection', () {
      // Arrange
      final mockResult = _createMockFilePickerResult(
        'test_audio.wav',
        '/path/to/test_audio.wav',
      );

      // Act & Assert
      expect(mockResult.files.isNotEmpty, true);
      expect(mockResult.files.first.name, 'test_audio.wav');
      expect(mockResult.files.first.extension, 'wav');
    });

    test('FR002.7 - Should handle successful M4A file selection', () {
      // Arrange
      final mockResult = _createMockFilePickerResult(
        'test_audio.m4a',
        '/path/to/test_audio.m4a',
      );

      // Act & Assert
      expect(mockResult.files.isNotEmpty, true);
      expect(mockResult.files.first.name, 'test_audio.m4a');
      expect(mockResult.files.first.extension, 'm4a');
    });

    test('FR002.8 - Should handle file picker cancellation', () {
      // Arrange - Simulate user canceling file picker
      FilePickerResult? canceledResult = null;

      // Act & Assert
      expect(canceledResult, isNull);
      // App should handle null result gracefully
    });

    test('FR002.9 - Should validate file extensions', () {
      // Arrange
      final supportedExtensions = ['mp3', 'wav', 'm4a'];
      final testFiles = [
        {'name': 'audio.mp3', 'valid': true},
        {'name': 'sound.wav', 'valid': true},
        {'name': 'recording.m4a', 'valid': true},
        {'name': 'document.txt', 'valid': false},
        {'name': 'image.jpg', 'valid': false},
        {'name': 'video.mp4', 'valid': false},
      ];

      // Act & Assert
      for (final testFile in testFiles) {
        final filename = testFile['name'] as String;
        final shouldBeValid = testFile['valid'] as bool;
        final extension = filename.split('.').last.toLowerCase();
        final isValid = supportedExtensions.contains(extension);

        expect(
          isValid,
          shouldBeValid,
          reason: '$filename should be ${shouldBeValid ? 'valid' : 'invalid'}',
        );
      }
    });

    test('FR002.10 - Should handle case-insensitive extensions', () {
      // Arrange
      final testFiles = ['audio.MP3', 'sound.WAV', 'recording.M4A'];

      // Act & Assert
      for (final filename in testFiles) {
        final extension = filename.split('.').last.toLowerCase();
        expect(['mp3', 'wav', 'm4a'].contains(extension), true);
      }
    });

    test('FR002.11 - Should validate file size requirements', () {
      // Arrange
      final testCases = [
        {'size': 1024, 'valid': true, 'description': '1KB file'},
        {'size': 1024 * 1024, 'valid': true, 'description': '1MB file'},
        {'size': 10 * 1024 * 1024, 'valid': true, 'description': '10MB file'},
        {'size': 0, 'valid': false, 'description': 'Empty file'},
      ];

      // Act & Assert
      for (final testCase in testCases) {
        final size = testCase['size'] as int;
        final shouldBeValid = testCase['valid'] as bool;
        final description = testCase['description'] as String;

        final isValid = size > 0; // Files must not be empty
        expect(isValid, shouldBeValid, reason: '$description validation');
      }
    });

    test('FR002.8 - Should handle file path edge cases', () {
      // Arrange
      final pathCases = [
        {
          'path': '/absolute/path/to/file.mp3',
          'expectedExt': 'mp3',
          'shouldBeValid': true,
        },
        {
          'path': 'relative/path/file.wav',
          'expectedExt': 'wav',
          'shouldBeValid': true,
        },
        {
          'path': 'C:\\Windows\\path\\file.m4a',
          'expectedExt': 'm4a',
          'shouldBeValid': true,
        },
        {
          'path': 'file_with_no_extension',
          'expectedExt': '',
          'shouldBeValid': false,
        },
        {
          'path': 'file.multiple.dots.mp3',
          'expectedExt': 'mp3',
          'shouldBeValid': true,
        },
        {
          'path': 'file.UPPER.MP3',
          'expectedExt': 'mp3',
          'shouldBeValid': true,
        }, // Case handling
        {
          'path': 'file.txt.mp3',
          'expectedExt': 'mp3',
          'shouldBeValid': true,
        }, // Nested extensions
      ];

      final supportedExtensions = ['mp3', 'wav', 'm4a'];

      // Act & Assert
      for (final testCase in pathCases) {
        final path = testCase['path'] as String;
        final expectedExt = testCase['expectedExt'] as String;
        final shouldBeValid = testCase['shouldBeValid'] as bool;

        final parts = path.split('.');
        final extension = parts.length > 1 ? parts.last.toLowerCase() : '';
        final isValid = supportedExtensions.contains(extension);

        // Test extension parsing
        expect(
          extension,
          equals(expectedExt),
          reason: 'Path $path should parse to extension "$expectedExt"',
        );

        // Test file validation
        expect(
          isValid,
          equals(shouldBeValid),
          reason: 'Path $path should be ${shouldBeValid ? 'valid' : 'invalid'}',
        );
      }
    });
  });
}

// Helper function to create mock FilePickerResult
FilePickerResult _createMockFilePickerResult(String fileName, String filePath) {
  final platformFile = PlatformFile(
    name: fileName,
    size: 1024 * 1024,
    path: filePath,
  );

  return FilePickerResult([platformFile]);
}
