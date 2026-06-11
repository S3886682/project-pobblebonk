import React, {useState} from 'react';
import { useSightings } from '../hooks/useSightings';
import {TouchableOpacity, View, Text, FlatList, Image, StyleSheet,StatusBar, ImageBackground, Modal, SafeAreaView} from 'react-native';

const frogImages = {
  australian_lace_lid:  require('../assets/images/frog_images/australian_lace_lid.png'),
  baw_baw_frog: require('../assets/images/frog_images/baw_baw_frog.png'),
  beautiful_nursery_frog: require('../assets/images/frog_images/beautiful_nursery_frog.png'),
  bellenden_ker_nursery_frog: require('../assets/images/frog_images/bellenden_ker_nursery_frog.png'),
  bibrons_toadlet: require('../assets/images/frog_images/bibrons_toadlet.png'),
  barking_marsh_frog: require('../assets/images/frog_images/barking_marsh_frog.png'),
  blue_mountains_tree_frog: require('../assets/images/frog_images/blue_mountains_tree_frog.png'),
  booroolong_frog: require('../assets/images/frog_images/booroolong_frog.png'),
  cave_frog: require('../assets/images/frog_images/cave_frog.png'),
  common_eastern_froglet: require('../assets/images/frog_images/common_eastern_froglet.png'),
  common_spadefoot_toad: require('../assets/images/frog_images/common_spadefoot_toad.png'),
  davies_tree_frog: require('../assets/images/frog_images/davies_tree_frog.png'),
  dendys_toadlet: require('../assets/images/frog_images/dendys_toadlet.png'),
  desert_spadefoot: require('../assets/images/frog_images/desert_spadefoot.png'),
  eastern_banjo_frog: require('../assets/images/frog_images/eastern_banjo_frog.png'),
  eastern_dwarf_tree_frog: require('../assets/images/frog_images/eastern_dwarf_tree_frog.png'),
  eastern_sign_bearing_froglet: require('../assets/images/frog_images/eastern_sign_bearing_froglet.png'),
  eungella_day_frog: require('../assets/images/frog_images/eungella_day_frog.png'),
  flat_headed_frog: require('../assets/images/frog_images/flat_headed_frog.png'),
  fleays_barred_frog: require('../assets/images/frog_images/fleays_barred_frog.png'),
  giant_banjo_frog: require('../assets/images/frog_images/giant_banjo_frog.png'),
  giant_barred_frog: require('../assets/images/frog_images/giant_barred_frog.png'),  
  giant_burrowing_frog: require('../assets/images/frog_images/giant_burrowing_frog.png'),
  green_and_golden_bell_frog: require('../assets/images/frog_images/green_and_golden_bell_frog.png'),
  green_tree_frog: require('../assets/images/frog_images/green_tree_frog.png'),
  growling_grass_frog: require('../assets/images/frog_images/growling_grass_frog.png'),
  hosmers_nursery_frog: require('../assets/images/frog_images/hosmers_nursery_frog.png'),
  howard_springs_toadlet: require('../assets/images/frog_images/howard_springs_toadlet.png'),
  kroombit_tops_tinker_frog: require('../assets/images/frog_images/kroombit_tops_tinker_frog.png'),
  kuranda_tree_frog: require('../assets/images/frog_images/kuranda_tree_frog.png'),
  leaf_green_tree_frog: require('../assets/images/frog_images/leaf_green_tree_frog.png'),
  lesueurs_tree_frog: require('../assets/images/frog_images/lesueurs_tree_frog.png'),
  littlejohns_toadlet: require('../assets/images/frog_images/littlejohns_toadlet.png'),
  littlejohns_tree_frog: require('../assets/images/frog_images/littlejohns_tree_frog.png'),
  magnificent_brood_frog: require('../assets/images/frog_images/magnificent_brood_frog.png'),
  magnificent_tree_frog: require('../assets/images/frog_images/magnificent_tree_frog.png'),
  mahonys_toadlet: require('../assets/images/frog_images/mahonys_toadlet.png'),
  mallee_spadefoot_toad: require('../assets/images/frog_images/mallee_spadefoot_toad.png'),
  martins_toadlet: require('../assets/images/frog_images/martins_toadlet.png'),
  moss_froglet: require('../assets/images/frog_images/moss_froglet.png'),
  motorbike_frog: require('../assets/images/frog_images/motorbike_frog.png'),
  mount_top_nursery_frog: require('../assets/images/frog_images/mount_top_nursery_frog.png'),
  mountain_frog: require('../assets/images/frog_images/mountain_frog.png'),
  mountain_mist_frog: require('../assets/images/frog_images/mountain_mist_frog.png'),
  mt_elliot_nursery_frog: require('../assets/images/frog_images/mt_elliot_nursery_frog.png'),
  northern_corroboree_frog: require('../assets/images/frog_images/northern_corroboree_frog.png'),
  //northern_flinders_ranges_froglet: require('../assets/images/frog_images/northern_flinders_rangers_froglet.png'),
  northern_heath_frog: require('../assets/images/frog_images/northern_heath_frog.png'),
  northern_snapping_frog: require('../assets/images/frog_images/northern_snapping_frog.png'),
  northern_tinker_frog: require('../assets/images/frog_images/northern_tinker_frog.png'),
  orange_bellied_froglet: require('../assets/images/frog_images/orange_bellied_froglet.png'),
  pobblebonk: require('../assets/images/frog_images/pobblebonk.png'),
  perons_tree_frog: require('../assets/images/frog_images/perons_tree_frog.png'),
  rattling_nursery_frog: require('../assets/images/frog_images/rattling_nursery_frog.png'),
  richmond_mountain_frog: require('../assets/images/frog_images/richmond_mountain_frog.png'),
  red_groined_froglet: require('../assets/images/frog_images/red_groined_froglet.png'),
  striped_marsh_frog: require('../assets/images/frog_images/striped_marsh_frog.png'),
  spotted_marsh_frog: require('../assets/images/frog_images/spotted_marsh_frog.png'),
  spotted_tree_frog: require('../assets/images/frog_images/spotted_tree_frog.png'),
  sloanes_froglet: require('../assets/images/frog_images/sloanes_froglet.png'),
  southern_barred_frog: require('../assets/images/frog_images/southern_barred_frog.png'),
  southern_brown_tree_frog: require('../assets/images/frog_images/southern_brown_tree_frog.png'),
  southern_smooth_froglet: require('../assets/images/frog_images/southern_smooth_froglet.png'),
  southern_toadlet: require('../assets/images/frog_images/southern_toadlet.png'),
  southern_bell_frog: require('../assets/images/frog_images/southern_bell_frog.png'),
  //southern_corroboree_frog: require('../assets/images/frog_images/southern_corroboree_frog.png'),
  southern_heath_frog: require('../assets/images/frog_images/southern_heath_frog.png'),
  //southern_marsh_frog: require('../assets/images/frog_images/southern_marsh_frog.png'),
  tapping_nursery_frog: require('../assets/images/frog_images/tapping_nursery_frog.png'),
  sunset_frog: require('../assets/images/frog_images/sunset_frog.png'),
  tasmanian_tree_frog: require('../assets/images/frog_images/tasmanian_tree_frog.png'),
  tusked_frog: require('../assets/images/frog_images/tusked_frog.png'),
  verreauxs_tree_frog: require('../assets/images/frog_images/verreauxs_tree_frog.png'),
  victorian_frog: require('../assets/images/frog_images/victorian_frog.png'),
  victorian_smooth_froglet: require('../assets/images/frog_images/victorian_smooth_froglet.png'),
  wrinkled_toadlet: require('../assets/images/frog_images/wrinkled_toadlet.png'),
  tylers_toadlet: require('../assets/images/frog_images/tylers_toadlet.png'),
  wallum_sedge_frog: require('../assets/images/frog_images/wallum_sedge_frog.png'),
  white_bellied_frog: require('../assets/images/frog_images/white_bellied_frog.png'),
  yellow_spotted_bell_frog: require('../assets/images/frog_images/yellow_spotted_bell_frog.png'),
};

const SightingCard = ({ item }) => {
const [expanded, setExpanded] = useState(false);
//convert frog name "species" to image file name by making lowercase, replacing spaces with _
const imageName = item.species.toLowerCase().replace(/['"]/g, '').replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
const frogImage = frogImages[imageName];
console.log('species:', item.species);
console.log('imageName:', imageName);
console.log('frogImage:', frogImage);

//---------make records responsive when pressed--------------//
  return (
        <TouchableOpacity style={styles.card}
          onPress={() => setExpanded(!expanded)}
          activeOpacity={0.8}
        >

{/*---------content in each card--------------*/}
      <View style={styles.details}>
        <View style={styles.recordHeader}>
        <Text style={styles.frogName}>{item.species}</Text>
        </View>

{/*---------setting content to appear when pressed--------------*/}
        {expanded && (
        <>
          <Text style={styles.confidence}>Confidence: {(item.confidence * 100).toFixed(1)}%</Text>

          <Text style={styles.info}>Location: {item.location.locality}</Text>

        {item.alternatives?.length >= 2 && (
          <View style={styles.alternatives}>
            <Text style={styles.confidence}>Could also be:</Text>
            <Text style={styles.altItem}>{item.alternatives[0].species} ({(item.alternatives[0].confidence * 100).toFixed(1)}%)</Text>
            <Text style={styles.altItem}>{item.alternatives[1].species} ({(item.alternatives[1].confidence * 100).toFixed(1)}%)</Text>
          </View>
        )}
        </>
        )
        }
    </View>
    <View style={styles.rightSide}>
      <Text style={styles.date}>{new Date(item.date).toLocaleDateString()}</Text>
        {expanded && (
        <Image source={frogImage} style={styles.image} />
        )}
      </View>  
  </TouchableOpacity>
);
};

//--------sorting records so newest is at the top--------------
export const SightingsScreen = () => {
const { sightings, loading } = useSightings();
const sortedSightings = [...sightings].sort(
    (b, a) => new Date(a.date) - new Date(b.date)
  );
    
//-----------LOADING SCREEN-----------------
if (loading) {
    return (
      <Modal transparent visible={loading} animationType="fade">
        <View style={styles.modalBackground}>
          <View style={styles.loadingContainer}>
            <Image
              source={require('../assets/frog-spin.gif')}
              style={styles.loadingGif}
            />
            <Text style={styles.loadingTitle}>Finding Frog...</Text>
          </View>
        </View>
      </Modal>
    );
  }

//---------setting page features, background, status bar, adding list etc.--------------
return (
    <SafeAreaView style={styles.container}>
      <ImageBackground
        source={require('../assets/background_image.png')}
        resizeMode="cover"
        style={StyleSheet.absoluteFill}
      />
        <StatusBar backgroundColor="#FFFFFF" />
        <Text style={styles.title}>My Sightings</Text>

        {sightings.length === 0 ? (
          <Text style={styles.error}>No sightings recorded yet</Text> //if no records found
        ) : (
          <FlatList
            data={sortedSightings}
            renderItem={({ item }) => <SightingCard item={item} />}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.list}
            style={styles.flatList}
          />
        )}
    </SafeAreaView>
);
};

//------------------------STYLING----------------------------------------------------------------
//General
const styles = StyleSheet.create({
container: {
  flex: 1,
  backgroundColor: '#FFFFF',
},

overlay: {
  flex: 1,
  justifyContent: "center",
  alignItems: "center",
  paddingHorizontal: 24,
},

background: {
  flex: 1,
},

title: {
  fontSize: 34,
  fontWeight: "bold",
  color: '#254f27',
  textAlign: 'center',
  marginTop: 20,
  marginBottom: 20,
},

card: {
  flexDirection: 'row',
  backgroundColor: '#ffffffcb',
  borderRadius: 6,
  padding: 12,
  marginBottom: 12,
  shadowColor: '#000',
  shadowOffset: {
  width: 0,
  height: 2,},
  shadowOpacity: 0.1,               
  shadowRadius: 4,  
  elevation: 3,
  alignItems:'center',                
},

list: {
  paddingHorizontal: 15,
  paddingBottom: 20,
  flexGrow: 1,
},

flatList: {
  flex:1,
},

recordHeader: {
  flexDirection: 'row',
  justifyContent: 'space-between',
},

rightSide: {width: 80,
  alignItems: 'center',
  justifyContent: 'center',
},
//----------------Frog details------------------------------------------------------
frogName: {
  fontSize: 18,
  fontWeight: 'bold',
  marginBottom: 5,
  color:'#254f27',
},

date: {
  fontSize: 15,
  color:'#254f27',
  marginBottom: 5,
  marginRight:15,
},

confidence: {
  fontStyle: 'italic',
  fontSize: 15,
  paddingTop: 8,
  paddingBottom: 5,
},

image: {
  width: 100,
  height: 100,
  borderRadius: 8,
  resizeMode: 'cover',
  marginLeft: 5,
  marginRight:25,
},

details: {
  paddingBottom: 5,
  flex:1,
},

error: {
  fontSize: 20,
  fontStyle: 'italic',
  paddingLeft: 15,
},

info: {
  fontSize: 15,
  paddingBottom: 5,
},
});