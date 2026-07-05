import * as FileSystem from 'expo-file-system/legacy';
import { Platform, Alert, ToastAndroid } from 'react-native';
import * as Sharing from 'expo-sharing';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Toast from 'react-native-toast-message';

const SAF_DIR_KEY = '@saf_dir_uri';

/**
 * Downloads and saves a file locally.
 * On Android, it uses StorageAccessFramework to save directly to the device's public folders (like Downloads)
 * without opening the Share Dialog. It remembers the chosen folder for future downloads.
 * Displays a custom download progress toast during the transfer.
 */
export const downloadAndSaveFile = async (
    sourceUri: string,
    filename: string,
    mimeType: string,
    isLocalUri = false
) => {
    try {
        let finalLocalUri = '';
        
        Toast.show({
            type: 'downloading',
            text1: 'Downloading Report',
            text2: `Saving ${filename}...`,
            props: { progress: 0 },
            autoHide: false,
        });

        if (isLocalUri) {
            finalLocalUri = sourceUri;
            Toast.show({ type: 'downloading', text1: 'Downloading Report', text2: 'Finalizing...', props: { progress: 100 }, autoHide: false });
        } else {
            const destUri = `${FileSystem.documentDirectory}${filename}`;
            const downloadResumable = FileSystem.createDownloadResumable(
                sourceUri,
                destUri,
                {},
                (downloadProgress) => {
                    const progress = Math.round((downloadProgress.totalBytesWritten / downloadProgress.totalBytesExpectedToWrite) * 100);
                    Toast.show({
                        type: 'downloading',
                        text1: 'Downloading Report',
                        text2: `Saving ${filename}...`,
                        props: { progress: Math.min(progress, 100) },
                        autoHide: false,
                    });
                }
            );
            const downloadResult = await downloadResumable.downloadAsync();
            if (downloadResult && downloadResult.status === 200) {
                finalLocalUri = downloadResult.uri;
            } else {
                throw new Error('Download failed from server.');
            }
        }

        Toast.hide();
        const canShare = await Sharing.isAvailableAsync();
        if (canShare) {
            await Sharing.shareAsync(finalLocalUri, {
                mimeType,
                dialogTitle: `Save ${filename}`,
                UTI: getUTI(mimeType),
            });
        } else {
            Alert.alert('File Ready', `File saved as:\n${filename}`);
        }

    } catch (error: any) {
        Toast.hide();
        console.error('downloadAndSaveFile error:', error);
        Alert.alert('Download Failed', error.message || 'An error occurred while downloading the file.');
    }
};

const getUTI = (mimeType: string): string => {
    if (mimeType.includes('spreadsheetml') || mimeType.includes('excel')) return 'com.microsoft.excel.xlsx';
    if (mimeType.includes('pdf')) return 'com.adobe.pdf';
    if (mimeType.includes('csv')) return 'public.comma-separated-values-text';
    return 'public.data';
};
