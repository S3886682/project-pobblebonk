import 'package:flutter/material.dart';
import 'package:flutter_app/models/frog_model.dart';

class FrogDetailsWidget extends StatelessWidget {
  final Frog frog;
  final double? confidenceLevel;

  const FrogDetailsWidget({Key? key, required this.frog, this.confidenceLevel})
    : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Card(
      elevation: 3,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // LEFT SIDE: Image and Title
            Expanded(
              flex: 4,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Frog Name
                  Center(
                    child: Text(
                      frog.name,
                      style: TextStyle(
                        fontSize: 20,
                        fontWeight: FontWeight.bold,
                        color: Colors.teal,
                      ),
                      textAlign: TextAlign.center,
                    ),
                  ),

                  SizedBox(height: 8),

                  // Frog Image
                  Container(
                    width: double.infinity,
                    height: 300,
                    decoration: BoxDecoration(
                      color: Colors.teal.withAlpha(30),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(
                        color: Colors.teal.withAlpha(50),
                        width: 1,
                      ),
                    ),
                    child: ClipRRect(
                      borderRadius: BorderRadius.circular(11),
                      child: Center(
                        child: _buildFrogImage(fit: BoxFit.contain),
                      ),
                    ),
                  ),

                  SizedBox(height: 12),
                ],
              ),
            ),

            SizedBox(width: 16),

            // RIGHT SIDE: Confidence and Description
            Expanded(
              flex: 5,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Description section
                  Text(
                    'About this Frog:',
                    style: TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.bold,
                      color: Colors.teal,
                    ),
                  ),

                  SizedBox(height: 8),

                  // Description text
                  Container(
                    padding: EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: Colors.teal.withAlpha(30),
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(
                        color: Colors.teal.withAlpha(100),
                        width: 1,
                      ),
                    ),
                    child: Text(
                      frog.description,
                      style: TextStyle(fontSize: 14, height: 1.4),
                    ),
                  ),

                  SizedBox(height: 24),

                  // Confidence Level
                  if (confidenceLevel != null) ...[
                    Text(
                      'Identification Confidence:',
                      style: TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                    SizedBox(height: 4),
                    Row(
                      children: [
                        Expanded(
                          child: LinearProgressIndicator(
                            value: confidenceLevel!,
                            backgroundColor: Colors.grey[200],
                            valueColor: AlwaysStoppedAnimation<Color>(
                              _getConfidenceColor(confidenceLevel!),
                            ),
                            minHeight: 20,
                          ),
                        ),
                        SizedBox(width: 8),
                        Text(
                          '${(confidenceLevel! * 100).toStringAsFixed(0)}%',
                          style: TextStyle(
                            fontWeight: FontWeight.bold,
                            color: _getConfidenceColor(confidenceLevel!),
                          ),
                        ),
                      ],
                    ),
                  ],
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  // Helper method to build frog image
  Widget _buildFrogImage({BoxFit fit = BoxFit.cover}) {
    return Image.asset(
      'assets/images/frog_images/${frog.imageFileName}',
      fit: fit,
      errorBuilder: (context, error, stackTrace) {
        print('Image paths failed, showing placeholder');
        return Container(
          color: Colors.teal.withAlpha(30),
          child: Center(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(Icons.image_not_supported, size: 40, color: Colors.teal),
                SizedBox(height: 4),
                Text(
                  'Image not available',
                  style: TextStyle(fontSize: 10, color: Colors.teal),
                  textAlign: TextAlign.center,
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  Color _getConfidenceColor(double confidence) {
    if (confidence < 0.3) return Colors.orange.shade300;
    if (confidence < 0.6) return Colors.green.shade400;
    return Colors.green;
  }
}
