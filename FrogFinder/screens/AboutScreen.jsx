import React from 'react';
import { Text, StyleSheet, ImageBackground } from 'react-native';
import { Theme } from '../config/Theme';

export const AboutScreen = () => {
  return (
    <ImageBackground
      source={require('../assets/images/background_image.png')}
      style={styles.container}
      resizeMode="cover"
    >
      <Text style={styles.title}>About FrogFinder</Text>
      <Text>Description of the application.</Text>
    </ImageBackground>
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
