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

const frogData = [
  {
    id: '1',
    name: 'Australian Lace Lid',
    description: 'Frog with partially webbed eyelids that resemble lace.',
    scientific: 'Litoria dayi',
    image: require('../assets/images/frog_images/australian_lace_lid.png'),
  },
  {
    id: '2',
    name: 'Baw Baw Frog',
    description: 'Critically endangered frog found only on the Baw Baw Plateau in Victoria.',
    scientific: 'Philoria frosti',
    image: require('../assets/images/frog_images/baw_baw_frog.png'),
  },
  {
    id: '3',
    name: 'Beautiful Nursery Frog',
    description: 'Colorful small frog that provides parental care to its eggs.',
    scientific: 'Cophixalus concinnus',
    image: require('../assets/images/frog_images/beautiful_nursery_frog.png'),
  },
  {
    id: '4',
    name: 'Bellenden Ker Nursery Frog',
    description: 'Small frog endemic to the Bellenden Ker Range in Queensland.',
    scientific: 'Cophixalus neglectus',
    image: require('../assets/images/frog_images/bellenden_ker_nursery_frog.png'),
  },
  {
    id: '5',
    name: 'Booroolong Frog',
    description: 'Medium-sized frog found along rocky permanent streams in NSW and Victoria.',
    scientific: 'Litoria booroolongensis',
    image: require('../assets/images/frog_images/booroolong_frog.png'),
  },
  {
    id: '6',
    name: 'Cave Frog',
    description: 'Small frog that inhabits caves and rocky outcrops in Queensland.',
    scientific: 'Litoria cavernicola',
    image: require('../assets/images/frog_images/cave_frog.png'),
  },
  {
    id: '7',
    name: 'Common Eastern Froglet',
    description: 'Tiny brown frog with variable patterns commonly found in eastern Australia.',
    scientific: 'Crinia signifera',
    image: require('../assets/images/frog_images/common_eastern_froglet.png'),
  },
  {
    id: '8',
    name: 'Davies Tree Frog',
    description: 'Green tree frog found in rainforests of northeast Queensland.',
    scientific: 'Litoria daviesae',
    image: require('../assets/images/frog_images/davies_tree_frog.png'),
  },
  {
    id: '9',
    name: 'Desert Spadefoot',
    description: 'Burrowing frog adapted to arid environments with specialized digging feet.',
    scientific: 'Notaden nichollsi',
    image: require('../assets/images/frog_images/desert_spadefoot.png'),
  },
  {
    id: '10',
    name: 'Eastern Banjo Frog',
    description: 'Also known as Pobblebonk for its distinctive call similar to a banjo string being plucked.',
    scientific: 'Limnodynastes dumerilii',
    image: require('../assets/images/frog_images/eastern_banjo_frog.png'),
  },
  {
    id: '11',
    name: 'Eungella Day Frog',
    description: 'Stream-dwelling frog found in the Eungella region of Queensland.',
    scientific: 'Taudactylus eungellensis',
    image: require('../assets/images/frog_images/eungella_day_frog.png'),
  },
  {
    id: '12',
    name: 'Flat Headed Frog',
    description: 'Distinctive frog with unusually flat head adapted for living in narrow crevices.',
    scientific: 'Barbourula busuangensis',
    image: require('../assets/images/frog_images/flat_headed_frog.png'),
  },
  {
    id: '13',
    name: 'Fleays Barred Frog',
    description: 'Large frog with distinctive barred pattern on its limbs.',
    scientific: 'Mixophyes fleayi',
    image: require('../assets/images/frog_images/fleays_barred_frog.png'),
  },
  {
    id: '14',
    name: 'Giant Barred Frog',
    description: 'One of Australias largest frogs with distinctive dark bars on limbs.',
    scientific: 'Mixophyes iteratus',
    image: require('../assets/images/frog_images/giant_barred_frog.png'),
  },
  {
    id: '15',
    name: 'Giant Burrowing Frog',
    description: 'Large frog that spends most of its time in underground burrows.',
    scientific: 'Heleioporus australiacus',
    image: require('../assets/images/frog_images/giant_burrowing_frog.png'),
  },
  {
    id: '16',
    name: 'Green and Golden Bell Frog',
    description: 'Bright green frog with gold patterns and distinctive gold iris.',
    scientific: 'Litoria aurea',
    image: require('../assets/images/frog_images/green_and_golden_bell_frog.png'),
  },
  {
    id: '17',
    name: 'Green Tree Frog',
    description: 'Large bright green frog often found around houses and water tanks.',
    scientific: 'Litoria caerulea',
    image: require('../assets/images/frog_images/green_tree_frog.png'),
  },
  {
    id: '18',
    name: 'Hosmers Nursery Frog',
    description: 'Small frog that cares for its eggs in moist leaf litter.',
    scientific: 'Cophixalus hosmeri',
    image: require('../assets/images/frog_images/hosmers_nursery_frog.png'),
  },
  {
    id: '19',
    name: 'Howard Springs Toadlet',
    description: 'Small ground-dwelling frog from the Northern Territory.',
    scientific: 'Uperoleia daviesae',
    image: require('../assets/images/frog_images/howard_springs_toadlet.png'),
  },
  {
    id: '20',
    name: 'Kroombit Tops Tinker Frog',
    description: 'Endangered frog found only in Kroombit Tops National Park.',
    scientific: 'Taudactylus pleione',
    image: require('../assets/images/frog_images/kroombit_tops_tinker_frog.png'),
  },
  {
    id: '21',
    name: 'Kuranda Tree Frog',
    description: 'Vibrant green tree frog found in the Kuranda region of Queensland.',
    scientific: 'Litoria myola',
    image: require('../assets/images/frog_images/kuranda_tree_frog.png'),
  },
  {
    id: '22',
    name: 'Littlejohns Toadlet',
    description: 'Small secretive frog with warty skin and restricted distribution.',
    scientific: 'Uperoleia littlejohni',
    image: require('../assets/images/frog_images/littlejohns_toadlet.png'),
  },
  {
    id: '23',
    name: 'Magnificent Brood Frog',
    description: 'Frog that guards its eggs until they hatch into froglets.',
    scientific: 'Pseudophryne covacevichae',
    image: require('../assets/images/frog_images/magnificent_brood_frog.png'),
  },
  {
    id: '24',
    name: 'Magnificent Tree Frog',
    description: 'Large green tree frog with prominent white spots.',
    scientific: 'Litoria splendida',
    image: require('../assets/images/frog_images/magnificent_tree_frog.png'),
  },
  {
    id: '25',
    name: 'Mahonys Toadlet',
    description: 'Recently discovered toadlet with distinctive marbled black and white belly.',
    scientific: 'Uperoleia mahonyi',
    image: require('../assets/images/frog_images/mahonys_toadlet.png'),
  },
  {
    id: '26',
    name: 'Moss Froglet',
    description: 'Tiny frog that lives among moss in alpine and subalpine areas.',
    scientific: 'Crinia nimbus',
    image: require('../assets/images/frog_images/moss_froglet.png'),
  },
  {
    id: '27',
    name: 'Motorbike Frog',
    description: 'Named for its call which sounds like a motorbike changing gears.',
    scientific: 'Ranoidea moorei',
    image: require('../assets/images/frog_images/motorbike_frog.png'),
  },
  {
    id: '28',
    name: 'Mount Top Nursery Frog',
    description: 'Small frog that lives high in mountains of Far North Queensland.',
    scientific: 'Cophixalus monticola',
    image: require('../assets/images/frog_images/mount_top_nursery_frog.png'),
  },
  {
    id: '29',
    name: 'Mountain Frog',
    description: 'Frog adapted to high elevation habitats in eastern Australia.',
    scientific: 'Philoria kundagungan',
    image: require('../assets/images/frog_images/mountain_frog.png'),
  },
  {
    id: '30',
    name: 'Mountain Mist Frog',
    description: 'Frog that lives in misty mountain streams and waterfalls.',
    scientific: 'Litoria nyakalensis',
    image: require('../assets/images/frog_images/mountain_mist_frog.png'),
  },
  {
    id: '31',
    name: 'Mt Elliott Nursery Frog',
    description: 'Small frog endemic to Mount Elliot in North Queensland.',
    scientific: 'Cophixalus mcdonaldi',
    image: require('../assets/images/frog_images/mt_elliot_nursery_frog.png'),
  },
  {
    id: '32',
    name: 'Northern Corroboree Frog',
    description: 'Small black and yellow striped frog endangered due to chytrid fungus.',
    scientific: 'Pseudophryne pengilleyi',
    image: require('../assets/images/frog_images/northern_corroboree_frog.png'),
  },
  {
    id: '33',
    name: 'Northern Flinders Ranges Froglet',
    description: 'Small frog endemic to the northern Flinders Ranges in South Australia.',
    scientific: 'Crinia flindersensis',
    image: require('../assets/images/frog_images/northern_flinders_ranges_froglet.png'),
  },
  {
    id: '34',
    name: 'Northern Heath Frog',
    description: 'Frog that inhabits heathland in northern Australia.',
    scientific: 'Litoria littlejohni',
    image: require('../assets/images/frog_images/northern_heath_frog.png'),
  },
  {
    id: '35',
    name: 'Northern Snapping Frog',
    description: 'Large frog that makes a loud snapping sound when calling.',
    scientific: 'Cyclorana australis',
    image: require('../assets/images/frog_images/northern_snapping_frog.png'),
  },
  {
    id: '36',
    name: 'Northern Tinker Frog',
    description: 'Small frog with a call that sounds like a tinker working with metal.',
    scientific: 'Taudactylus rheophilus',
    image: require('../assets/images/frog_images/northern_tinker_frog.png'),
  },
  {
    id: '37',
    name: 'Orange Bellied Froglet',
    description: 'Small frog with distinctive orange coloration on its belly.',
    scientific: 'Anstisia vitellina',
    image: require('../assets/images/frog_images/orange_bellied_froglet.png'),
  },
  {
    id: '38',
    name: 'Pobblebonk',
    description: 'Round burrowing frog known for its bonk call like a banjo string.',
    scientific: 'Limnodynastes dumerilii',
    image: require('../assets/images/frog_images/pobblebonk.png'),
  },
  {
    id: '39',
    name: 'Rattling Nursery Frog',
    description: 'Small frog with a call that sounds like rattling or clicking.',
    scientific: 'Cophixalus crepitans',
    image: require('../assets/images/frog_images/rattling_nursery_frog.png'),
  },
  {
    id: '40',
    name: 'Richmond Mountain Frog',
    description: 'Rare frog found in the mountains of northeastern NSW.',
    scientific: 'Philoria richmondensis',
    image: require('../assets/images/frog_images/richmond_mountain_frog.png'),
  },
  {
    id: '41',
    name: 'Sloanes Froglet',
    description: 'Tiny frog with a short, sharp call found in inland NSW.',
    scientific: 'Crinia sloanei',
    image: require('../assets/images/frog_images/sloanes_froglet.png'),
  },
  {
    id: '42',
    name: 'Southern Barred Frog',
    description: 'Large frog with distinctive barred pattern on limbs.',
    scientific: 'Mixophyes balbus',
    image: require('../assets/images/frog_images/southern_barred_frog.png'),
  },
  {
    id: '43',
    name: 'Southern Bell Frog',
    description: 'Bright green frog with golden stripes and black spotting.',
    scientific: 'Litoria raniformis',
    image: require('../assets/images/frog_images/southern_bell_frog.png'),
  },
  {
    id: '44',
    name: 'Southern Corroboree Frog',
    description: 'Critically endangered black and yellow striped frog.',
    scientific: 'Pseudophryne corroboree',
    image: require('../assets/images/frog_images/southern_corroboree_frog.png'),
  },
  {
    id: '45',
    name: 'Southern Health Frog',
    description: 'Frog adapted to heathland environments in southern Australia.',
    scientific: 'Mixophyes australis',
    image: require('../assets/images/frog_images/southern_heath_frog.png'),
  },
  {
    id: '46',
    name: 'Spotted Tree Frog',
    description: 'Tree frog with distinctive spotted pattern.',
    scientific: 'Litoria spenceri',
    image: require('../assets/images/frog_images/spotted_tree_frog.png'),
  },
  {
    id: '47',
    name: 'Striped Marsh Frog',
    description: 'Common frog with distinctive stripes running down its back.',
    scientific: 'Limnodynastes peronii',
    image: require('../assets/images/frog_images/striped_marsh_frog.png'),
  },
  {
    id: '48',
    name: 'Sunset Frog',
    description: 'Frog with unique reddish-brown coloration resembling a sunset.',
    scientific: 'Spicospina flammocaerulea',
    image: require('../assets/images/frog_images/sunset_frog.png'),
  },
  {
    id: '49',
    name: 'Tapping Nursery Frog',
    description: 'Small frog with a tapping call that cares for its eggs.',
    scientific: 'Cophixalus aenigma',
    image: require('../assets/images/frog_images/tapping_nursery_frog.png'),
  },
  {
    id: '50',
    name: 'Tasmanian Tree Frog',
    description: 'Tree frog endemic to Tasmania with variable coloration.',
    scientific: 'Litoria burrowsae',
    image: require('../assets/images/frog_images/tasmanian_tree_frog.png'),
  },
  {
    id: '51',
    name: 'Tusked Frog',
    description: 'Male has tusk-like projections used during breeding competition.',
    scientific: 'Adelotus brevis',
    image: require('../assets/images/frog_images/tusked_frog.png'),
  },
  {
    id: '52',
    name: 'Victorian Smooth Froglet',
    description: 'Small smooth-skinned frog found in Victoria.',
    scientific: 'Geocrinia victoriana',
    image: require('../assets/images/frog_images/victorian_smooth_froglet.png'),
  },
  {
    id: '53',
    name: 'Wallum Sedge Frog',
    description: 'Acid-tolerant frog that lives in wallum heath environments.',
    scientific: 'Litoria olongburensis',
    image: require('../assets/images/frog_images/wallum_sedge_frog.png'),
  },
  {
    id: '54',
    name: 'White Bellied Frog',
    description: 'Small frog with distinctive white belly found only in southwest WA.',
    scientific: 'Anstisia alba',
    image: require('../assets/images/frog_images/white_bellied_frog.png'),
  },
  {
    id: '55',
    name: 'Yellow Spotted Bell Frog',
    description: 'Large green frog with yellow spots thought extinct until rediscovered.',
    scientific: 'Litoria castanea',
    image: require('../assets/images/frog_images/yellow_spotted_bell_frog.png'),
  },

];

export const AboutScreen = () => {
  const [search, setSearch] = useState('');
  const [selectedFrog, setSelectedFrog] = useState(null);

  const filteredFrogs = frogData.filter(frog =>
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
              <Text style={styles.title}>{selectedFrog?.name}</Text>

              <Image
                source={selectedFrog?.image}
                style={styles.frogImage}
                resizeMode="contain"
              />

              <Text style={styles.centerText}>
                Scientific name: {selectedFrog?.scientific}
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
