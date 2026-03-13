import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_app/views/widget_tree.dart';
import 'package:lottie/lottie.dart';

class WelcomePage extends StatelessWidget {
  const WelcomePage({super.key});

  bool isMobile(BuildContext context) {
    final width = MediaQuery.of(context).size.width;
    return width < 600 && !kIsWeb;
  }

  @override
  Widget build(BuildContext context) {
    final bool mobile = isMobile(context);

    return Scaffold(
      body: LayoutBuilder(
        builder: (context, constraints) {
          double maxWidth =
              constraints.maxWidth > 800 ? 800 : constraints.maxWidth * 0.95;

          double screenHeight = constraints.maxHeight;
          double animationHeight = mobile ? 300 : screenHeight * 0.5;

          return Center(
            child: SingleChildScrollView(
              child: ConstrainedBox(
                constraints: BoxConstraints(
                  maxWidth: maxWidth,
                ),
                child: Padding(
                  padding: const EdgeInsets.symmetric(vertical: 40.0),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      // Animation with fixed height
                      SizedBox(
                        height: animationHeight,
                        child: Lottie.asset(
                          'assets/lotties/FrogAnimation.json',
                          fit: BoxFit.contain,
                        ),
                      ),

                      const SizedBox(height: 20),

                      // Text with dynamic sizing
                      LayoutBuilder(
                        builder: (context, textConstraints) {
                          double fontSize =
                              (textConstraints.maxHeight * 0.1).clamp(24, 64);
                          double letterSpacing = (fontSize / 8).clamp(2, 8);

                          return Text(
                            'Frog Finder',
                            textAlign: TextAlign.center,
                            style: TextStyle(
                              fontWeight: FontWeight.bold,
                              fontSize: fontSize,
                              letterSpacing: letterSpacing,
                            ),
                          );
                        },
                      ),

                      const SizedBox(height: 20),

                      // Button
                      SizedBox(
                        width: double.infinity,
                        height: 60,
                        child: FilledButton(
                          onPressed: () {
                            Navigator.pushReplacement(
                              context,
                              MaterialPageRoute(
                                builder: (context) => const WidgetTree(),
                              ),
                            );
                          },
                          style: FilledButton.styleFrom(
                            padding:
                                const EdgeInsets.symmetric(vertical: 16.0),
                          ),
                          child: const Text(
                            'Get Started',
                            style: TextStyle(
                              fontSize: 20,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          );
        },
      ),
    );
  }
}
