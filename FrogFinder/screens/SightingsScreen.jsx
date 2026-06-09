/*
 * Purpose: Sightings history screen — displays a list of previously identified
 *          frog sightings with confidence scores, location, alternatives, and
 *          export/delete actions.
 * Inputs:  isActive prop (boolean) — refreshes the list when the tab becomes active.
 * Outputs: Rendered scrollable list of sighting cards; share sheet on export.
 */
import React, { useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Share, Alert } from 'react-native';
import { useSightings } from '../hooks/useSightings';
import speciesData from '../assets/data/speciesDetails.json';

const LIGHT_GREEN = '#EEF4EE';
const DARK  = '#1C1C1E';
const GREEN = '#4A7C59';

const SightingCard = ({ item, onDelete }) => {
  const locationText = item.location?.locality ?? 'Location unknown';
  const date = new Date(item.date).toLocaleDateString('en-AU', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
  const confidence = item.confidence ?? 0;

  const speciesInfo = speciesData.find(
    s => s.name.toLowerCase() === item.species.toLowerCase()
  );

  const handleExport = async () => {
    const altLines = item.alternatives?.length
      ? item.alternatives.map(a => `  - ${a.species}: ${(a.confidence * 100).toFixed(0)}%`).join('\n')
      : '  None';

    const text = [
      `FrogFinder Sighting`,
      `Species: ${item.species}`,
      speciesInfo?.scientific_name ? `Scientific name: ${speciesInfo.scientific_name}` : null,
      `Confidence: ${(confidence * 100).toFixed(0)}%`,
      `Date: ${date}`,
      `Location: ${locationText}`,
      `Alternatives:\n${altLines}`,
    ].filter(Boolean).join('\n');

    await Share.share({ message: text, title: `Sighting – ${item.species}` });
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Sighting',
      `Remove the ${item.species} sighting?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => onDelete(item.id) },
      ]
    );
  };

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

      <View style={styles.cardActions}>
        <TouchableOpacity style={styles.exportBtn} onPress={handleExport}>
          <Text style={styles.exportBtnText}>Export</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.deleteBtn} onPress={handleDelete}>
          <Text style={styles.deleteBtnText}>Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export const SightingsScreen = ({ isActive }) => {
  const { sightings, loading, deleteSighting, fetchSightings } = useSightings();

  useEffect(() => {
    if (isActive) fetchSightings();
  }, [isActive]);

  return (
    <View style={styles.screen}>
      <FlatList
        data={sightings}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <SightingCard item={item} onDelete={deleteSighting} />}
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
  screen: { flex: 1, backgroundColor: 'transparent' },
  list:   { padding: 16, flexGrow: 1 },

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
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10 },
  cardHeaderLeft: { flex: 1 },
  speciesName:  { fontSize: 18, fontWeight: 'bold', color: DARK },
  scientificName: { fontSize: 13, fontStyle: 'italic', color: '#777', marginTop: 2 },
  confidencePct: { fontSize: 24, fontWeight: 'bold', color: DARK, marginLeft: 8 },

  barTrack: {
    height: 5, backgroundColor: '#E8E8E8',
    borderRadius: 3, overflow: 'hidden', marginBottom: 10,
  },
  barFill: { height: '100%', backgroundColor: GREEN, borderRadius: 3 },

  meta: { fontSize: 12, color: '#999' },

  alternatives: {
    borderTopWidth: 1, borderTopColor: '#F0F0F0',
    marginTop: 10, paddingTop: 10,
  },
  altTitle: {
    fontSize: 12, fontWeight: '600', color: '#999',
    marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5,
  },
  altRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  altName: { fontSize: 13, color: '#555' },
  altPct:  { fontSize: 13, color: '#777', fontWeight: '600' },

  cardActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  exportBtn: {
    flex: 1,
    backgroundColor: GREEN,
    borderRadius: 10,
    paddingVertical: 9,
    alignItems: 'center',
  },
  exportBtnText: { color: '#FFF', fontSize: 13, fontWeight: '600' },
  deleteBtn: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#DDD',
    alignItems: 'center',
  },
  deleteBtnText: { color: '#999', fontSize: 13, fontWeight: '600' },

  emptyState: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingVertical: 80, paddingHorizontal: 32,
  },
  emptyTitle:    { fontSize: 22, fontWeight: 'bold', color: DARK, marginBottom: 8, textAlign: 'center' },
  emptySubtitle: { fontSize: 15, color: '#888', textAlign: 'center', lineHeight: 22 },
  emptyText:     { fontSize: 15, color: '#999', textAlign: 'center' },
});
