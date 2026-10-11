import { Platform } from 'react-native';
import { Asset } from 'expo-asset';
import * as FileSystem from 'expo-file-system/legacy';
import * as MediaLibrary from 'expo-media-library';
import { requireOptionalNativeModule } from 'expo-modules-core';
import type { Wallpaper } from '@wallp/shared';
import { demoSources } from './demo';
async function cachedFile(w: Wallpaper) {
  if (w.demoArt !== undefined) {
    const asset = Asset.fromModule(demoSources[w.demoArt]);
    await asset.downloadAsync();
    if (!asset.localUri) throw new Error('Could not load this artwork.');
    return asset.localUri;
  }
  const target = `${FileSystem.cacheDirectory}wallp-${w.id}.jpg`;
  const result = await FileSystem.downloadAsync(w.imageUrl, target);
  if (result.status !== 200) throw new Error('Could not download this artwork.');
  return result.uri;
}
export async function saveWallpaper(w: Wallpaper) {
  if (Platform.OS === 'web') {
    const uri = w.demoArt !== undefined ? Asset.fromModule(demoSources[w.demoArt]).uri : w.imageUrl;
    const response = await fetch(uri);
    if (!response.ok) throw new Error('Download failed.');
    const url = URL.createObjectURL(await response.blob());
    const link = document.createElement('a');
    link.href = url;
    link.download = `${w.title}.jpg`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return;
  }
  const permission = await MediaLibrary.requestPermissionsAsync(true, ['photo']);
  if (!permission.granted) throw new Error('Allow photo access to save this wallpaper.');
  await MediaLibrary.saveToLibraryAsync(await cachedFile(w));
}
export async function applyWallpaper(w: Wallpaper, target: 'home' | 'lock' | 'both') {
  if (Platform.OS !== 'android')
    throw new Error(
      Platform.OS === 'ios'
        ? 'Save the image, then open Settings → Wallpaper → Add New Wallpaper to apply it.'
        : 'Apply wallpaper is available in the Android development build. You can save the image here.',
    );
  const module = requireOptionalNativeModule<{
    apply(uri: string, target: string): Promise<boolean>;
  }>('WallpWallpaper');
  if (!module)
    throw new Error('Build the Android app to enable wallpaper application. Run npm run android.');
  const uri = await cachedFile(w);
  const copy = `${FileSystem.cacheDirectory}wallp-apply.jpg`;
  await FileSystem.copyAsync({ from: uri, to: copy });
  await module.apply(copy, target);
}
