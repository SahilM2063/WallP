import React from 'react';
import { View } from 'react-native';
import type { Wallpaper } from '@wallp/shared';
import { useApp } from './state';
import { Artwork } from './ui';

const spots = [
  { left: 0.06, top: 0.07, rotate: '-9deg' },
  { left: 0.48, top: 0.09, rotate: '8deg' },
  { left: 0.27, top: 0.02, rotate: '-1deg' },
];

// A square folder: up to three wallpapers poking out of a frosted pocket. The frost is the
// same artwork drawn again, blurred, so a grid of these stays cheap.
export function Folder({ wallpapers, size }: { wallpapers: Wallpaper[]; size: number }) {
  const { theme, dark } = useApp();
  const shown = wallpapers.slice(0, 3);
  const cardWidth = size * 0.46;
  const pocketTop = size * 0.42;
  const cards = (offset: number, blurred: boolean) =>
    shown.map((w, i) => (
      <View
        key={w.id}
        style={{
          position: 'absolute',
          left: size * spots[i].left,
          top: size * spots[i].top - offset,
          width: cardWidth,
          height: cardWidth * 1.5,
          borderRadius: 14,
          overflow: 'hidden',
          backgroundColor: theme.soft,
          transform: [{ rotate: spots[i].rotate }],
        }}
      >
        <Artwork wallpaper={w} blurRadius={blurred ? 16 : undefined} />
      </View>
    ));
  return (
    <View style={{ width: size, height: size }}>
      {cards(0, false)}
      <View
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: pocketTop,
          bottom: 0,
          borderRadius: 24,
          overflow: 'hidden',
          backgroundColor: theme.soft,
        }}
      >
        {cards(pocketTop, true)}
        <View
          style={{
            position: 'absolute',
            inset: 0,
            backgroundColor: dark ? 'rgba(28,28,30,0.45)' : 'rgba(255,255,255,0.4)',
          }}
        />
        <View
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: 24,
            borderWidth: 1,
            borderColor: dark ? 'rgba(255,255,255,0.14)' : 'rgba(255,255,255,0.7)',
          }}
        />
      </View>
    </View>
  );
}
