import { useState, useRef } from 'react';
import { View, Text, TouchableOpacity, PanResponder } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { AboutScreen } from './screens/AboutScreen';
import { ClassifyScreen } from './screens/ClassifyScreen';
import { SightingsScreen } from './screens/SightingsScreen';
import { Theme } from './config/Theme';

const TABS = [
  { name: 'About',    component: AboutScreen },
  { name: 'Record',   component: ClassifyScreen },
  { name: 'Sightings', component: SightingsScreen },
];

export default function App() {
  const [activeTab, setActiveTab] = useState(1);
  const activeTabRef = useRef(1);

  const panResponder = useRef(PanResponder.create({
    onMoveShouldSetPanResponder: (_, { dx, dy }) => Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 10,
    onPanResponderRelease: (_, { dx }) => {
      const i = activeTabRef.current;
      if (dx < -50 && i < TABS.length - 1) { activeTabRef.current = i + 1; setActiveTab(i + 1); }
      if (dx >  50 && i > 0)               { activeTabRef.current = i - 1; setActiveTab(i - 1); }
    },
  })).current;

  return (
    <SafeAreaProvider>
    <View style={{ flex: 1, backgroundColor: Theme.colors.background }}>
      <StatusBar style="light" />

      <SafeAreaView edges={['top']} style={{ backgroundColor: Theme.colors.background }}>
        <Text style={styles.subtitle}>BIOACOUSTICS</Text>
        <Text style={styles.title}>FrogFinder</Text>

        <View style={styles.tabBar}>
          {TABS.map((tab, i) => (
            <TouchableOpacity
              key={tab.name}
              onPress={() => { activeTabRef.current = i; setActiveTab(i); }}
              style={[styles.tab, activeTab === i && styles.tabActive]}
            >
              <Text style={[styles.tabText, activeTab === i && styles.tabTextActive]}>
                {tab.name}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </SafeAreaView>

      <View style={{ flex: 1 }} {...panResponder.panHandlers}>
        {TABS.map(({ name, component: Screen }, i) => (
          <View key={name} style={{ flex: 1, display: activeTab === i ? 'flex' : 'none' }}>
            <Screen />
          </View>
        ))}
      </View>
    </View>
    </SafeAreaProvider>
  );
}

const styles = {
  subtitle: {
    textAlign: 'center',
    letterSpacing: 4,
    fontSize: 11,
    color: Theme.colors.textSecondary,
    marginTop: Theme.spacing.md,
  },
  title: {
    textAlign: 'center',
    fontSize: 36,
    fontWeight: 'bold',
    color: Theme.colors.text,
    marginVertical: Theme.spacing.sm,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: Theme.colors.card,
    borderRadius: Theme.borderRadius.full,
    margin: Theme.spacing.md,
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: Theme.spacing.sm,
    borderRadius: Theme.borderRadius.full,
    alignItems: 'center',
  },
  tabActive: {
    backgroundColor: Theme.colors.text,
  },
  tabText: {
    color: Theme.colors.textSecondary,
    fontWeight: '600',
    fontSize: 14,
  },
  tabTextActive: {
    color: Theme.colors.background,
  },
};
