import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Theme } from '../config/Theme';

export const AboutScreen = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>About FrogFinder</Text>
      <Text>This application is designed to assist enthusiasts and researchers with identifying frog species found in Victoria. Simply record or upload an audio file of the frog call and receive a real-time assessment of the most likely frog type.</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: Theme.spacing.md,
    paddingTop: 60,
  },
  title: {
    ...Theme.typography.h2,
    marginBottom: Theme.spacing.md,
    color: Theme.colors.text,
  },
});
