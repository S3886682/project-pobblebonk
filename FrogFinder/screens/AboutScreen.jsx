import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TextInput, FlatList, TouchableOpacity, Modal, Image,
} from 'react-native';
import { Asset } from 'expo-asset';
import { createAudioPlayer } from 'expo-audio';
import { frogImages } from '../assets/images/frogImages';
import { frogAudio } from '../assets/audio/frogAudio';
import frogData from '../assets/data/speciesDetails.json';

const DARK  = '#1C1C1E';
const GREEN = '#4A7C59';

// Preload all frog images once so first-render is instant after startup
const IMAGE_ASSETS = Object.values(frogImages);
Asset.loadAsync(IMAGE_ASSETS).catch(() => {});

export const AboutScreen = () => {
  const [search, setSearch]           = useState('');
  const [selectedFrog, setSelectedFrog] = useState(null);
  const [playingId, setPlayingId]     = useState(null);
  const playerRef                     = useRef(null);

  // Stop any playing audio when the component unmounts
  useEffect(() => () => { playerRef.current?.release(); }, []);

  const handlePlay = (item) => {
    const audioSrc = frogAudio[item.image];
    if (!audioSrc) return;

    // Tapping the same frog stops it
    if (playingId === item.id) {
      playerRef.current?.release();
      playerRef.current = null;
      setPlayingId(null);
      return;
    }

    // Stop previous player
    playerRef.current?.release();
    playerRef.current = null;
    setPlayingId(null);

    const player = createAudioPlayer(audioSrc);
    playerRef.current = player;
    setPlayingId(item.id);

    player.addListener('playbackStatusUpdate', (status) => {
      if (status.didJustFinish) {
        player.release();
        playerRef.current = null;
        setPlayingId(null);
      }
    });
    player.play();
  };

  const filteredFrogs = frogData.filter((frog) =>
    frog.name.toLowerCase().includes(search.toLowerCase())
  );

  const imageSource = selectedFrog?.image ? frogImages[selectedFrog.image] : null;

  return (
    <View style={styles.screen}>
      <View style={styles.container}>
        <TextInput
          style={styles.searchBar}
          placeholder="Search frogs..."
          placeholderTextColor="#999"
          value={search}
          onChangeText={setSearch}
        />

        <FlatList
          data={filteredFrogs}
          keyExtractor={(item) => item.id ?? item.name}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => {
            const hasAudio   = !!frogAudio[item.image];
            const isPlaying  = playingId === item.id;
            return (
              <TouchableOpacity
                style={styles.row}
                onPress={() => setSelectedFrog(item)}
                activeOpacity={0.85}
              >
                {item.image && frogImages[item.image] ? (
                  <Image
                    source={frogImages[item.image]}
                    style={styles.rowThumb}
                    resizeMode="cover"
                    fadeDuration={0}
                  />
                ) : (
                  <View style={[styles.rowThumb, styles.rowThumbPlaceholder]}>
                    <Text style={styles.rowThumbText}>?</Text>
                  </View>
                )}

                <View style={styles.rowText}>
                  <Text style={styles.rowName}>{item.name}</Text>
                  {item.scientific_name ? (
                    <Text style={styles.rowScientific}>{item.scientific_name}</Text>
                  ) : null}
                </View>

                {hasAudio && (
                  <TouchableOpacity
                    style={[styles.playBtn, isPlaying && styles.playBtnActive]}
                    onPress={(e) => { e.stopPropagation(); handlePlay(item); }}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Text style={[styles.playBtnIcon, isPlaying && styles.playBtnIconActive]}>
                      {isPlaying ? '■' : '▶'}
                    </Text>
                  </TouchableOpacity>
                )}
              </TouchableOpacity>
            );
          }}
        />

        <Modal visible={!!selectedFrog} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              <ScrollView showsVerticalScrollIndicator={false}>
                <Text style={styles.modalName}>{selectedFrog?.name}</Text>
                <Text style={styles.modalScientific}>{selectedFrog?.scientific_name}</Text>

                {imageSource ? (
                  <Image source={imageSource} style={styles.modalImage} resizeMode="cover" fadeDuration={0} />
                ) : (
                  <View style={[styles.modalImage, styles.modalImagePlaceholder]}>
                    <Text style={{ fontSize: 48 }}>?</Text>
                  </View>
                )}

                {selectedFrog?.description ? (
                  <Text style={styles.modalDescription}>{selectedFrog.description}</Text>
                ) : null}

                {[
                  ['Call',                selectedFrog?.callDescription],
                  ['Habitat',             selectedFrog?.habitat],
                  ['Size',                selectedFrog?.size],
                  ['Conservation Status', selectedFrog?.conservationStatus],
                ].map(([label, value]) =>
                  value ? (
                    <View key={label} style={styles.detailRow}>
                      <Text style={styles.detailLabel}>{label}  </Text>
                      <Text style={styles.detailValue}>{value}</Text>
                    </View>
                  ) : null
                )}

                <TouchableOpacity onPress={() => setSelectedFrog(null)} style={styles.closeButton}>
                  <Text style={styles.closeButtonText}>Close</Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
          </View>
        </Modal>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#EEF4EE',
  },
  container: {
    flex: 1,
    padding: 16,
    paddingTop: 16,
  },
  searchBar: {
    backgroundColor: 'rgba(255,255,255,0.95)',
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
    fontSize: 15,
    color: DARK,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderRadius: 14,
    marginBottom: 8,
    padding: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 1,
  },
  rowThumb: {
    width: 52,
    height: 52,
    borderRadius: 10,
    marginRight: 12,
  },
  rowThumbPlaceholder: {
    backgroundColor: '#E8F5E9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowThumbText: { fontSize: 22, color: '#999' },
  rowText:      { flex: 1 },
  rowName:      { fontSize: 15, fontWeight: '600', color: DARK },
  rowScientific: { fontSize: 12, fontStyle: 'italic', color: '#777', marginTop: 2 },

  playBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#E8F5E9',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  playBtnActive: { backgroundColor: GREEN },
  playBtnIcon:   { fontSize: 13, color: GREEN },
  playBtnIconActive: { color: '#FFF' },

  // Modal — no dark overlay
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 36,
    maxHeight: '88%',
  },
  modalName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: DARK,
    marginBottom: 2,
  },
  modalScientific: {
    fontSize: 14,
    fontStyle: 'italic',
    color: '#777',
    marginBottom: 14,
  },
  modalImage: {
    width: '100%',
    height: 180,
    borderRadius: 14,
    marginBottom: 14,
    overflow: 'hidden',
  },
  modalImagePlaceholder: {
    backgroundColor: '#E8F5E9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalDescription: {
    fontSize: 14,
    color: '#444',
    lineHeight: 20,
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 6,
  },
  detailLabel: { fontSize: 13, fontWeight: '600', color: DARK },
  detailValue:  { fontSize: 13, color: '#555', flex: 1 },
  closeButton: {
    marginTop: 20,
    backgroundColor: GREEN,
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
  },
  closeButtonText: { color: '#FFF', fontSize: 16, fontWeight: '600' },
});
