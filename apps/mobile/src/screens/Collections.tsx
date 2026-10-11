import React, { useState } from 'react';
import { View, ScrollView, useWindowDimensions } from 'react-native';
import { ArrowUpRight } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import type { Collection, Wallpaper } from '@wallp/shared';
import { useApp } from '../state';
import { Label, Chip, Artwork, Empty, Tap } from '../ui';

const HEIGHT = 184;
const PANEL = 104;
const tilts = ['-5deg', '3deg', '-3deg', '5deg'];

// A row of wallpapers tucked into a frosted pocket. The pocket's blur is the same
// artwork drawn again, blurred, so it stays cheap inside a long list.
function Pocket({ wallpapers, width }: { wallpapers: Wallpaper[]; width: number }) {
  const { theme } = useApp();
  const tint = wallpapers[0]?.palette[0] || theme.soft;
  const cardWidth = width * 0.3;
  // Four cards span the pocket edge to edge. Fewer keep the same overlap and sit together
  // in the middle rather than being pushed out to the corners.
  const step = (width - 24 - cardWidth) / 3;
  const first = (width - cardWidth - (wallpapers.length - 1) * step) / 2;
  const cards = (top: number, blurred: boolean) =>
    wallpapers.map((w, i) => (
      <View
        key={w.id}
        style={{
          position: 'absolute',
          left: first + i * step,
          top: top + (i % 2 ? 22 : 14),
          width: cardWidth,
          height: HEIGHT,
          borderRadius: 20,
          overflow: 'hidden',
          borderWidth: blurred ? 0 : 2,
          borderColor: '#FFFFFF',
          transform: [{ rotate: tilts[i % tilts.length] }],
        }}
      >
        <Artwork wallpaper={w} blurRadius={blurred ? 18 : undefined} />
      </View>
    ));
  return (
    <View
      style={{
        height: HEIGHT,
        borderRadius: 32,
        overflow: 'hidden',
        backgroundColor: theme.soft,
      }}
    >
      <View style={{ position: 'absolute', inset: 0, backgroundColor: tint, opacity: 0.35 }} />
      {cards(0, false)}
      <View
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          height: PANEL,
          borderRadius: 32,
          overflow: 'hidden',
          backgroundColor: theme.soft,
        }}
      >
        {cards(PANEL - HEIGHT, true)}
        <View style={{ position: 'absolute', inset: 0, backgroundColor: tint, opacity: 0.45 }} />
        <LinearGradient
          colors={['rgba(255,255,255,0.4)', 'transparent']}
          locations={[0, 0.7]}
          style={{ position: 'absolute', inset: 0 }}
        />
        <View
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: 32,
            borderWidth: 1,
            borderColor: 'rgba(255,255,255,0.55)',
          }}
        />
        <View
          style={{
            position: 'absolute',
            right: 18,
            top: (PANEL - 44) / 2,
            width: 44,
            height: 44,
            borderRadius: 22,
            backgroundColor: '#FFFFFF',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 6px 16px rgba(0,0,0,0.14)',
          }}
        >
          <ArrowUpRight size={20} color="#0B0B0C" strokeWidth={1.9} />
        </View>
      </View>
    </View>
  );
}

export function Collections({ onOpen }: { onOpen: (c: Collection) => void }) {
  const { theme, catalog } = useApp();
  const width = Math.min(useWindowDimensions().width, 480) - 40;
  const [kind, setKind] = useState<Collection['kind']>('curated');
  const items = catalog.collections
    .filter((c) => c.kind === kind)
    .sort((a, b) => (b.month || '').localeCompare(a.month || ''));
  return (
    <ScrollView
      contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 100 }}
      showsVerticalScrollIndicator={false}
    >
      <View style={{ height: 48, marginTop: 10, marginBottom: 16, justifyContent: 'center' }}>
        <Label heading style={{ fontSize: 32, letterSpacing: -1.2 }}>
          Collections
        </Label>
      </View>
      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 24 }}>
        <Chip label="Curated" active={kind === 'curated'} onPress={() => setKind('curated')} />
        <Chip label="Monthly" active={kind === 'monthly'} onPress={() => setKind('monthly')} />
      </View>
      {items.map((c) => {
        const inside = catalog.wallpapers.filter((w) => w.collectionIds.includes(c.id));
        const cover = inside.find((w) => w.id === c.coverId);
        const shown = (cover ? [cover, ...inside.filter((w) => w !== cover)] : inside).slice(0, 4);
        return (
          <Tap
            key={c.id}
            accessibilityRole="button"
            accessibilityLabel={`Open ${c.title}`}
            onPress={() => onOpen(c)}
            dip={0.98}
            style={{ marginBottom: 32 }}
          >
            <Pocket wallpapers={shown} width={width} />
            <Label
              heading
              style={{ fontSize: 22, letterSpacing: -0.6, textAlign: 'center', marginTop: 16 }}
            >
              {c.title}
            </Label>
            <Label style={{ fontSize: 15, color: theme.muted, textAlign: 'center', marginTop: 3 }}>
              {c.month ? `${c.month.slice(0, 4)}  ·  ` : ''}
              {c.count} wallpapers
            </Label>
          </Tap>
        );
      })}
      {!items.length && (
        <Empty title="No collections yet" description="New sets will show up here." />
      )}
    </ScrollView>
  );
}
