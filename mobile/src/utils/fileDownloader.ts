import * as FileSystem from 'expo-file-system/legacy';
import { Platform } from 'react-native';
import * as Sharing from 'expo-sharing';
import * as MediaLibrary from 'expo-media-library';
import Toast from 'react-native-toast-message';

/**
 * Saves a file directly to the device's Downloads folder.
 * Android: uses expo-media-library to save to the device Downloads — zero dialogs, zero share sheet.
 * iOS: opens standard share sheet → "Save to Files".
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
            const destUri = `${FileSystem.documentDirectory}${filename}`;
            const result = await FileSystem.downloadAsync(sourceUri, destUri);
            if (result.status === 200) {
                finalLocalUri = result.uri;
            } else {
                throw new Error('Download failed from server.');
            }
        }

        if (Platform.OS === 'android') {
            try {
                // Request media library permission (writeOnly)
                const { status } = await MediaLibrary.requestPermissionsAsync(true);
                if (status === 'granted') {
                    await MediaLibrary.saveToLibraryAsync(finalLocalUri);
                    Toast.hide();
                    Toast.show({
                        type: 'success',
                        text1: '✅ Saved to Gallery / Downloads!',
                        text2: filename,
                        visibilityTime: 4000,
                    });
                    return;
                }
            } catch (mediaErr) {
                console.warn('Direct media save failed, falling back to share sheet:', mediaErr);
            }
        }

        // Fallback to Sharing sheet (Save to Files / Drive / Gallery / WhatsApp)
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



