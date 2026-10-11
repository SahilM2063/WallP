import React, { useState } from 'react';
import { View, FlatList, ActivityIndicator, type LayoutChangeEvent } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft, Heart, Download, Check } from 'lucide-react-native';
import type { Wallpaper } from '@wallp/shared';
import { useApp } from '../state';
import { Label, Artwork, IconButton, Tap } from '../ui';
import { SetSheet, setLabel } from '../SetSheet';
import { saveWallpaper } from '../actions';
import { fonts } from '../theme';

// Full-screen, one wallpaper per swipe. Like, save and set all happen right here.
export function Feed({
  items,
  onBack,
  onError,
  initialIndex = 0,
  onIndexChange,
}: {
  items: Wallpaper[];
  onBack: () => void;
  onError: (s: string) => void;
  initialIndex?: number;
  onIndexChange: (index: number) => void;
}) {
  const { toggleLike, likedIds } = useApp();
  const [height, setHeight] = useState(0);
  const [picking, setPicking] = useState<Wallpaper | null>(null);
  const [saving, setSaving] = useState('');
  const [note, setNote] = useState({ id: '', text: '' });
  const save = async (w: Wallpaper) => {
    setSaving(w.id);
    try {
      await saveWallpaper(w);
      setNote({ id: w.id, text: 'Saved' });
    } catch (e) {
      onError((e as Error).message);
    } finally {
      setSaving('');
    }
  };
  return (
    <View
      style={{ flex: 1, backgroundColor: '#000000' }}
      onLayout={(e: LayoutChangeEvent) => setHeight(e.nativeEvent.layout.height)}
    >
      {height > 0 && (
        <FlatList
          data={items}
          extraData={[likedIds, saving, note]}
          pagingEnabled
          snapToInterval={height}
          decelerationRate="fast"
          showsVerticalScrollIndicator={false}
          keyExtractor={(w) => w.id}
          initialNumToRender={2}
          initialScrollIndex={initialIndex}
          maxToRenderPerBatch={2}
          windowSize={3}
          getItemLayout={(_, i) => ({ length: height, offset: height * i, index: i })}
          onMomentumScrollEnd={(e) =>
            onIndexChange(
              Math.min(items.length - 1, Math.round(e.nativeEvent.contentOffset.y / height)),
            )
          }
          renderItem={({ item: w }) => {
            const liked = likedIds.includes(w.id);
            return (
              <View style={{ height, width: '100%' }}>
                <Artwork wallpaper={w} original />
                <LinearGradient
                  colors={['transparent', 'rgba(0,0,0,0.6)']}
                  style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 280 }}
                />
                <View style={{ position: 'absolute', left: 20, right: 20, bottom: 24, gap: 16 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    <Label
                      heading
                      numberOfLines={1}
                      style={{ flex: 1, fontSize: 26, letterSpacing: -0.8, color: '#FFFFFF' }}
                    >
                      {w.title}
                    </Label>
                    {note.id === w.id && (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Check size={16} color="#FFFFFF" strokeWidth={2.2} />
                        <Label style={{ fontSize: 15, color: '#FFFFFF' }}>{note.text}</Label>
                      </View>
                    )}
                  </View>
                  <View style={{ flexDirection: 'row', gap: 10 }}>
                    <Tap
                      accessibilityRole="button"
                      dip={0.97}
                      onPress={() => setPicking(w)}
                      style={{
                        flex: 1,
                        height: 56,
                        borderRadius: 28,
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: '#FFFFFF',
                      }}
                    >
                      <Label style={{ fontSize: 16, fontFamily: fonts.heading, color: '#0B0B0C' }}>
                        {setLabel}
                      </Label>
                    </Tap>
                    <IconButton
                      onArt
                      icon={Heart}
                      size={22}
                      active={liked}
                      label={`${liked ? 'Unlike' : 'Like'} ${w.title}`}
                      onPress={() => void toggleLike(w.id).catch((e) => onError(e.message))}
                      style={{ width: 56, height: 56, borderRadius: 28 }}
                    />
                    {saving === w.id ? (
                      <View style={{ width: 56, height: 56, justifyContent: 'center' }}>
                        <ActivityIndicator color="#FFFFFF" />
                      </View>
                    ) : (
                      <IconButton
                        onArt
                        icon={Download}
                        size={22}
                        label={`Save ${w.title}`}
                        onPress={() => void save(w)}
                        style={{ width: 56, height: 56, borderRadius: 28 }}
                      />
                    )}
                  </View>
                </View>
              </View>
            );
          }}
        />
      )}
      <IconButton
        onArt
        icon={ArrowLeft}
        label="Back"
        onPress={onBack}
        style={{ position: 'absolute', left: 20, top: 14 }}
      />
      <SetSheet
        wallpaper={picking}
        onClose={() => setPicking(null)}
        onDone={(text) => picking && setNote({ id: picking.id, text })}
        onError={onError}
      />
    </View>
  );
}
