import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';
import { useSightings } from '../hooks/useSightings';
import { Theme } from '../config/Theme';

export const SightingsScreen = () => {
  const { sightings, loading } = useSightings();

  const renderSighting = ({ item }) => {
    const locationText = item.location ? item.location.locality : 'Location unknown';

    return (
      <View>
        <Text>  </Text>
        <Text>{item.species}</Text>
        <Text>Confidence: {(item.confidence * 100).toFixed(1)}%</Text>
        <Text>{new Date(item.date).toLocaleDateString()}</Text>
        <Text>📍 {locationText}</Text>

        {item.alternatives && (
          <View>
            <Text>Could also be:</Text>
            <Text>• {item.alternatives[0].species} ({(item.alternatives[0].confidence * 100).toFixed(1)}%)</Text>
            <Text>• {item.alternatives[1].species} ({(item.alternatives[1].confidence * 100).toFixed(1)}%)</Text>
          </View>
        )}
      </View>
    );
  };

  let content;
  if (loading) {
    content = <Text>Loading...</Text>;
  } else {
    content = (
      <FlatList
        data={sightings}
        renderItem={renderSighting}
        keyExtractor={(item) => item.id}
      />
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>My Sightings</Text>
      {content}
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
