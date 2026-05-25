import React from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';
import { useSightings } from '../hooks/useSightings';
import speciesData from '../assets/data/speciesDetails.json';

const LIGHT_GREEN = '#EEF4EE';
const DARK  = '#1C1C1E';
const GREEN = '#4A7C59';

const SightingCard = ({ item }) => {
  const locationText = item.location?.locality ?? 'Location unknown';
  const date = new Date(item.date).toLocaleDateString('en-AU', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
  const confidence = item.confidence ?? 0;

  const speciesInfo = speciesData.find(
    s => s.name.toLowerCase() === item.species.toLowerCase()
  );

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.cardHeaderLeft}>
          <Text style={styles.speciesName}>{item.species}</Text>
          {speciesInfo?.scientific_name ? (
            <Text style={styles.scientificName}>{speciesInfo.scientific_name}</Text>
          ) : null}
        </View>
        <Text style={styles.confidencePct}>{(confidence * 100).toFixed(0)}%</Text>
      </View>

      <View style={styles.barTrack}>
        <View style={[styles.barFill, { width: `${(confidence * 100).toFixed(0)}%` }]} />
      </View>

      <Text style={styles.meta}>{locationText}  ·  {date}</Text>

      {item.alternatives?.length > 0 && (
        <View style={styles.alternatives}>
          <Text style={styles.altTitle}>Could also be:</Text>
          {item.alternatives.map((alt, i) => (
            <View key={i} style={styles.altRow}>
              <Text style={styles.altName}>{alt.species}</Text>
              <Text style={styles.altPct}>{(alt.confidence * 100).toFixed(0)}%</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
};

export const SightingsScreen = () => {
  const { sightings, loading } = useSightings();

  return (
    <View style={styles.screen}>
      <FlatList
        data={sightings}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <SightingCard item={item} />}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            {loading ? (
              <Text style={styles.emptyText}>Loading...</Text>
            ) : (
              <>
                <Text style={styles.emptyTitle}>No Sightings Yet</Text>
                <Text style={styles.emptySubtitle}>
                  Identified frogs will appear here after you record or upload a call.
                </Text>
              </>
            )}
          </View>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: LIGHT_GREEN,
  },
  list: {
    padding: 16,
    flexGrow: 1,
  },

  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  cardHeaderLeft: {
    flex: 1,
  },
  speciesName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: DARK,
  },
  scientificName: {
    fontSize: 13,
    fontStyle: 'italic',
    color: '#777',
    marginTop: 2,
  },
  confidencePct: {
    fontSize: 24,
    fontWeight: 'bold',
    color: DARK,
    marginLeft: 8,
  },

  barTrack: {
    height: 5,
    backgroundColor: '#E8E8E8',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 10,
  },
  barFill: {
    height: '100%',
    backgroundColor: GREEN,
    borderRadius: 3,
  },

  meta: {
    fontSize: 12,
    color: '#999',
  },

  alternatives: {
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    marginTop: 10,
    paddingTop: 10,
  },
  altTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#999',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  altRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  altName: {
    fontSize: 13,
    color: '#555',
  },
  altPct: {
    fontSize: 13,
    color: '#777',
    fontWeight: '600',
  },

  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    paddingHorizontal: 32,
  },
  emptyIcon: {
    fontSize: 56,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: DARK,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 15,
    color: '#888',
    textAlign: 'center',
    lineHeight: 22,
  },
  emptyText: {
    fontSize: 15,
    color: '#999',
    textAlign: 'center',
  },
});
