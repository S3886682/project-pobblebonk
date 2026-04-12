import { View, Text, ScrollView } from 'react-native';
import { Theme } from '../config/Theme';

const Row = ({ label, value, last }) => (
  <View style={[styles.row, !last && styles.rowBorder]}>
    <Text style={styles.rowLabel}>{label}</Text>
    <Text style={styles.rowValue}>{value}</Text>
  </View>
);

export const AboutScreen = () => {
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.sectionLabel}>ABOUT FROGFINDER</Text>
      <View style={styles.card}>
        <Row label="Team"         value="Infrastructure - A" />
        <Row label=""         value="Database - B" />
        <Row label=""         value="Front-End - C" />
        <Row label="Purpose"     value="Identify Australian frog species from audio recordings using a trained SVM classifier. Built by students at RMIT University." />
      </View>
    </ScrollView>
  );
};

const styles = {
  container: {
    flexGrow: 1,
    padding: Theme.spacing.md,
    backgroundColor: Theme.colors.background,
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
  },
  row: {
    paddingVertical: Theme.spacing.sm,
  },
  rowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.border,
  },
  rowLabel: {
    color: Theme.colors.textSecondary,
    fontSize: 11,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  rowValue: {
    color: Theme.colors.text,
    fontSize: 14,
  },
};
