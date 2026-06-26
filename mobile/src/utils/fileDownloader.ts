import * as FileSystem from 'expo-file-system/legacy';
import { Platform, Alert, ToastAndroid } from 'react-native';
import * as Sharing from 'expo-sharing';

/**
 * Downloads and saves a file, then opens it — NO folder picker, NO permission dialogs.
 *
 * @param sourceUri   - Local file URI (already downloaded) or remote URL
 * @param filename    - Desired filename (e.g. "report_2024.xlsx")
 * @param mimeType    - MIME type of the file
 * @param isLocalUri  - Set to true if sourceUri is already a local file
 */
export const downloadAndSaveFile = async (
    sourceUri: string,
    filename: string,
    mimeType: string,
    isLocalUri = false
) => {
    try {
        const destUri = `${FileSystem.documentDirectory}${filename}`;

        // Determine the local URI of the file
        let localUri: string;

        if (isLocalUri) {
            // Normalize both URIs to compare them
            const normalizedSource = sourceUri.replace(/\/$/, '');
            const normalizedDest = destUri.replace(/\/$/, '');

            if (normalizedSource === normalizedDest) {
                // Source is already the destination — skip copy, use as-is
                localUri = destUri;
            } else {
                // Copy from existing local URI to document directory
                await FileSystem.copyAsync({ from: sourceUri, to: destUri });
                localUri = destUri;
            }
        } else {
            // Remote URL — download directly to the destination
            const downloadResult = await FileSystem.downloadAsync(sourceUri, destUri);
            if (downloadResult.status !== 200) {
                throw new Error(`Download failed. Server returned status: ${downloadResult.status}`);
            }
            localUri = downloadResult.uri;
        }

        // Open / share the file
        if (Platform.OS === 'android') {
            ToastAndroid.show(`✓ Downloaded: ${filename}`, ToastAndroid.LONG);
        }

        const canShare = await Sharing.isAvailableAsync();
        if (canShare) {
            await Sharing.shareAsync(localUri, {
                mimeType,
                dialogTitle: `Open ${filename}`,
                UTI: getUTI(mimeType),
            });
        } else {
            Alert.alert('File Ready', `File saved as:\n${filename}`);
        }
    } catch (error: any) {
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
