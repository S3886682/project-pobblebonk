import * as Network from 'expo-network';
import { getSightings, updateSighting } from './sightingService';
import {
    insertSupabaseSighting,
    uploadAudioToSupabase,
    uploadSpectrogramToSupabase,
} from '../config/supabase';

// Check if device has internet connection
export const isConnected = async () => {
    try {
        const state = await Network.getNetworkStateAsync();
        return state.isConnected;
    } catch (error) {
        console.error('Error checking network state:', error);
        return false;
    }
};

// Upload a single sighting from local database to Supabase
export const uploadSighting = async (sighting) => {
    try {
        // Check connection
        const connected = await isConnected();
        if (!connected) {
            throw new Error('No internet connection');
        }

        // Prepare sighting data
        const sightingData = {
            species_name: sighting.species_name,
            scientific_name: sighting.scientific_name,
            confidence: sighting.confidence,
            latitude: sighting.latitude,
            longitude: sighting.longitude,
        };

        // Upload audio if available
        if (sighting.audio_url && !sighting.audio_url.startsWith('http')) {
            try {
                const audioFileName = `${sighting.id}_${Date.now()}.wav`;
                const audioUrl = await uploadAudioToSupabase(sighting.audio_url, audioFileName);
                sightingData.audio_url = audioUrl;
            } catch (error) {
                console.warn('Error uploading audio:', error);
                // Continue without audio URL
            }
        } else if (sighting.audio_url) {
            sightingData.audio_url = sighting.audio_url;
        }

        // Upload spectrogram if available
        if (sighting.spectrogram_url && !sighting.spectrogram_url.startsWith('http')) {
            try {
                const spectrogramFileName = `${sighting.id}_${Date.now()}.png`;
                const spectrogramUrl = await uploadSpectrogramToSupabase(
                    sighting.spectrogram_url,
                    spectrogramFileName
                );
                sightingData.spectrogram_url = spectrogramUrl;
            } catch (error) {
                console.warn('Error uploading spectrogram:', error);
                // Continue without spectrogram URL
            }
        } else if (sighting.spectrogram_url) {
            sightingData.spectrogram_url = sighting.spectrogram_url;
        }

        // Add timestamp
        sightingData.recorded_at = sighting.recorded_at || new Date().toISOString();

        // Upload to Supabase
        const result = await insertSupabaseSighting(sightingData);

        return result;
    } catch (error) {
        console.error('Error uploading sighting:', error);
        throw error;
    }
};

// Upload all sightings from local database to Supabase
export const uploadAllSightings = async (onProgress = null) => {
    try {
        // Check connection
        const connected = await isConnected();
        if (!connected) {
            throw new Error('No internet connection available');
        }

        // Get all local sightings
        const sightings = await getSightings();

        if (sightings.length === 0) {
            return {
                success: true,
                totalCount: 0,
                uploadedCount: 0,
                failedCount: 0,
                errors: [],
            };
        }

        let uploadedCount = 0;
        let failedCount = 0;
        const errors = [];

        // Upload each sighting
        for (let i = 0; i < sightings.length; i++) {
            try {
                const sighting = sightings[i];

                // Skip if already has cloud ID (already uploaded)
                if (sighting.cloud_id) {
                    uploadedCount++;
                    continue;
                }

                // Upload sighting
                const result = await uploadSighting(sighting);

                // Mark as uploaded in local database
                if (result && result.id) {
                    await updateSighting(sighting.id, { cloud_id: result.id });
                    uploadedCount++;
                }

                // Call progress callback
                if (onProgress) {
                    onProgress({
                        current: i + 1,
                        total: sightings.length,
                        uploadedCount,
                        failedCount,
                    });
                }
            } catch (error) {
                failedCount++;
                errors.push({
                    sightingId: sightings[i].id,
                    error: error.message,
                });

                // Call progress callback
                if (onProgress) {
                    onProgress({
                        current: i + 1,
                        total: sightings.length,
                        uploadedCount,
                        failedCount,
                    });
                }
            }
        }

        return {
            success: failedCount === 0,
            totalCount: sightings.length,
            uploadedCount,
            failedCount,
            errors,
        };
    } catch (error) {
        console.error('Error uploading all sightings:', error);
        throw error;
    }
};

// Sync sightings: upload local changes and download remote changes
export const syncSightings = async (onProgress = null) => {
    try {
        // Check connection
        const connected = await isConnected();
        if (!connected) {
            throw new Error('No internet connection available');
        }

        // Upload local sightings
        const uploadResult = await uploadAllSightings(onProgress);

        return {
            success: uploadResult.success,
            message: `Synced ${uploadResult.uploadedCount} sightings${
                uploadResult.failedCount > 0 ? `, ${uploadResult.failedCount} failed` : ''
            }`,
            uploadResult,
        };
    } catch (error) {
        console.error('Error syncing sightings:', error);
        throw error;
    }
};

// Get sync status
export const getSyncStatus = async () => {
    try {
        const connected = await isConnected();
        const localSightings = await getSightings();

        const unsyncedSightings = localSightings.filter((s) => !s.cloud_id);

        return {
            isConnected: connected,
            totalLocal: localSightings.length,
            unsynced: unsyncedSightings.length,
            synced: localSightings.length - unsyncedSightings.length,
            readyToSync: unsyncedSightings.length > 0 && connected,
        };
    } catch (error) {
        console.error('Error getting sync status:', error);
        throw error;
    }
};

// Listen for network changes
export const watchNetworkStatus = (callback) => {
    let subscription;

    try {
        // This is a simplified version - actual implementation depends on react-native-netinfo
        const checkNetworkStatus = async () => {
            const connected = await isConnected();
            callback(connected);
        };

        // Check immediately
        checkNetworkStatus();

        // Check every 10 seconds
        const intervalId = setInterval(checkNetworkStatus, 10000);

        // Return unsubscribe function
        return () => clearInterval(intervalId);
    } catch (error) {
        console.error('Error watching network status:', error);
        return () => {};
    }
};

// Initialize sync manager (run on app startup)
export const initializeSyncManager = async () => {
    try {
        const status = await getSyncStatus();

        if (status.readyToSync) {
            console.log(`${status.unsynced} sightings ready to sync when connection is available`);
        }

        // Set up network watcher
        const unwatch = watchNetworkStatus(async (isConnected) => {
            if (isConnected && status.readyToSync) {
                console.log('Connection restored, syncing sightings...');
                try {
                    await uploadAllSightings();
                } catch (error) {
                    console.error('Error auto-syncing sightings:', error);
                }
            }
        });

        return unwatch;
    } catch (error) {
        console.error('Error initializing sync manager:', error);
        return () => {};
    }
};

export const uploadService = {
    isConnected,
    uploadSighting,
    uploadAllSightings,
    syncSightings,
    getSyncStatus,
    watchNetworkStatus,
    initializeSyncManager,
};

export default uploadService;
