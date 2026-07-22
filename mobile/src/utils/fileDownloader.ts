import * as FileSystem from 'expo-file-system/legacy';
import { Platform } from 'react-native';
import * as Sharing from 'expo-sharing';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Toast from 'react-native-toast-message';

const { StorageAccessFramework } = FileSystem;
const DOWNLOAD_DIR_KEY = 'saf_download_directory_uri';

/**
 * Saves a file directly to the device's Downloads folder.
 *
 * Android has no direct filesystem write access to public folders (scoped storage),
 * so this uses the Storage Access Framework: the user grants a Downloads folder once
 * (persisted for next time), and every file after that writes straight there with no
 * share sheet involved.
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
            type: 'info',
            text1: '⏳ Saving receipt...',
            text2: filename,
            autoHide: false,
        });

        if (isLocalUri) {
            finalLocalUri = sourceUri;
        } else {
            const destUri = `${FileSystem.documentDirectory}${filename}`;
            const result = await FileSystem.downloadAsync(sourceUri, destUri);
            if (result.status === 200) {
                finalLocalUri = result.uri;
            } else {
                throw new Error('Download failed from server.');
            }
        }

        if (Platform.OS === 'android') {
            await saveToDownloadsAndroid(finalLocalUri, filename, mimeType);
            return;
        }

        // iOS has no public Downloads folder; share sheet -> "Save to Files" is standard.
        Toast.hide();
        await fallbackToShareSheet(finalLocalUri, mimeType, filename);

    } catch (error: any) {
        Toast.hide();
        console.error('downloadAndSaveFile error:', error);
        Toast.show({
            type: 'error',
            text1: '❌ Download Failed',
            text2: error?.message?.slice(0, 80) || 'Could not save the receipt.',
            visibilityTime: 4000,
        });
    }
};

const saveToDownloadsAndroid = async (localUri: string, filename: string, mimeType: string) => {
    let directoryUri = await AsyncStorage.getItem(DOWNLOAD_DIR_KEY);

    if (!directoryUri) {
        const permission = await StorageAccessFramework.requestDirectoryPermissionsAsync();
        if (!permission.granted) {
            Toast.hide();
            Toast.show({
                type: 'error',
                text1: '❌ Permission Denied',
                text2: 'Please allow access to a folder to download the PDF.',
                visibilityTime: 4000,
            });
            return;
        }
        directoryUri = permission.directoryUri;
        await AsyncStorage.setItem(DOWNLOAD_DIR_KEY, directoryUri);
    }

    const base64Content = await FileSystem.readAsStringAsync(localUri, {
        encoding: FileSystem.EncodingType.Base64,
    });

    const nameWithoutExt = filename.replace(/\.[^/.]+$/, '');

    try {
        const destFileUri = await StorageAccessFramework.createFileAsync(directoryUri, nameWithoutExt, mimeType);
        await FileSystem.writeAsStringAsync(destFileUri, base64Content, {
            encoding: FileSystem.EncodingType.Base64,
        });
    } catch (writeError) {
        // The saved folder permission may have been revoked; ask again and retry once.
        await AsyncStorage.removeItem(DOWNLOAD_DIR_KEY);
        const permission = await StorageAccessFramework.requestDirectoryPermissionsAsync();
        if (!permission.granted) {
            Toast.hide();
            Toast.show({
                type: 'error',
                text1: '❌ Permission Denied',
                text2: 'Please allow access to a folder to download the PDF.',
                visibilityTime: 4000,
            });
            return;
        }
        await AsyncStorage.setItem(DOWNLOAD_DIR_KEY, permission.directoryUri);
        const destFileUri = await StorageAccessFramework.createFileAsync(permission.directoryUri, nameWithoutExt, mimeType);
        await FileSystem.writeAsStringAsync(destFileUri, base64Content, {
            encoding: FileSystem.EncodingType.Base64,
        });
    }

    Toast.hide();
    Toast.show({
        type: 'success',
        text1: '✅ Saved to Downloads!',
        text2: filename,
        visibilityTime: 4000,
    });
};

const fallbackToShareSheet = async (uri: string, mimeType: string, filename: string) => {
    const canShare = await Sharing.isAvailableAsync();
    if (canShare) {
        await Sharing.shareAsync(uri, {
            mimeType,
            dialogTitle: 'Save Receipt',
            UTI: getUTI(mimeType),
        });
    } else {
        Toast.show({
            type: 'success',
            text1: '✅ File Ready',
            text2: `Saved: ${filename}`,
            visibilityTime: 3000,
        });
    }
};

const getUTI = (mimeType: string): string => {
    if (mimeType.includes('pdf')) return 'com.adobe.pdf';
    if (mimeType.includes('spreadsheetml') || mimeType.includes('excel'))
        return 'com.microsoft.excel.xlsx';
    if (mimeType.includes('csv')) return 'public.comma-separated-values-text';
    return 'public.data';
};
