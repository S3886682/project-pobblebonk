import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
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

export default function App() {
  const [currentScreen, setCurrentScreen] = useState(1);
  return (
    <SafeAreaProvider>
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        <StatusBar style="light" />

        <View style={styles.header}>
          <Text style={styles.superTitle}>BIOACOUSTICS</Text>
          <Text style={styles.appTitle}>FrogFinder</Text>

          <View style={styles.tabBar}>
            {SCREENS.map((screen, index) => (
              <TouchableOpacity
                key={screen.key}
                style={[styles.tab, currentScreen === index && styles.tabActive]}
                onPress={() => setCurrentScreen(index)}
              >
                <Text style={[styles.tabText, currentScreen === index && styles.tabTextActive]}>
                  {screen.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/*
          Render all screens at once but hide inactive ones with display:'none'.
          This keeps each screen mounted so state (classification results, etc.)
          is preserved when the user switches tabs.
        */}
        <View style={styles.content}>
          {SCREENS.map((screen, index) => (
            <View
              key={screen.key}
              style={[StyleSheet.absoluteFill, currentScreen !== index && styles.hidden]}
            >
              <screen.component />
            </View>
          ))}
        </View>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#2E5030',
  },
  header: {
    alignItems: 'center',
    paddingTop: 8,
    paddingBottom: 16,
    backgroundColor: '#2E5030',
  },
  superTitle: {
    fontSize: 11,
    letterSpacing: 3,
    color: 'rgba(255,255,255,0.6)',
    fontWeight: '500',
    marginBottom: 2,
  },
  appTitle: {
    fontSize: 30,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 14,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0,0,0,0.25)',
    borderRadius: 50,
    padding: 3,
  },
  tab: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 50,
  },
  tabActive: {
    backgroundColor: '#FFFFFF',
  },
  tabText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    fontWeight: '500',
  },
  tabTextActive: {
    color: '#2E5030',
    fontWeight: '700',
  },
  content: {
    flex: 1,
  },
  hidden: {
    display: 'none',
  },
});
