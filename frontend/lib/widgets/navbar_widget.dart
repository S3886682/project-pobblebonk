import 'package:flutter/material.dart';
import 'package:flutter_app/data/notifiers.dart';

class NavbarWidget extends StatelessWidget {
  const NavbarWidget({super.key});
  static const List<String> pages = [
    "Home",
    "How It Works",
    "Identify Frog",
    "Mission",
    "Community",
    "Contact",
  ];

  @override
  Widget build(BuildContext context) {
    final Color navbarColor = Theme.of(context).primaryColor;
    final double screenWidth = MediaQuery.of(context).size.width;

    // Simplified bottom navigation for mobile devices (or narrow screens)
    if (screenWidth < 800) {
      return _buildSimplifiedBottomNavigation(context, navbarColor);
    } else {
      return _buildOriginalTopNavigation(context, navbarColor);
    }
  }

  Widget _buildSimplifiedBottomNavigation(
    BuildContext context,
    Color navbarColor,
  ) {
    return ValueListenableBuilder<int>(
      valueListenable: selectedPageNotifier,
      builder: (context, selectedPage, child) {
        // Convert selectedPage to simplified naviation index
        int bottomNavIndex = 0; // default to Home page
        if (selectedPage == 2) bottomNavIndex = 1;
        return Container(
          decoration: BoxDecoration(
            color: navbarColor,
            boxShadow: [
              BoxShadow(
                color: Colors.black26,
                blurRadius: 4,
                offset: Offset(0, -2),
              ),
            ],
          ),
          child: BottomNavigationBar(
            backgroundColor: navbarColor,
            selectedItemColor: Colors.white,
            unselectedItemColor: Colors.white70,
            currentIndex: bottomNavIndex,
            type: BottomNavigationBarType.fixed,
            onTap: (index) {
              if (index == 0) {
                selectedPageNotifier.value = 0; // Home
              } else if (index == 1) {
                selectedPageNotifier.value = 2; // Audio/record page
              }
            },
            items: [
              BottomNavigationBarItem(icon: Icon(Icons.home), label: "Home"),
              BottomNavigationBarItem(icon: Icon(Icons.mic), label: "Record"),
            ],
          ),
        );
      },
    );
  }

  Widget _buildOriginalTopNavigation(BuildContext context, Color navbarColor) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 24.0, vertical: 12.0),
      decoration: BoxDecoration(
        color: navbarColor,
        border: Border(bottom: BorderSide(color: Colors.grey.shade300)),
      ),
      child: ValueListenableBuilder<int>(
        valueListenable: selectedPageNotifier,
        builder: (context, selectedPage, child) {
          return Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              // 🍔 Hamburger menu
              Builder(
                builder:
                    (context) => IconButton(
                      icon: const Icon(Icons.menu),
                      onPressed: () {
                        Scaffold.of(context).openDrawer();
                      },
                    ),
              ),
              // 🔠 Page links
              Row(
                children: List.generate(pages.length, (index) {
                  return Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 12.0),
                    child: TextButton(
                      onPressed: () {
                        selectedPageNotifier.value = index;
                      },
                      child: Text(
                        pages[index],
                        style: TextStyle(
                          fontWeight:
                              selectedPage == index
                                  ? FontWeight.bold
                                  : FontWeight.normal,
                          fontSize: 16.0,
                          color:
                              selectedPage == index
                                  ? Theme.of(context)
                                      .colorScheme
                                      .onPrimary // Contrast color
                                  : Colors
                                      .white, // Change text color to white on dark navbar
                        ),
                      ),
                    ),
                  );
                }),
              ),
              // 🌗 Dark mode & settings
              Row(
                children: [
                  ValueListenableBuilder(
                    valueListenable: isDarkModeNotifier,
                    builder: (context, isDarkMode, _) {
                      return IconButton(
                        onPressed: () {
                          isDarkModeNotifier.value = !isDarkModeNotifier.value;
                        },
                        icon: Icon(
                          isDarkMode ? Icons.light_mode : Icons.dark_mode,
                        ),
                      );
                    },
                  ),
                  IconButton(
                    onPressed: () {
                      Navigator.pushNamed(context, '/settings');
                    },
                    icon: const Icon(Icons.settings),
                  ),
                ],
              ),
            ],
          );
        },
      ),
    );
  }
}
