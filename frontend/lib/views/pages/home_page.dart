import 'package:flutter/material.dart';
import 'package:flutter_app/data/constants.dart';
import 'package:flutter_app/data/notifiers.dart';

class HomePage extends StatelessWidget {
  const HomePage({super.key});

  @override
  Widget build(BuildContext context) {
    final double screenWidth = MediaQuery.of(context).size.width;
    final bool isMobile = screenWidth < 800;

    return Padding(
      padding: EdgeInsets.all(isMobile ? 12.0 : 20.0),
      child: SingleChildScrollView(
        child: Column(
          children: [
            // Welcome Section
            _buildWelcomeCard(isMobile),

            SizedBox(height: isMobile ? 16 : 20),

            // Quick Actions Section
            _buildQuickActionsSection(isMobile),

            SizedBox(height: isMobile ? 16 : 20),

            // Information Section
            _buildInformationSection(isMobile),

            SizedBox(height: isMobile ? 16 : 20),

            // Featured Frog Section
            _buildFeaturedFrogCard(isMobile),

            SizedBox(height: isMobile ? 16 : 20),

            _buildSettingsLink(context, isMobile),
          ],
        ),
      ),
    );
  }

  Widget _buildWelcomeCard(bool isMobile) {
    return Card(
      elevation: 3,
      child: Padding(
        padding: EdgeInsets.all(isMobile ? 16.0 : 24.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(Icons.adjust_rounded, color: Colors.teal, size: 32),
                SizedBox(width: 12),
                Expanded(
                  child: Text(
                    'Welcome to FrogFinder',
                    style: kTextStyle.titleTealText.copyWith(
                      fontSize: isMobile ? 22 : 25,
                    ),
                  ),
                ),
              ],
            ),
            SizedBox(height: 12),
            Text(
              'Your ultimate tool for identifying frog species from their calls! Record a frog sound or upload an existing recording and discover what species you\'ve found.',
              style: kTextStyle.descriptiontext.copyWith(
                fontSize: isMobile ? 14 : 16,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildQuickActionsSection(bool isMobile) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: EdgeInsets.symmetric(horizontal: 8.0),
          child: Text(
            'Get Started',
            style: TextStyle(
              fontSize: isMobile ? 18 : 20,
              fontWeight: FontWeight.bold,
              color: Colors.teal,
            ),
          ),
        ),
        SizedBox(height: 12),

        // Single unified card
        Card(
          elevation: 4,
          child: InkWell(
            borderRadius: BorderRadius.circular(12),
            onTap: () {
              selectedPageNotifier.value = 2; // Navigate to Audio/Record page
            },
            child: Padding(
              padding: EdgeInsets.all(isMobile ? 20.0 : 24.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Header
                  Row(
                    children: [
                      Container(
                        padding: EdgeInsets.all(14),
                        decoration: BoxDecoration(
                          color: Colors.teal,
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: Icon(
                          Icons.audiotrack,
                          size: 28,
                          color: Colors.white,
                        ),
                      ),
                      SizedBox(width: 16),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'Identify Your Frog',
                              style: TextStyle(
                                fontSize: isMobile ? 18 : 20,
                                fontWeight: FontWeight.bold,
                                color: Colors.teal[800],
                              ),
                            ),
                            SizedBox(height: 4),
                            Text(
                              'Go to the recording and upload page',
                              style: TextStyle(
                                fontSize: isMobile ? 14 : 16,
                                color: Colors.grey[600],
                              ),
                            ),
                          ],
                        ),
                      ),
                      Icon(Icons.arrow_forward_ios, color: Colors.grey[400]),
                    ],
                  ),

                  SizedBox(height: 16),
                ],
              ),
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildInformationSection(bool isMobile) {
    final List<Map<String, dynamic>> infoCards = [
      {
        'title': 'How It Works',
        'description': 'Learn how FrogFinder identifies species',
        'icon': Icons.info_outline,
        'pageIndex': 1,
        'color': Colors.blue,
      },
      {
        'title': 'Our Mission',
        'description': 'Discover why we built FrogFinder',
        'icon': Icons.volunteer_activism,
        'pageIndex': 3,
        'color': Colors.green,
      },
      {
        'title': 'Community',
        'description': 'Join our community of frog enthusiasts',
        'icon': Icons.people,
        'pageIndex': 4,
        'color': Colors.orange,
      },
      {
        'title': 'Contact Us',
        'description': 'Get in touch with the FrogFinder team',
        'icon': Icons.mail_outline,
        'pageIndex': 5,
        'color': Colors.purple,
      },
    ];

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: EdgeInsets.symmetric(horizontal: 8.0),
          child: Text(
            'Learn More',
            style: TextStyle(
              fontSize: isMobile ? 18 : 20,
              fontWeight: FontWeight.bold,
              color: Colors.teal,
            ),
          ),
        ),
        SizedBox(height: 12),

        // Grid of info cards
        GridView.builder(
          shrinkWrap: true,
          physics: NeverScrollableScrollPhysics(),
          gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
            crossAxisCount: isMobile ? 2 : 4,
            childAspectRatio: isMobile ? 1.1 : 1.0,
            crossAxisSpacing: 12,
            mainAxisSpacing: 12,
          ),
          itemCount: infoCards.length,
          itemBuilder: (context, index) {
            final card = infoCards[index];
            return Card(
              elevation: 2,
              child: InkWell(
                borderRadius: BorderRadius.circular(12),
                onTap: () {
                  selectedPageNotifier.value = card['pageIndex'];
                },
                child: Padding(
                  padding: EdgeInsets.all(isMobile ? 12.0 : 16.0),
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Container(
                        padding: EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: (card['color'] as Color).withAlpha(25),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Icon(
                          card['icon'],
                          size: isMobile ? 24 : 28,
                          color: card['color'],
                        ),
                      ),
                      SizedBox(height: 8),
                      Text(
                        card['title'],
                        style: TextStyle(
                          fontSize: isMobile ? 14 : 16,
                          fontWeight: FontWeight.bold,
                        ),
                        textAlign: TextAlign.center,
                      ),
                      SizedBox(height: 4),
                      Text(
                        card['description'],
                        style: TextStyle(
                          fontSize: isMobile ? 12 : 14,
                          color: Colors.grey[600],
                        ),
                        textAlign: TextAlign.center,
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ],
                  ),
                ),
              ),
            );
          },
        ),
      ],
    );
  }

  Widget _buildFeaturedFrogCard(bool isMobile) {
    return Card(
      elevation: 3,
      child: Padding(
        padding: EdgeInsets.all(isMobile ? 16.0 : 20.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(Icons.star, color: Colors.amber, size: 24),
                SizedBox(width: 8),
                Text(
                  'Featured Frog',
                  style: TextStyle(
                    fontSize: isMobile ? 18 : 20,
                    fontWeight: FontWeight.bold,
                    color: Colors.teal,
                  ),
                ),
              ],
            ),
            SizedBox(height: 16),
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Container(
                  width: isMobile ? 80 : 100,
                  height: isMobile ? 80 : 100,
                  decoration: BoxDecoration(
                    color: Colors.teal.withAlpha(50),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: ClipRRect(
                    borderRadius: BorderRadius.circular(12),
                    child: Image.asset(
                      'assets/images/frog_images/green_tree_frog.png',
                      width: isMobile ? 80 : 100,
                      height: isMobile ? 80 : 100,
                      fit: BoxFit.cover,
                    ),
                  ),
                ),
                SizedBox(width: 16),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Green Tree Frog',
                        style: TextStyle(
                          fontSize: isMobile ? 16 : 18,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      SizedBox(height: 8),
                      Text(
                        'Large bright green frog often found around houses and water tanks',
                        style: TextStyle(
                          fontSize: isMobile ? 14 : 16,
                          color: Colors.grey[700],
                        ),
                      ),
                      SizedBox(height: 12),
                    ],
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildSettingsLink(BuildContext context, bool isMobile) {
    return InkWell(
      onTap: () {
        Navigator.pushNamed(context, '/settings');
      },
      borderRadius: BorderRadius.circular(12),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: isMobile ? 80 : 100,
            height: isMobile ? 80 : 100,
            decoration: BoxDecoration(
              color: Colors.teal.withAlpha(50),
              borderRadius: BorderRadius.circular(12),
            ),
            child: ClipRRect(
              borderRadius: BorderRadius.circular(12),
              child: Icon(Icons.settings, size: isMobile ? 40 : 50),
            ),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Settings',
                  style: TextStyle(
                    fontSize: isMobile ? 16 : 18,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  'Tap here to update the server IP address used by the app',
                  style: TextStyle(
                    fontSize: isMobile ? 14 : 16,
                    color: Colors.grey[700],
                  ),
                ),
                const SizedBox(height: 12),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
