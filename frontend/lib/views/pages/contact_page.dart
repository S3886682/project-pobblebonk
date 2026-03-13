import 'package:flutter/material.dart';
import 'package:flutter_app/data/constants.dart';

class ContactPage extends StatelessWidget {
  const ContactPage({super.key});

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
                        'Contact',
                        style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                              fontWeight: FontWeight.bold,
                            ),
                      ),
                    ),
                    const SizedBox(height: 20.0),
                    Center(
                      child: Image.asset(
                        'assets/images/kuranda_tree_frog.png',
                        height: 200,
                        fit: BoxFit.contain,
                      ),
                    ),
                    const SizedBox(height: 20.0),
                    Text(
                      'Have questions, feedback, or just want to say ribbit?',
                      style: kTextStyle.descriptiontext,
                      textAlign: TextAlign.left,
                    ),
                    const SizedBox(height: 10.0),
                    Text(
                      '''We'd love to hear from you! Whether you're a curious nature lover, a researcher in the field, or just excited to know what kind of frog is croaking in your backyard, the FrogFinder team is here to help.

Drop us a message with your questions, suggestions, or even your latest frog sound discoveries.''',
                      style: kTextStyle.descriptiontext,
                      textAlign: TextAlign.left,
                    ),
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
