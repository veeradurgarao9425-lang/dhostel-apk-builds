import * as FileSystem from 'expo-file-system/legacy';
import { StorageAccessFramework } from 'expo-file-system/legacy';
import { Platform, Alert, ToastAndroid } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Sharing from 'expo-sharing';

export const downloadAndSaveFile = async (
    sourceUri: string, 
    filename: string, 
    mimeType: string,
    isLocalUri = false
) => {
    try {
        let localUri = sourceUri;
        
        // If it's a remote URL, download it first to the app's cache directory
        if (!isLocalUri) {
            const tempUri = `${FileSystem.cacheDirectory}${filename}`;
            const downloadResult = await FileSystem.downloadAsync(sourceUri, tempUri);
            if (downloadResult.status !== 200) {
                throw new Error(`Failed to download file from server. Status code: ${downloadResult.status}`);
            }
            localUri = downloadResult.uri;
        }

        if (Platform.OS === 'android') {
            // Check if we already have a saved directory URI in AsyncStorage
            let directoryUri = await AsyncStorage.getItem('downloads_directory_uri');

            if (directoryUri) {
                try {
                    // Try writing directly to the cached directoryUri
                    await writeToSaf(directoryUri, localUri, filename, mimeType);
                    return; // Success!
                } catch (err) {
                    console.log('Failed to write directly using cached directoryUri, requesting permission again:', err);
                    await AsyncStorage.removeItem('downloads_directory_uri');
                    directoryUri = null;
                }
            }

            // If we don't have permission or writing failed, prompt the user to select folder once
            Alert.alert(
                'Select Download Folder',
                'To save files directly to your device, please select a folder (e.g., Downloads) in the next screen.',
                [
                    {
                        text: 'Choose Folder',
                        onPress: async () => {
                            try {
                                const result = await StorageAccessFramework.requestDirectoryPermissionsAsync();
                                if (result.granted) {
                                    await AsyncStorage.setItem('downloads_directory_uri', result.directoryUri);
                                    await writeToSaf(result.directoryUri, localUri, filename, mimeType);
                                } else {
                                    // User cancelled/denied permission, fallback to Sharing
                                    await fallbackToShare(localUri, mimeType);
                                }
                            } catch (err) {
                                console.error('SAF Permission Error:', err);
                                await fallbackToShare(localUri, mimeType);
                            }
                        }
                    },
                    {
                        text: 'Cancel',
                        style: 'cancel',
                        onPress: async () => {
                            await fallbackToShare(localUri, mimeType);
                        }
                    }
                ]
            );
        } else {
            // iOS: use standard sharing which natively includes "Save to Files"
            await fallbackToShare(localUri, mimeType);
        }
    } catch (error: any) {
        console.error('downloadAndSaveFile error:', error);
        Alert.alert('Download Failed', error.message || 'An error occurred while downloading the file.');
    }
};

const writeToSaf = async (directoryUri: string, localUri: string, filename: string, mimeType: string) => {
    // Read file contents as Base64
    const fileContent = await FileSystem.readAsStringAsync(localUri, {
        encoding: FileSystem.EncodingType.Base64,
    });

    // Create the file in the SAF directory
    const safFileUri = await StorageAccessFramework.createFileAsync(
        directoryUri,
        filename,
        mimeType
    );

    // Write the data to the created file
    await FileSystem.writeAsStringAsync(safFileUri, fileContent, {
        encoding: FileSystem.EncodingType.Base64,
    });

    if (Platform.OS === 'android') {
        ToastAndroid.show(`Saved: ${filename}`, ToastAndroid.SHORT);
    }
};

const fallbackToShare = async (localUri: string, mimeType: string) => {
    try {
        await Sharing.shareAsync(localUri, {
            mimeType,
            dialogTitle: 'Share / Save File',
        });
    } catch (err) {
        console.error('Fallback sharing failed:', err);
        Alert.alert('Error', 'Failed to share/save the file.');
    }
};
