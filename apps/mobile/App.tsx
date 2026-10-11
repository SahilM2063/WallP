import './global.css';
import React, { useEffect, useRef, useState } from 'react';
import { View, BackHandler, Modal, StyleSheet } from 'react-native';
import Animated, {
  FadeIn,
  FadeOut,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { SafeAreaProvider, SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
const Figtree_400Regular = require('@expo-google-fonts/figtree/400Regular/Figtree_400Regular.ttf');
const Figtree_500Medium = require('@expo-google-fonts/figtree/500Medium/Figtree_500Medium.ttf');
const Figtree_600SemiBold = require('@expo-google-fonts/figtree/600SemiBold/Figtree_600SemiBold.ttf');
const Figtree_700Bold = require('@expo-google-fonts/figtree/700Bold/Figtree_700Bold.ttf');
import { House, Layers, UserRound, ArrowLeft, GalleryVerticalEnd } from 'lucide-react-native';
import { FlashList } from '@shopify/flash-list';
import type { Wallpaper, Collection } from '@wallp/shared';
import { AppProvider, useApp } from './src/state';
import { Label, IconButton, ArtCard, Empty, Button, Tap, openFrom, type Rect } from './src/ui';
import { TabBar } from './src/TabBar';
import { Reveal } from './src/Reveal';
import { Discover } from './src/screens/Discover';
import { Collections } from './src/screens/Collections';
import { Details } from './src/screens/Details';
import { Feed } from './src/screens/Feed';
import { Profile } from './src/screens/Profile';
import { Studio } from './src/screens/Studio';

type Route =
  | { kind: 'details'; wallpaper: Wallpaper; origin?: Rect }
  | { kind: 'feed'; items: Wallpaper[]; index?: number; origin?: Rect }
  | { kind: 'collection'; collection: Collection }
  | { kind: 'studio' };
const tabs = [
  { name: 'Discover' as const, icon: House },
  { name: 'Collections' as const, icon: Layers },
  { name: 'You' as const, icon: UserRound },
];
type TabName = (typeof tabs)[number]['name'];

// One tab's screen. Stays mounted while hidden; eases in when it becomes the active tab.
function Pane({ active, children }: { active: boolean; children: React.ReactNode }) {
  const shown = useSharedValue(active ? 1 : 0);
  useEffect(() => {
    shown.value = active ? withTiming(1, { duration: 220 }) : 0;
  }, [active]);
  const style = useAnimatedStyle(() => ({
    opacity: shown.value,
    transform: [{ translateY: (1 - shown.value) * 10 }],
  }));
  return (
    <Animated.View style={[{ flex: 1, display: active ? 'flex' : 'none' }, style]}>
      {children}
    </Animated.View>
  );
}
function Shell() {
  const { theme, dark, catalog } = useApp();
  const [tab, setTab] = useState<TabName>('Discover');
  const feedButton = useRef<View>(null);
  const [stack, setStack] = useState<Route[]>([]);
  const [message, setMessage] = useState('');
  const route = stack.at(-1);
  const back = () => setStack((s) => s.slice(0, -1));
  const open = (wallpaper: Wallpaper, origin?: Rect) =>
    setStack((s) => [...s, { kind: 'details', wallpaper, origin }]);
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (message) {
        setMessage('');
        return true;
      }
      // Wallpaper previews, the feed and Studio handle back themselves (they animate out or
      // step back internally); returning false passes the press on to them.
      if (route && route.kind !== 'collection') return false;
      if (stack.length) {
        back();
        return true;
      }
      if (tab !== 'Discover') {
        setTab('Discover');
        return true;
      }
      return false;
    });
    return () => sub.remove();
  }, [stack.length, tab, message]);
  const immersive = route?.kind === 'feed';
  const insets = useSafeAreaInsets();
  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <StatusBar style={dark || immersive ? 'light' : 'dark'} />
      <SafeAreaView
        style={{
          flex: 1,
          width: '100%',
          maxWidth: 480,
          alignSelf: 'center',
          backgroundColor: theme.bg,
        }}
        edges={['top', 'bottom']}
      >
        {/* Absolute children ignore the safe-area padding, so they anchor to this view. */}
        <View style={{ flex: 1 }}>
          <Pane active={tab === 'Discover'}>
            <Discover onOpen={open} />
          </Pane>
          <Pane active={tab === 'Collections'}>
            <Collections onOpen={(collection) => setStack([{ kind: 'collection', collection }])} />
          </Pane>
          <Pane active={tab === 'You'}>
            <Profile
              onOpen={open}
              onStudio={() => setStack([{ kind: 'studio' }])}
              onError={setMessage}
            />
          </Pane>
          <View
            pointerEvents="box-none"
            style={{
              position: 'absolute',
              bottom: 12,
              left: 20,
              right: 20,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <TabBar tabs={tabs} tab={tab} onChange={setTab} />
            {catalog.wallpapers.length > 0 && (
              <View ref={feedButton} collapsable={false}>
                <Tap
                  accessibilityRole="button"
                  accessibilityLabel="Browse full screen"
                  dip={0.9}
                  onPress={() =>
                    openFrom(feedButton.current, (origin) =>
                      setStack([{ kind: 'feed', items: catalog.wallpapers, origin }]),
                    )
                  }
                  style={{
                    width: 58,
                    height: 58,
                    borderRadius: 29,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: theme.accent,
                    boxShadow: '0 10px 24px rgba(0,0,0,0.22)',
                  }}
                >
                  <GalleryVerticalEnd size={22} color={theme.accentText} strokeWidth={1.9} />
                </Tap>
              </View>
            )}
          </View>
          {/* Screens stack as layers over the tabs, so whatever is underneath stays visible
            while the next one animates in or out. */}
          {stack.map((r, depth) => {
            if (r.kind === 'details')
              return (
                <Details
                  key={`${depth}-${r.wallpaper.id}`}
                  wallpaper={catalog.wallpapers.find((w) => w.id === r.wallpaper.id) || r.wallpaper}
                  origin={r.origin}
                  onBack={back}
                  onError={setMessage}
                />
              );
            if (r.kind === 'feed')
              return (
                // The feed runs edge to edge, so its layer extends over the safe-area insets.
                <View
                  key={`${depth}-feed`}
                  style={{
                    position: 'absolute',
                    left: 0,
                    right: 0,
                    top: -insets.top,
                    bottom: -insets.bottom,
                  }}
                >
                  <Reveal origin={r.origin} color="#000000" onClosed={back}>
                    {(close) => (
                      <View
                        style={{ flex: 1, paddingTop: insets.top, paddingBottom: insets.bottom }}
                      >
                        <Feed
                          items={r.items}
                          initialIndex={r.index || 0}
                          onIndexChange={(index) =>
                            setStack((routes) =>
                              routes.map((x) => (x.kind === 'feed' ? { ...x, index } : x)),
                            )
                          }
                          onBack={close}
                          onError={setMessage}
                        />
                      </View>
                    )}
                  </Reveal>
                </View>
              );
            const items =
              r.kind === 'collection'
                ? catalog.wallpapers.filter((w) => w.collectionIds.includes(r.collection.id))
                : [];
            return (
              <Animated.View
                key={`${depth}-${r.kind}`}
                entering={FadeIn.duration(200)}
                exiting={FadeOut.duration(160)}
                style={[StyleSheet.absoluteFill, { backgroundColor: theme.bg }]}
              >
                {r.kind === 'studio' && <Studio onBack={back} onOpen={open} onError={setMessage} />}
                {r.kind === 'collection' && (
                  <FlashList
                    masonry
                    numColumns={2}
                    data={items}
                    keyExtractor={(w) => w.id}
                    showsVerticalScrollIndicator={false}
                    ListHeaderComponent={
                      <View style={{ paddingHorizontal: 20, paddingTop: 14, paddingBottom: 24 }}>
                        <IconButton icon={ArrowLeft} label="Back to collections" onPress={back} />
                        <Label heading style={{ fontSize: 32, letterSpacing: -1.2, marginTop: 20 }}>
                          {r.collection.title}
                        </Label>
                        <Label style={{ fontSize: 15, color: theme.muted, marginTop: 4 }}>
                          {items.length} wallpapers
                        </Label>
                      </View>
                    }
                    contentContainerStyle={{ paddingBottom: 24 }}
                    renderItem={({ item, index }) => (
                      <View
                        style={{
                          paddingLeft: index % 2 === 0 ? 20 : 6,
                          paddingRight: index % 2 === 0 ? 6 : 20,
                        }}
                      >
                        <ArtCard
                          wallpaper={item}
                          height={index % 3 === 0 ? 236 : 292}
                          onOpen={(origin) => open(item, origin)}
                        />
                      </View>
                    )}
                    ListEmptyComponent={
                      <Empty
                        title="Nothing here yet"
                        description="New wallpapers will show up here."
                      />
                    }
                  />
                )}
              </Animated.View>
            );
          })}
        </View>
        <Modal
          transparent
          visible={!!message}
          animationType="fade"
          onRequestClose={() => setMessage('')}
        >
          <View
            style={{
              flex: 1,
              backgroundColor: 'rgba(0,0,0,0.35)',
              justifyContent: 'center',
              alignItems: 'center',
              padding: 24,
            }}
          >
            <View
              style={{
                backgroundColor: theme.bg,
                padding: 22,
                borderRadius: 32,
                gap: 20,
                width: '100%',
                maxWidth: 380,
              }}
            >
              <Label style={{ fontSize: 16, lineHeight: 23 }}>{message}</Label>
              <Button title="OK" onPress={() => setMessage('')} />
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </View>
  );
}
// Hold the splash screen until the fonts are in, so the first frame is the finished UI.
void SplashScreen.preventAutoHideAsync();
export default function App() {
  const [loaded, error] = useFonts({
    Figtree_400Regular,
    Figtree_500Medium,
    Figtree_600SemiBold,
    Figtree_700Bold,
  });
  const ready = loaded || !!error;
  useEffect(() => {
    if (ready) void SplashScreen.hideAsync();
  }, [ready]);
  if (!ready) return null;
  return (
    <SafeAreaProvider>
      <AppProvider>
        <Shell />
      </AppProvider>
    </SafeAreaProvider>
  );
}
