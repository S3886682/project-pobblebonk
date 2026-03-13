import 'package:flutter/material.dart';
import 'package:flutter_app/data/constants.dart';

class CommunityPage extends StatelessWidget {
  const CommunityPage({super.key});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.all(20.0),
      child: SingleChildScrollView(
        child: SizedBox(
          width: double.infinity,
          child: Padding(
            padding: const EdgeInsets.symmetric(vertical: 10.0),
            child: Card(
              child: Padding(
                padding: const EdgeInsets.all(20.0),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Center(
                      child: Text(
                        'Community',
                        style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                              fontWeight: FontWeight.bold,
                            ),
                      ),
                    ),
                    const SizedBox(height: 20.0),
                    Center(
                      child: Image.asset(
                        'assets/images/FrogFace.png',
                        height: 200,
                        fit: BoxFit.contain,
                      ),
                    ),
                    const SizedBox(height: 20.0),
                    Text(
                      'FrogFinder is more than just a sound identifier — it\'s a community of people who care about frogs and the ecosystems they inhabit. Whether you\'re a hobbyist or a scientist, we encourage you to join the conversation, share your experiences, and expand your knowledge.',
                      style: kTextStyle.descriptiontext,
                      textAlign: TextAlign.left,
                    ),
                    const SizedBox(height: 10.0),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
