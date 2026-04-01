import React, { useState, useEffect } from 'react';
import { View, PanResponder, Animated, Text, TouchableOpacity } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AboutScreen } from './screens/AboutScreen';
import { ClassifyScreen } from './screens/ClassifyScreen';
import { SightingsScreen } from './screens/SightingsScreen';
import { Theme } from './config/Theme';

const SCREENS = [
  { name: 'About', component: AboutScreen },
  { name: 'Classify', component: ClassifyScreen },
  { name: 'Sightings', component: SightingsScreen },
];

// TODO: This handles screen navigation. Only a POC, front-end to handle how this interation works. Navigation buttons?
// TODO: This should honestly be replaced, I just needed something to handle screen navigation for testing the individual screens. Possible library that handles this?
export default function App() {
  const [currentScreen, setCurrentScreen] = useState(0);
  const currentScreenRef = React.useRef(0);
  const pan = React.useRef(new Animated.ValueXY()).current;

  const panResponder = React.useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderRelease: (event, gestureState) => {
        const swipeThreshold = 50;
        const screen = currentScreenRef.current;
        
        if (gestureState.dx > swipeThreshold && screen > 0) {
          setCurrentScreen(screen - 1);
        } else if (gestureState.dx < -swipeThreshold && screen < SCREENS.length - 1) {
          setCurrentScreen(screen + 1);
        }
        
        Animated.spring(pan, { toValue: { x: 0, y: 0 }, useNativeDriver: false }).start();
      },
    })
  ).current;

  useEffect(() => {
    currentScreenRef.current = currentScreen;
  }, [currentScreen]);

  const CurrentScreen = SCREENS[currentScreen].component;

  return (
    <View style={{ flex: 1, backgroundColor: Theme.colors.surface }}>
      <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: Theme.colors.surface }}>
        <View style={{ flex: 1, backgroundColor: Theme.colors.surface }} {...panResponder.panHandlers}>
          <CurrentScreen />
        </View>
      </SafeAreaView>

      <View style={styles.header}>
        <TouchableOpacity onPress={() => currentScreen > 0 && setCurrentScreen(currentScreen - 1)} disabled={currentScreen === 0}>
          <Text style={{ opacity: currentScreen === 0 ? 0.5 : 1 }}>← Back</Text>
        </TouchableOpacity>
        
        <Text style={styles.headerTitle}>{SCREENS[currentScreen].name}</Text>
        
        <TouchableOpacity onPress={() => currentScreen < SCREENS.length - 1 && setCurrentScreen(currentScreen + 1)} disabled={currentScreen === SCREENS.length - 1}>
          <Text style={{ opacity: currentScreen === SCREENS.length - 1 ? 0.5 : 1 }}>Next →</Text>
        </TouchableOpacity>
      </View>

      <StatusBar style="auto" />
    </View>
  );
};

const styles = {
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Theme.spacing.md,
    paddingVertical: Theme.spacing.md,
    paddingBottom: 70,
    backgroundColor: Theme.colors.primary,
    marginBottom: 0,
  },
  headerTitle: {
    ...Theme.typography.body,
    fontWeight: 'bold',
    color: Theme.colors.surface,
  },
};
