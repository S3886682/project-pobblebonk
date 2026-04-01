import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Theme } from '../config/Theme';

export const AboutScreen = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>About FrogFinder</Text>
      <Text>Description of the application.</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: Theme.spacing.md,
  },
  title: {
    ...Theme.typography.h2,
    marginBottom: Theme.spacing.md,
    color: Theme.colors.text,
  },
});
