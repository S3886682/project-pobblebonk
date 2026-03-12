import 'package:flutter/material.dart';
import '../services/frog_classification_service.dart';

class TestScreen extends StatelessWidget {
  const TestScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text('Test Frog Service')),
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            ElevatedButton(
              onPressed: () {
                FrogClassificationService.testConnection();
              },
              child: Text('Test Connection'),
            ),
            SizedBox(height: 20),
            ElevatedButton(
              onPressed: () {
                FrogClassificationService.testPrediction();
              },
              child: Text('Test Prediction (File Picker)'),
            ),
            SizedBox(height: 20),
            Text(
              'Check debug console for results',
              style: TextStyle(fontStyle: FontStyle.italic),
            ),
          ],
        ),
      ),
    );
  }
}
