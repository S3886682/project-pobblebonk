import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_app/data/notifiers.dart';
import 'package:flutter_app/views/pages/home_page.dart';
import 'package:flutter_app/views/pages/audio_page.dart';
import 'package:flutter_app/views/pages/community_page.dart';
import 'package:flutter_app/views/pages/how_it_works_page.dart';
import 'package:flutter_app/views/pages/contact_page.dart';
import 'package:flutter_app/views/pages/mission_page.dart';
import 'package:flutter_app/views/pages/welcome_page.dart';
import 'package:flutter_app/widgets/navbar_widget.dart';

class WidgetTree extends StatelessWidget {
  const WidgetTree({super.key});

  @override
  Widget build(BuildContext context) {
    // List of pages corresponding to each index in the navbar
    List<Widget> pages = const [
      HomePage(),
      HowItWorksPage(),
      AudioPage(), // AKA Identify Frog Page
      MissionPage(),
      CommunityPage(),
      ContactPage(),
    ];

    final double screenWidth = MediaQuery.of(context).size.width;
    final bool isMobile = screenWidth < 800;

    return PopScope(
      canPop: false,
      onPopInvokedWithResult: (didPop, result) async {
        if (didPop) return;

        // Back button logic
        if (selectedPageNotifier.value != 0) {
          // If not on home page, go to home
          selectedPageNotifier.value = 0;
        } else {
          // If on home page, show exit confirmation
          final shouldExit = await _showExitDialog(context);
          if (shouldExit) {
            SystemNavigator.pop();
          }
        }
      },
      child: Scaffold(
        drawer: SafeArea(
          child: Drawer(
            child: Column(
              children: [
                const DrawerHeader(child: Text("Menu")),
                ListTile(
                  leading: Icon(Icons.home),
                  title: const Text('Home'),
                  onTap: () {
                    selectedPageNotifier.value = 0;
                    Navigator.pushReplacement(
                      context,
                      MaterialPageRoute(
                        builder: (context) => const WelcomePage(),
                      ),
                    );
                  },
                ),
              ],
            ),
          ),
        ),
        body:
            isMobile
                ? Column(
                  children: [
                    Expanded(
                      child: ValueListenableBuilder<int>(
                        valueListenable: selectedPageNotifier,
                        builder: (BuildContext context, selectedPage, child) {
                          return pages[selectedPage];
                        },
                      ),
                    ),
                    const NavbarWidget(),
                  ],
                )
                : Column(
                  children: [
                    const NavbarWidget(),
                    Expanded(
                      child: ValueListenableBuilder<int>(
                        valueListenable: selectedPageNotifier,
                        builder: (BuildContext context, selectedPage, child) {
                          return pages[selectedPage];
                        },
                      ),
                    ),
                  ],
                ),
      ),
    );
  }

  Future<bool> _showExitDialog(BuildContext context) async {
    return await showDialog<bool>(
          context: context,
          builder:
              (context) => AlertDialog(
                title: const Text('Exit FrogFinder?'),
                content: const Text('Are you sure you want to exit the app?'),
                actions: [
                  TextButton(
                    onPressed: () => Navigator.of(context).pop(false),
                    child: const Text('Cancel'),
                  ),
                  TextButton(
                    onPressed: () => Navigator.of(context).pop(true),
                    child: const Text('Exit'),
                  ),
                ],
              ),
        ) ??
        false;
  }
}
