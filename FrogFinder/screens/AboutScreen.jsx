import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ImageBackground,
  TextInput,
  FlatList,
  TouchableOpacity,
  Modal,
  Image,
} from 'react-native';

import { Theme } from '../config/Theme';
import frogData from '../assets/data/speciesDetails.json';

const frogImages = {
  'green_and_golden_bell_frog.png': require('../assets/images/frog_images/green_and_golden_bell_frog.png'),
  'booroolong_frog.png': require('../assets/images/frog_images/booroolong_frog.png'),
  'blue_mountains_tree_frog.png': require('../assets/images/frog_images/blue_mountains_tree_frog.png'),
  'southern_brown_tree_frog.png': require('../assets/images/frog_images/southern_brown_tree_frog.png'),
  'eastern_dwarf_tree_frog.png': require('../assets/images/frog_images/eastern_dwarf_tree_frog.png'),
  'lesueurs_tree_frog.png': require('../assets/images/frog_images/lesueurs_tree_frog.png'),
  'littlejohns_tree_frog.png': require('../assets/images/frog_images/littlejohns_tree_frog.png'),
  'leaf_green_tree_frog.png': require('../assets/images/frog_images/leaf_green_tree_frog.png'),
  'victorian_frog.png': require('../assets/images/frog_images/victorian_frog.png'),
  'perons_tree_frog.png': require('../assets/images/frog_images/perons_tree_frog.png'),
  'growling_grass_frog.png': require('../assets/images/frog_images/growling_grass_frog.png'),
  'spotted_tree_frog.png': require('../assets/images/frog_images/spotted_tree_frog.png'),
  'verreauxs_tree_frog.png': require('../assets/images/frog_images/verreauxs_tree_frog.png'),
  'eastern_sign_bearing_froglet.png': require('../assets/images/frog_images/eastern_sign_bearing_froglet.png'),
  'common_eastern_froglet.png': require('../assets/images/frog_images/common_eastern_froglet.png'),
  'sloanes_froglet.png': require('../assets/images/frog_images/sloanes_froglet.png'),
  'southern_smooth_froglet.png': require('../assets/images/frog_images/southern_smooth_froglet.png'),
  'victorian_smooth_froglet.png': require('../assets/images/frog_images/victorian_smooth_froglet.png'),
  'giant_burrowing_frog.png': require('../assets/images/frog_images/giant_burrowing_frog.png'),
  'eastern_banjo_frog.png': require('../assets/images/frog_images/eastern_banjo_frog.png'),
  'barking_marsh_frog.png': require('../assets/images/frog_images/barking_marsh_frog.png'),
  'giant_banjo_frog.png': require('../assets/images/frog_images/giant_banjo_frog.png'),
  'striped_marsh_frog.png': require('../assets/images/frog_images/striped_marsh_frog.png'),
  'spotted_marsh_frog.png': require('../assets/images/frog_images/spotted_marsh_frog.png'),
  'southern_barred_frog.png': require('../assets/images/frog_images/southern_barred_frog.png'),
  'mallee_spadefoot_toad.png': require('../assets/images/frog_images/mallee_spadefoot_toad.png'),
  'common_spadefoot_toad.png': require('../assets/images/frog_images/common_spadefoot_toad.png'),
  'red_groined_froglet.png': require('../assets/images/frog_images/red_groined_froglet.png'),
  'baw_baw_frog.png': require('../assets/images/frog_images/baw_baw_frog.png'),
  'bibrons_toadlet.png': require('../assets/images/frog_images/bibrons_toadlet.png'),
  'dendys_toadlet.png': require('../assets/images/frog_images/dendys_toadlet.png'),
  'southern_toadlet.png': require('../assets/images/frog_images/southern_toadlet.png'),
  'smooth_toadlet.png': require('../assets/images/frog_images/smooth_toadlet.png'),
  'martins_toadlet.png': require('../assets/images/frog_images/martins_toadlet.png'),
  'wrinkled_toadlet.png': require('../assets/images/frog_images/wrinkled_toadlet.png'),
  'tylers_toadlet.png': require('../assets/images/frog_images/tylers_toadlet.png'),
};

export const AboutScreen = () => {
  const [search, setSearch] = useState('');
  const [selectedFrog, setSelectedFrog] = useState(null);

  const filteredFrogs = frogData.filter((frog) =>
    frog.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <View style={styles.screen}>
      <ImageBackground
        source={require('../assets/images/background_image.png')}
        style={styles.container}
        resizeMode="cover"
      >
        {/* Search Bar */}
        <TextInput
          style={styles.searchBar}
          placeholder="Search Frogs"
          value={search}
          onChangeText={setSearch}
        />

        {/* Frog List */}
        <FlatList
          data={filteredFrogs}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.row}
              onPress={() => setSelectedFrog(item)}
            >
              <Text>{item.name}</Text>
            </TouchableOpacity>
          )}
        />

        {/* Popup Modal */}
        <Modal visible={!!selectedFrog} transparent animationType="slide">
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <Text style={styles.title}>
                {selectedFrog?.name}
              </Text>

              <Image
                source={frogImages[selectedFrog?.image]}
                style={styles.frogImage}
                resizeMode="contain"
              />

              <Text style={styles.centerText}>
                Scientific name: {selectedFrog?.scientific_name}
              </Text>

              <Text style={styles.centerText}>
                Description: {selectedFrog?.description}
              </Text>

              <TouchableOpacity
                onPress={() => setSelectedFrog(null)}
                style={styles.closeButton}
              >
                <Text>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </ImageBackground>
    </View>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#d9f2d0',
  },

  container: {
    flex: 1,
    padding: Theme.spacing.md,
  },

  searchBar: {
    backgroundColor: '#fff',
    padding: 10,
    marginBottom: 10,
  },

  row: {
    padding: 15,
    backgroundColor: 'rgba(255,255,255,0.8)',
    marginBottom: 5,
  },

  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },

  modalContent: {
    margin: 20,
    padding: 20,
    backgroundColor: '#fff',
  },

  title: {
    ...Theme.typography.h2,
    marginBottom: Theme.spacing.md,
    textAlign: 'center',
  },

  centerText: {
    textAlign: 'center',
    marginBottom: 8,
  },

  frogImage: {
    width: '100%',
    height: 150,
    marginBottom: 10,
  },

  closeButton: {
    marginTop: 20,
    alignItems: 'center',
  },
});
