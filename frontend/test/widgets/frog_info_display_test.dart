import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_app/models/frog_model.dart';
import 'package:flutter_app/widgets/frog_details_widget.dart';

void main() {
  group('Frog Information Display Tests (FR004)', () {
    late Frog testFrog;

    setUp(() {
      // Create test frog using your current model
      testFrog = Frog.fromJson({
        'name': 'Green Tree Frog',
        'description':
            'Large bright green frog often found around houses and water tanks',
        'image_filename': 'green_tree_frog.png',
      });
    });

    testWidgets('FR004.1 - Should display frog name prominently', (
      WidgetTester tester,
    ) async {
      await tester.pumpWidget(
        MaterialApp(home: Scaffold(body: FrogDetailsWidget(frog: testFrog))),
      );

      expect(find.text('Green Tree Frog'), findsOneWidget);
    });

    testWidgets('FR004.2 - Should display frog description', (
      WidgetTester tester,
    ) async {
      await tester.pumpWidget(
        MaterialApp(home: Scaffold(body: FrogDetailsWidget(frog: testFrog))),
      );

      expect(find.textContaining('Large bright green frog'), findsOneWidget);
    });

    testWidgets('FR004.3 - Should show confidence level when provided', (
      WidgetTester tester,
    ) async {
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: FrogDetailsWidget(frog: testFrog, confidenceLevel: 0.85),
          ),
        ),
      );

      expect(find.text('Identification Confidence:'), findsOneWidget);
      expect(find.text('85%'), findsOneWidget);
      expect(find.byType(LinearProgressIndicator), findsOneWidget);
    });

    testWidgets('FR004.4 - Should not show confidence when not provided', (
      WidgetTester tester,
    ) async {
      await tester.pumpWidget(
        MaterialApp(home: Scaffold(body: FrogDetailsWidget(frog: testFrog))),
      );

      expect(find.text('Identification Confidence:'), findsNothing);
      expect(find.byType(LinearProgressIndicator), findsNothing);
    });

    testWidgets('FR004.5 - Should handle missing image gracefully', (
      WidgetTester tester,
    ) async {
      final frogWithMissingImage = Frog.fromJson({
        'name': 'Test Frog',
        'description': 'A test frog',
        'image_filename': 'nonexistent_image.png',
      });

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(body: FrogDetailsWidget(frog: frogWithMissingImage)),
        ),
      );

      // Check that image widget exists and renders without crash
      expect(find.byType(Image), findsOneWidget);
      expect(tester.takeException(), isNull);
    });

    testWidgets('FR004.6 - Should display frog image container', (
      WidgetTester tester,
    ) async {
      await tester.pumpWidget(
        MaterialApp(home: Scaffold(body: FrogDetailsWidget(frog: testFrog))),
      );

      // Should find image widget
      expect(find.byType(Image), findsOneWidget);
    });

    testWidgets('FR004.7 - Should use responsive layout', (
      WidgetTester tester,
    ) async {
      await tester.pumpWidget(
        MaterialApp(home: Scaffold(body: FrogDetailsWidget(frog: testFrog))),
      );

      // Should render without overflow issues
      expect(tester.takeException(), isNull);
    });

    test('FR004.8 - Should create and validate Frog model from JSON', () {
      final json = {
        'name': 'Test Frog',
        'description': 'A test description',
        'image_filename': 'test_frog.png',
      };

      final frog = Frog.fromJson(json);

      expect(frog.name, 'Test Frog');
      expect(frog.description, 'A test description');
      expect(frog.imageFileName, 'test_frog.png');
    });

    test('FR004.9 - Should handle missing JSON fields gracefully', () {
      final incompleteJson = {
        'name': 'Test Frog',
        // Missing description and image_filename
      };

      expect(() => Frog.fromJson(incompleteJson), returnsNormally);

      final frog = Frog.fromJson(incompleteJson);
      expect(frog.name, 'Test Frog');
    });

    testWidgets('FR004.10 - Should show frog description content', (
      WidgetTester tester,
    ) async {
      await tester.pumpWidget(
        MaterialApp(home: Scaffold(body: FrogDetailsWidget(frog: testFrog))),
      );

      // Should show the actual frog description
      expect(find.textContaining('Large bright green frog'), findsOneWidget);
    });

    testWidgets('FR004.11 - Should handle very long frog names', (
      WidgetTester tester,
    ) async {
      final frogWithLongName = Frog.fromJson({
        'name':
            'Frog With A Very Long Name That Might Cause Layout Issues In The User Interface',
        'description': 'Test description',
        'image_filename': 'test.png',
      });

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: SingleChildScrollView(
              child: FrogDetailsWidget(frog: frogWithLongName),
            ),
          ),
        ),
      );

      // Should render without overflow errors
      expect(tester.takeException(), isNull);
    });

    testWidgets('FR004.12 - Should handle very long descriptions', (
      WidgetTester tester,
    ) async {
      final frogWithLongDescription = Frog.fromJson({
        'name': 'Test Frog',
        'description':
            'This is a very long description that goes on and on and might cause text overflow issues if not handled properly in the UI layout system. It contains multiple sentences and should wrap correctly.',
        'image_filename': 'test.png',
      });

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: SingleChildScrollView(
              child: FrogDetailsWidget(frog: frogWithLongDescription),
            ),
          ),
        ),
      );

      // Should render without overflow errors
      expect(tester.takeException(), isNull);
    });

    testWidgets('FR004.13 - Should display confidence colors correctly', (
      WidgetTester tester,
    ) async {
      // Test low confidence
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: FrogDetailsWidget(frog: testFrog, confidenceLevel: 0.2),
          ),
        ),
      );

      final progressIndicator = tester.widget<LinearProgressIndicator>(
        find.byType(LinearProgressIndicator),
      );

      // Should have some color (not default)
      expect(progressIndicator.valueColor, isNotNull);
    });

    testWidgets('FR004.14 - Should handle edge case confidence values', (
      WidgetTester tester,
    ) async {
      // Test confidence of 0
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: FrogDetailsWidget(frog: testFrog, confidenceLevel: 0.0),
          ),
        ),
      );

      expect(find.text('0%'), findsOneWidget);

      // Test confidence of 1
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: FrogDetailsWidget(frog: testFrog, confidenceLevel: 1.0),
          ),
        ),
      );

      expect(find.text('100%'), findsOneWidget);
    });

    testWidgets('FR004.15 - Should be contained within a Card widget', (
      WidgetTester tester,
    ) async {
      await tester.pumpWidget(
        MaterialApp(home: Scaffold(body: FrogDetailsWidget(frog: testFrog))),
      );

      expect(find.byType(Card), findsOneWidget);
    });

    testWidgets('FR004.16 - Should handle special characters in frog name', (
      WidgetTester tester,
    ) async {
      final frogWithSpecialChars = Frog.fromJson({
        'name': "Fleay's Barred Frog",
        'description': 'Frog with apostrophe in name',
        'image_filename': 'fleays_frog.png',
      });

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(body: FrogDetailsWidget(frog: frogWithSpecialChars)),
        ),
      );

      expect(find.text("Fleay's Barred Frog"), findsOneWidget);
    });

    testWidgets('FR004.17 - Should show image with proper container', (
      WidgetTester tester,
    ) async {
      await tester.pumpWidget(
        MaterialApp(home: Scaffold(body: FrogDetailsWidget(frog: testFrog))),
      );

      // Should find image widget inside a container
      expect(find.byType(Image), findsOneWidget);
      expect(find.byType(Container), findsWidgets);
    });

    testWidgets('FR004.18 - Should handle null confidence gracefully', (
      WidgetTester tester,
    ) async {
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: FrogDetailsWidget(frog: testFrog, confidenceLevel: null),
          ),
        ),
      );

      // Should not show confidence section
      expect(find.text('Identification Confidence:'), findsNothing);
      expect(find.byType(LinearProgressIndicator), findsNothing);
    });

    testWidgets('FR004.19 - Should adapt to different screen sizes', (
      WidgetTester tester,
    ) async {
      // Test mobile size
      tester.view.physicalSize = const Size(400, 800);
      tester.view.devicePixelRatio = 1.0;

      await tester.pumpWidget(
        MaterialApp(home: Scaffold(body: FrogDetailsWidget(frog: testFrog))),
      );

      expect(tester.takeException(), isNull);

      // Test tablet size
      tester.view.physicalSize = const Size(800, 1200);
      tester.view.devicePixelRatio = 1.0;

      await tester.pumpWidget(
        MaterialApp(home: Scaffold(body: FrogDetailsWidget(frog: testFrog))),
      );

      expect(tester.takeException(), isNull);

      // Reset to default
      addTearDown(tester.view.reset);
    });
  });
}
