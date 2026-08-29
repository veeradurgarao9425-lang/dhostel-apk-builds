import * as FileSystem from 'expo-file-system/legacy';
import { Platform } from 'react-native';
import * as Sharing from 'expo-sharing';
import * as MediaLibrary from 'expo-media-library';
import Toast from 'react-native-toast-message';

/**
 * Saves a file directly to the device's Downloads/Media directory.
 * - Images/Videos: Saved directly to Gallery / Photos using MediaLibrary without dialogs.
 * - Documents (Excel, PDF, CSV): Saved directly to Downloads / Documents folder on Android using SAF or saved locally.
 * - Fallback: standard share sheet if required.
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
            text1: '⏳ Downloading file...',
            text2: filename,
            autoHide: false,
        });

        if (isLocalUri) {
            finalLocalUri = sourceUri;
        } else {
            const cleanName = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
            const destUri = `${FileSystem.cacheDirectory || FileSystem.documentDirectory}${cleanName}`;
            const result = await FileSystem.downloadAsync(sourceUri, destUri);
            if (result.status === 200) {
                finalLocalUri = result.uri;
            } else {
                throw new Error('Download failed from server.');
            }
        }

        if (Platform.OS === 'android') {
            const isMedia = mimeType.startsWith('image/') || mimeType.startsWith('video/');

            if (isMedia) {
                try {
                    const { status } = await MediaLibrary.requestPermissionsAsync(true);
                    if (status === 'granted') {
                        await MediaLibrary.saveToLibraryAsync(finalLocalUri);
                        Toast.hide();
                        Toast.show({
                            type: 'success',
                            text1: '✅ Saved to Gallery / Photos!',
                            text2: filename,
                            visibilityTime: 4000,
                        });
                        return;
                    }
                } catch (mediaErr) {
                    console.warn('Direct media save failed:', mediaErr);
                }
            } else {
                // For Excel .xlsx, PDF, CSV on Android
                try {
                    const permissions = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
                    if (permissions.granted) {
                        const base64 = await FileSystem.readAsStringAsync(finalLocalUri, {
                            encoding: FileSystem.EncodingType.Base64,
                        });
                        const createdUri = await FileSystem.StorageAccessFramework.createFileAsync(
                            permissions.directoryUri,
                            filename,
                            mimeType
                        );
                        await FileSystem.writeAsStringAsync(createdUri, base64, {
                            encoding: FileSystem.EncodingType.Base64,
                        });
                        Toast.hide();
                        Toast.show({
                            type: 'success',
                            text1: '✅ Downloaded Successfully!',
                            text2: filename,
                            visibilityTime: 4000,
                        });
                        return;
                    }
                } catch (safErr) {
                    console.warn('SAF direct save failed:', safErr);
                }
            }
        }

        // Fallback for iOS or if direct save was dismissed
        Toast.hide();
        await fallbackToShareSheet(finalLocalUri, mimeType, filename);

    } catch (error: any) {
        Toast.hide();
        console.error('downloadAndSaveFile error:', error);
        Toast.show({
            type: 'error',
            text1: '❌ Download Failed',
            text2: error?.message?.slice(0, 80) || 'Could not save the file.',
            visibilityTime: 4000,
        });
    }
};

const fallbackToShareSheet = async (uri: string, mimeType: string, filename: string) => {
    const canShare = await Sharing.isAvailableAsync();
    if (canShare) {
        await Sharing.shareAsync(uri, {
            mimeType,
            dialogTitle: `Download ${filename}`,
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
