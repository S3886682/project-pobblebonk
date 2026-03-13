import 'package:flutter/material.dart';
import 'package:flutter_app/data/notifiers.dart';
import 'package:flutter_app/views/pages/settings.dart';
import 'package:flutter_app/views/pages/welcome_page.dart';

void main() {
  runApp(const MyApp());
}

class MyApp extends StatefulWidget {
  const MyApp({super.key});

  @override
  State<MyApp> createState() => _MyAppState();
}

class _MyAppState extends State<MyApp> {
  @override
  Widget build(BuildContext context) {
    return ValueListenableBuilder(
      valueListenable: isDarkModeNotifier,
      builder: (BuildContext context, dynamic isDarkMode, Widget? child) {
        return MaterialApp(
          debugShowCheckedModeBanner: false,
          title: 'FrogFinder',
          theme: ThemeData(
            colorScheme: ColorScheme.fromSeed(
              seedColor: Colors.green,
              brightness: isDarkMode ? Brightness.light : Brightness.dark,
            ),
          ),
          home: WelcomePage(), // actual home page
          // home: TestScreen(), // Test connection to python
          routes: {
            '/settings': (context) => const SettingsPage(),
          },
        );
      },
    );
  }
}
