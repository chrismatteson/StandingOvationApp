import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { Video, ResizeMode } from 'expo-av';
import * as MediaLibrary from 'expo-media-library';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ScreenOrientation from 'expo-screen-orientation';
import * as ImagePicker from 'expo-image-picker';

export default function VideoPlayer() {
  const [videoUri, setVideoUri] = useState<string | null>(null);  // For remote videos
  const [isUsingLocalVideo, setIsUsingLocalVideo] = useState<boolean>(true); // Track if using local video
  const [tapCount, setTapCount] = useState<number>(0);
  const tapTimeout = useRef<NodeJS.Timeout | null>(null);
  const videoPlayer = useRef<Video>(null);  // Ref for video player

  // Enable rotation for the app
  useEffect(() => {
    const allowRotation = async () => {
      await ScreenOrientation.unlockAsync();
    };
    allowRotation();
  }, []);

  // Load saved video URI or default to local standing ovation video
  useEffect(() => {
    const loadVideoUri = async () => {
      const savedUri = await AsyncStorage.getItem('videoUri');
      if (savedUri) {
        setVideoUri(savedUri);
        setIsUsingLocalVideo(false);  // Using remote video
      } else {
        videoPlayer.current?.playAsync();  // Play local video automatically if no remote URI is saved
      }
    };
    loadVideoUri();
  }, []);

  // Autoplay the video when the URI is updated
  useEffect(() => {
    if (videoUri && videoPlayer.current) {
      videoPlayer.current.playAsync();
    }
  }, [videoUri]);

  // Handle the 5-tap gesture
  const handleTap = () => {
    setTapCount(tapCount + 1);
    if (tapTimeout.current) {
      clearTimeout(tapTimeout.current);
    }
    tapTimeout.current = setTimeout(() => {
      setTapCount(0);
    }, 1000);

    if (tapCount + 1 === 5) {
      setTapCount(0);
      openVideoSelection();
    } else {
      videoPlayer.current?.playAsync();  // Start playing video on normal tap
    }
  };

  // Open video selection directly after 5-tap gesture
  const openVideoSelection = () => {
    Alert.alert(
      'Select Video',
      'Choose a video to play',
      [
        {
          text: 'Standing Ovation',
          onPress: () => resetToStandingOvation(),
        },
        {
          text: 'Pick from Library',
          onPress: pickVideoFromLibrary,
        },
        {
          text: 'Clear Cache',
          onPress: clearCache,
        },
        {
          text: 'Cancel',
          style: 'cancel',
        },
      ],
      { cancelable: true }
    );
  };

  // Reset to default local video (standing ovation)
  const resetToStandingOvation = () => {
    setIsUsingLocalVideo(true);  // Use the local video
    setVideoUri(null);  // Clear the remote URI
    videoPlayer.current?.playAsync();  // Play immediately
  };

  // Pick video from the library
  const pickVideoFromLibrary = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        Alert.alert('Permission Denied', 'We need access to your media library to select a video.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Videos,
        allowsEditing: false,
        quality: 1,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const pickedUri = result.assets[0].uri;
        console.log('Picked video URI:', pickedUri);  // Debugging log

        setVideoUri(pickedUri);
        setIsUsingLocalVideo(false);  // Switch to the picked video
        await AsyncStorage.setItem('videoUri', pickedUri);  // Persist the URI
        videoPlayer.current?.playAsync();  // Play the selected video
      } else {
        Alert.alert('No Video Selected', 'You did not select any video.');
      }
    } catch (error) {
      console.error('Error picking video from library:', error);
      Alert.alert('Error', 'An error occurred while trying to pick a video from your library.');
    }
  };

  // Clear the cached video URI
  const clearCache = async () => {
    await AsyncStorage.removeItem('videoUri');
    resetToStandingOvation();  // Reset to default video
  };

  return (
    <View style={styles.container}>
      {isUsingLocalVideo ? (
        <TouchableOpacity style={styles.fullscreen} onPress={handleTap}>
          <Video
            ref={videoPlayer}
            source={require('../assets/standingOvation.mov')}  // Local video
            style={styles.fullscreen}
            shouldPlay
            resizeMode={ResizeMode.CONTAIN}
            isLooping
            onError={(error) => {
              console.log('Error playing video:', error);
              Alert.alert('Error', 'An error occurred while trying to play the video.');
            }}
          />
        </TouchableOpacity>
      ) : (
        <TouchableOpacity style={styles.fullscreen} onPress={handleTap}>
          {videoUri && ( // Ensure videoUri is not null before rendering the Video component
            <Video
              ref={videoPlayer}
              source={{ uri: videoUri }}  // Remote video
              style={styles.fullscreen}
              shouldPlay
              resizeMode={ResizeMode.CONTAIN}
              isLooping
              onError={(error) => {
                console.log('Error playing video:', error);
                Alert.alert('Error', 'An error occurred while trying to play the video.');
              }}
            />
          )}
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
  },
  fullscreen: {
    width: '100%',
    height: '100%',
  },
});
