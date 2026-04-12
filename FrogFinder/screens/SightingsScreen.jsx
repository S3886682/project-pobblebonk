import { View, Text, FlatList, ActivityIndicator } from 'react-native';
import { useSightings } from '../hooks/useSightings';
import { Theme } from '../config/Theme';

const SightingCard = ({ item }) => {
  const location = item.location ? item.location.locality : 'Location unknown';
  const date = new Date(item.date).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' });

  return (
    <View style={styles.card}>

      {/* Header row */}
      <View style={styles.headerRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.species}>{item.species}</Text>
          <Text style={styles.meta}>{date} · {location}</Text>
        </View>
        <Text style={styles.confidence}>{(item.confidence * 100).toFixed(0)}%</Text>
      </View>

      {/* Confidence bar */}
      <View style={styles.barTrack}>
        <View style={[styles.barFill, { width: `${item.confidence * 100}%` }]} />
      </View>

      {/* Alternatives */}
      {item.alternatives && (
        <View style={styles.alternatives}>
          {item.alternatives.map((alt, i) => (
            <View key={i} style={styles.altRow}>
              <Text style={styles.altSpecies}>{alt.species}</Text>
              <Text style={styles.altConfidence}>{(alt.confidence * 100).toFixed(0)}%</Text>
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
      {loading ? (
        <ActivityIndicator color={Theme.colors.primary} size="large" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={sightings}
          renderItem={({ item }) => <SightingCard item={item} />}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          ListHeaderComponent={<Text style={styles.sectionLabel}>MY SIGHTINGS</Text>}
        />
      )}
    </View>
  );
};

const styles = {
  screen: {
    flex: 1,
    backgroundColor: Theme.colors.background,
  },
  list: {
    padding: Theme.spacing.md,
    paddingBottom: 40,
  },
  sectionLabel: {
    textAlign: 'center',
    letterSpacing: 3,
    fontSize: 11,
    color: Theme.colors.textSecondary,
    marginBottom: Theme.spacing.sm,
    marginTop: Theme.spacing.xl,
  },
  card: {
    backgroundColor: Theme.colors.card,
    borderRadius: 20,
    padding: Theme.spacing.md,
    marginBottom: Theme.spacing.md,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  species: {
    color: Theme.colors.text,
    fontWeight: 'bold',
    fontSize: 16,
  },
  meta: {
    color: Theme.colors.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
  confidence: {
    color: Theme.colors.primary,
    fontWeight: 'bold',
    fontSize: 18,
  },
  barTrack: {
    height: 6,
    backgroundColor: Theme.colors.border,
    borderRadius: 3,
    marginTop: 10,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    backgroundColor: Theme.colors.primary,
    borderRadius: 3,
  },
  alternatives: {
    marginTop: Theme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Theme.colors.border,
    paddingTop: Theme.spacing.sm,
    gap: 4,
  },
  altRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  altSpecies: {
    color: Theme.colors.textSecondary,
    fontSize: 13,
  },
  altConfidence: {
    color: Theme.colors.secondary,
    fontSize: 13,
    fontWeight: '600',
  },
};
