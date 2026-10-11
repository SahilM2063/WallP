import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, TextInput, ScrollView, RefreshControl, useWindowDimensions } from 'react-native';
import Animated, {
  Easing,
  LinearTransition,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { Search, X } from 'lucide-react-native';
import type { Wallpaper } from '@wallp/shared';
import { useApp } from '../state';
import {
  Label,
  Chip,
  IconButton,
  ArtCard,
  Artwork,
  Empty,
  Button,
  Tap,
  openFrom,
  type Rect,
} from '../ui';
import { fonts } from '../theme';

const GAP = 12;
const HEIGHTS = [236, 292, 260];
// Height follows the wallpaper's place in the catalog, not in the filtered list, so a tile
// never changes size.
const tileHeight = (index: number) => HEIGHTS[index % HEIGHTS.length];
const ease = Easing.bezier(0.2, 0.8, 0.2, 1);

function Tile({
  shown,
  spot,
  width,
  height,
  children,
}: {
  shown: boolean;
  spot: { left: number; top: number };
  width: number;
  height: number;
  children: React.ReactNode;
}) {
  const visible = useSharedValue(shown ? 1 : 0);
  useEffect(() => {
    visible.value = withTiming(shown ? 1 : 0, { duration: shown ? 280 : 160 });
  }, [shown]);
  const fade = useAnimatedStyle(() => ({
    opacity: visible.value,
    transform: [{ scale: 0.92 + 0.08 * visible.value }],
  }));
  return (
    <Animated.View
      layout={LinearTransition.duration(380).easing(ease)}
      pointerEvents={shown ? 'auto' : 'none'}
      accessibilityElementsHidden={!shown}
      importantForAccessibility={shown ? 'auto' : 'no-hide-descendants'}
      style={{ position: 'absolute', ...spot, width, height }}
    >
      <Animated.View style={fade}>{children}</Animated.View>
    </Animated.View>
  );
}
const filters = ['All', 'New', 'Popular', 'Light', 'Dark', 'Colorful'];
const periods = [
  ['day', 'Today'],
  ['week', 'This week'],
  ['month', 'This month'],
] as const;

function Pick({
  label,
  wallpaper,
  width,
  onOpen,
}: {
  label: string;
  wallpaper: Wallpaper;
  width: number;
  onOpen: (origin?: Rect) => void;
}) {
  const { theme } = useApp();
  const frame = useRef<View>(null);
  return (
    <View ref={frame} collapsable={false} style={{ width, height: 210 }}>
      <Tap
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${wallpaper.title}`}
        onPress={() => openFrom(frame.current, onOpen)}
        dip={0.98}
        style={{ flex: 1, borderRadius: 30, overflow: 'hidden', backgroundColor: theme.soft }}
      >
        <Artwork wallpaper={wallpaper} original />
        <View
          style={{
            position: 'absolute',
            left: 12,
            bottom: 12,
            height: 36,
            paddingHorizontal: 14,
            borderRadius: 18,
            justifyContent: 'center',
            backgroundColor: '#FFFFFF',
          }}
        >
          <Label style={{ fontSize: 14, fontFamily: fonts.heading, color: '#0B0B0C' }}>
            {label}
          </Label>
        </View>
      </Tap>
    </View>
  );
}

export function Discover({ onOpen }: { onOpen: (w: Wallpaper, origin?: Rect) => void }) {
  const { theme, catalog, loading, refresh, error } = useApp();
  const width = Math.min(useWindowDimensions().width, 480);
  const [search, setSearch] = useState('');
  const [searching, setSearching] = useState(false);
  const [filter, setFilter] = useState('All');
  const items = useMemo(() => {
    const query = search.trim().toLowerCase();
    const mood = filter.toLowerCase();
    const result = catalog.wallpapers.filter(
      (w) =>
        (!query || w.title.toLowerCase().includes(query)) &&
        (!['light', 'dark', 'colorful'].includes(mood) || w.mood === mood),
    );
    if (filter === 'Popular') return [...result].sort((a, b) => b.likes - a.likes);
    if (filter === 'New') return [...result].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return result;
  }, [catalog, search, filter]);
  const picks = periods.flatMap(([key, label]) => {
    const wallpaper = catalog.wallpapers.find((w) => w.id === catalog.features[key]);
    return wallpaper ? [{ label, wallpaper }] : [];
  });
  const pickWidth = picks.length > 1 ? width - 84 : width - 40;
  const closeSearch = () => {
    setSearch('');
    setSearching(false);
  };
  const header = (
    <View>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 10,
          height: 48,
          marginTop: 10,
          marginBottom: 16,
          paddingHorizontal: 20,
        }}
      >
        {searching ? (
          <>
            <View
              style={{
                flex: 1,
                flexDirection: 'row',
                alignItems: 'center',
                height: 44,
                backgroundColor: theme.soft,
                borderRadius: 22,
                paddingHorizontal: 16,
                gap: 10,
              }}
            >
              <Search size={18} color={theme.muted} strokeWidth={1.9} />
              <TextInput
                autoFocus
                accessibilityLabel="Search wallpapers"
                placeholder="Search"
                placeholderTextColor={theme.muted}
                value={search}
                onChangeText={setSearch}
                returnKeyType="search"
                style={{
                  flex: 1,
                  color: theme.text,
                  fontFamily: fonts.body,
                  fontSize: 16,
                  height: '100%',
                }}
              />
            </View>
            <IconButton icon={X} label="Close search" onPress={closeSearch} />
          </>
        ) : (
          <>
            <Label heading style={{ flex: 1, fontSize: 32, letterSpacing: -1.2 }}>
              wallp
            </Label>
            <IconButton
              icon={Search}
              label="Search wallpapers"
              onPress={() => setSearching(true)}
            />
          </>
        )}
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 20, gap: 8 }}
      >
        {filters.map((f) => (
          <Chip key={f} label={f} active={filter === f} onPress={() => setFilter(f)} />
        ))}
      </ScrollView>
      {filter === 'All' && !search && picks.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          snapToInterval={pickWidth + 12}
          decelerationRate="fast"
          style={{ marginTop: 20 }}
          contentContainerStyle={{ paddingHorizontal: 20, gap: 12 }}
        >
          {picks.map(({ label, wallpaper }) => (
            <Pick
              key={label}
              label={label}
              wallpaper={wallpaper}
              width={pickWidth}
              onOpen={(origin) => onOpen(wallpaper, origin)}
            />
          ))}
        </ScrollView>
      )}
      <View style={{ height: 20 }} />
      {error && (
        <View style={{ paddingHorizontal: 20, marginBottom: 20, gap: 12 }}>
          <Label style={{ fontSize: 15, lineHeight: 21, color: theme.muted }}>{error}</Label>
          <Button title="Try again" onPress={() => void refresh()} secondary busy={loading} />
        </View>
      )}
    </View>
  );
  // Every wallpaper keeps one tile for the life of the screen, placed by hand into the
  // shorter of two columns. A filter only changes which tiles are shown and where they sit,
  // so they slide to their new spots and the rest fade out, and no image is ever reloaded.
  const column = (width - 40 - GAP) / 2;
  const heights = [0, 0];
  const spots = useRef(new Map<string, { left: number; top: number }>()).current;
  const shown = new Set(items);
  for (const item of items) {
    const side = heights[1] < heights[0] ? 1 : 0;
    spots.set(item.id, { left: 20 + side * (column + GAP), top: heights[side] });
    heights[side] += tileHeight(catalog.wallpapers.indexOf(item)) + GAP;
  }
  return (
    <ScrollView
      contentContainerStyle={{ paddingBottom: 100 }}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      refreshControl={<RefreshControl refreshing={loading} onRefresh={() => void refresh()} />}
    >
      {header}
      <View style={{ height: Math.max(...heights), overflow: 'hidden' }}>
        {catalog.wallpapers.map((item, i) => (
          <Tile
            key={item.id}
            shown={shown.has(item)}
            // A hidden tile waits where it last was.
            spot={spots.get(item.id) || { left: 20, top: 0 }}
            width={column}
            height={tileHeight(i)}
          >
            <ArtCard
              wallpaper={item}
              height={tileHeight(i)}
              onOpen={(origin) => onOpen(item, origin)}
            />
          </Tile>
        ))}
      </View>
      {!items.length && !loading && (
        <Empty
          title={catalog.wallpapers.length ? 'No matches' : 'Nothing here yet'}
          description={
            catalog.wallpapers.length
              ? 'Try a different search or filter.'
              : 'New wallpapers will show up here.'
          }
        />
      )}
    </ScrollView>
  );
}
