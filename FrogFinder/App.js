/*
 * Purpose: Root application component; renders the global header, tab bar, and
 *          horizontal swipe navigation between the three main screens.
 * Inputs:  None (app entry point).
 * Outputs: Top-level React tree mounted by Expo.
 */
import React, { useState, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ImageBackground, ScrollView, Dimensions } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { AboutScreen } from './screens/AboutScreen';
import { ClassifyScreen } from './screens/ClassifyScreen';
import { SightingsScreen } from './screens/SightingsScreen';

const SCREENS = [
  { key: 'Search',    label: 'Search',   component: AboutScreen },
  { key: 'Record',    label: 'Record',   component: ClassifyScreen },
  { key: 'Sightings', label: 'Sightings',component: SightingsScreen },
];

const { width: SCREEN_W } = Dimensions.get('window');

export default function App() {
  const [currentScreen, setCurrentScreen] = useState(1);
  const scrollRef = useRef(null);

  const goToScreen = (index) => {
    setCurrentScreen(index);
    scrollRef.current?.scrollTo({ x: index * SCREEN_W, animated: true });
  };

  const handleScrollEnd = (e) => {
    const index = Math.round(e.nativeEvent.contentOffset.x / SCREEN_W);
    if (index !== currentScreen) setCurrentScreen(index);
  };

  return (
    <SafeAreaProvider>
      <ImageBackground
        source={require('./assets/images/background_image.png')}
        style={styles.bg}
        resizeMode="cover"
      >
        <StatusBar style="dark" />

        <SafeAreaView edges={['top']} style={styles.headerSafe}>
          <View style={styles.header}>
            <Text style={styles.superTitle}>BIOACOUSTICS</Text>
            <Text style={styles.appTitle}>FrogFinder</Text>

            <View style={styles.tabBar}>
              {SCREENS.map((screen, index) => (
                <TouchableOpacity
                  key={screen.key}
                  style={[styles.tab, currentScreen === index && styles.tabActive]}
                  onPress={() => goToScreen(index)}
                >
                  <Text style={[styles.tabText, currentScreen === index && styles.tabTextActive]}>
                    {screen.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </SafeAreaView>

        <View style={styles.content}>
          <ScrollView
            ref={scrollRef}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            scrollEventThrottle={16}
            onMomentumScrollEnd={handleScrollEnd}
            contentOffset={{ x: SCREEN_W, y: 0 }}
            style={StyleSheet.absoluteFill}
          >
            {SCREENS.map((screen, index) => (
              <View key={screen.key} style={styles.page}>
                <screen.component isActive={currentScreen === index} />
              </View>
            ))}
          </ScrollView>
        </View>
      </ImageBackground>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  bg:         { flex: 1 },
  headerSafe: { backgroundColor: '#FFFFFF' },
  header: {
    alignItems: 'center',
    paddingTop: 8,
    paddingBottom: 16,
    backgroundColor: '#FFFFFF',
  },
  superTitle: {
    fontSize: 11,
    letterSpacing: 3,
    color: 'rgba(46,80,48,0.55)',
    fontWeight: '500',
    marginBottom: 2,
  },
  appTitle: {
    fontSize: 30,
    fontWeight: 'bold',
    color: '#2E5030',
    marginBottom: 14,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: 'rgba(46,80,48,0.1)',
    borderRadius: 50,
    padding: 3,
  },
  tab: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 50,
  },
  tabActive:     { backgroundColor: '#2E5030' },
  tabText:       { fontSize: 14, color: 'rgba(46,80,48,0.55)', fontWeight: '500' },
  tabTextActive: { color: '#FFFFFF', fontWeight: '700' },
  content: { flex: 1 },
  page:    { width: SCREEN_W, flex: 1 },
});
