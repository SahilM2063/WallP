import React, { useState } from 'react';
import { View, ScrollView, Modal, ActivityIndicator } from 'react-native';
import { Image } from 'expo-image';
import { LogOut, Plus, Trash2, UserRound } from 'lucide-react-native';
import type { Wallpaper } from '@wallp/shared';
import { useApp } from '../state';
import { Label, Button, ArtCard, Artwork, Fan, Tap, type Rect } from '../ui';
import { fonts } from '../theme';

const DANGER = '#E5484D';
const appearances = [
  { key: 'system', label: 'Auto' },
  { key: 'light', label: 'Light' },
  { key: 'dark', label: 'Dark' },
] as const;
const swatches = {
  light: { bg: '#FFFFFF', card: '#E9E9EC', line: '#D4D4D8' },
  dark: { bg: '#0E0E0F', card: '#2C2C2E', line: '#3A3A3C' },
};

// A tiny mock of the app in one theme.
function Swatch({ tone }: { tone: keyof typeof swatches }) {
  const c = swatches[tone];
  return (
    <View style={{ flex: 1, backgroundColor: c.bg, padding: 9, gap: 6 }}>
      <View style={{ width: 22, height: 5, borderRadius: 3, backgroundColor: c.line }} />
      <View style={{ flex: 1, borderRadius: 7, backgroundColor: c.card }} />
    </View>
  );
}
// Theme picker: three small previews, the chosen one ringed.
function Appearance() {
  const { theme, preference, setPreference } = useApp();
  return (
    <View
      accessibilityRole="radiogroup"
      accessibilityLabel="Appearance"
      style={{ flexDirection: 'row', gap: 10 }}
    >
      {appearances.map(({ key, label }) => {
        const selected = preference === key;
        return (
          <Tap
            key={key}
            accessibilityRole="radio"
            accessibilityLabel={label}
            accessibilityState={{ selected }}
            dip={0.96}
            onPress={() => setPreference(key)}
            style={{ flex: 1, gap: 8, alignItems: 'center' }}
          >
            <View
              style={{
                alignSelf: 'stretch',
                height: 76,
                padding: 3,
                borderRadius: 22,
                borderWidth: 2,
                borderColor: selected ? theme.text : 'transparent',
              }}
            >
              <View
                style={{
                  flex: 1,
                  flexDirection: 'row',
                  borderRadius: 16,
                  overflow: 'hidden',
                  borderWidth: 1,
                  borderColor: theme.border,
                }}
              >
                {key !== 'dark' && <Swatch tone="light" />}
                {key !== 'light' && <Swatch tone="dark" />}
              </View>
            </View>
            <Label
              style={{
                fontSize: 14,
                fontFamily: fonts.medium,
                color: selected ? theme.text : theme.muted,
              }}
            >
              {label}
            </Label>
          </Tap>
        );
      })}
    </View>
  );
}

export function Profile({
  onOpen,
  onStudio,
  onError,
}: {
  onOpen: (w: Wallpaper, origin?: Rect) => void;
  onStudio: () => void;
  onError: (s: string) => void;
}) {
  const { theme, user, likedIds, catalog, login, logout, deleteAccount } = useApp();
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const likes = catalog.wallpapers.filter((w) => likedIds.includes(w.id));
  const cover =
    likes[0] ||
    catalog.wallpapers.find((w) => w.id === catalog.features.day) ||
    catalog.wallpapers[0];
  const act = async (fn: () => Promise<void>) => {
    setBusy(true);
    try {
      await fn();
    } catch (e) {
      onError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <ScrollView
      contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 100 }}
      showsVerticalScrollIndicator={false}
    >
      <View style={{ height: 48, marginTop: 10, marginBottom: 16, justifyContent: 'center' }}>
        <Label heading style={{ fontSize: 32, letterSpacing: -1.2 }}>
          You
        </Label>
      </View>
      {/* Profile card: one of the wallpapers, blurred, as the backdrop. */}
      <View
        style={{ height: 176, borderRadius: 32, overflow: 'hidden', backgroundColor: '#1C1C1E' }}
      >
        {cover && <Artwork wallpaper={cover} blurRadius={28} />}
        <View style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.3)' }} />
        <View
          style={{ position: 'absolute', inset: 0, padding: 18, justifyContent: 'space-between' }}
        >
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            {user?.avatarUrl ? (
              <Image
                source={{ uri: user.avatarUrl }}
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: 28,
                  borderWidth: 2,
                  borderColor: '#FFFFFF',
                }}
              />
            ) : (
              <View
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: 28,
                  backgroundColor: '#FFFFFF',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {user ? (
                  <Label heading style={{ fontSize: 22, color: '#0B0B0C' }}>
                    {user.name[0]}
                  </Label>
                ) : (
                  <UserRound size={24} color="#0B0B0C" strokeWidth={1.9} />
                )}
              </View>
            )}
            {user && (
              <Tap
                accessibilityRole="button"
                accessibilityLabel="Sign out"
                disabled={busy}
                dip={0.9}
                hitSlop={6}
                onPress={() => void act(logout)}
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 22,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: 'rgba(0,0,0,0.28)',
                }}
              >
                {busy ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <LogOut size={20} color="#FFFFFF" strokeWidth={1.9} />
                )}
              </Tap>
            )}
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 12 }}>
            <View style={{ flex: 1 }}>
              <Label
                heading
                numberOfLines={1}
                style={{ fontSize: 24, letterSpacing: -0.7, color: '#FFFFFF' }}
              >
                {user ? user.name : 'Guest'}
              </Label>
              <Label
                numberOfLines={1}
                style={{ fontSize: 15, color: 'rgba(255,255,255,0.8)', marginTop: 2 }}
              >
                {user ? user.email : 'Favorites stay on this phone'}
              </Label>
            </View>
            {!user && (
              <Tap
                accessibilityRole="button"
                accessibilityLabel="Sign in with Google"
                disabled={busy}
                onPress={() => void act(login)}
                style={{
                  height: 44,
                  minWidth: 88,
                  paddingHorizontal: 18,
                  borderRadius: 22,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: '#FFFFFF',
                }}
              >
                {busy ? (
                  <ActivityIndicator color="#0B0B0C" />
                ) : (
                  <Label style={{ fontSize: 15, fontFamily: fonts.heading, color: '#0B0B0C' }}>
                    Sign in
                  </Label>
                )}
              </Tap>
            )}
          </View>
        </View>
      </View>
      {user?.isAdmin && (
        <View style={{ marginTop: 12 }}>
          <Button title="Open Studio" icon={Plus} onPress={onStudio} />
        </View>
      )}
      <Label heading style={{ fontSize: 22, letterSpacing: -0.6, marginTop: 28, marginBottom: 14 }}>
        Appearance
      </Label>
      <Appearance />
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          marginTop: 28,
          marginBottom: 16,
        }}
      >
        <Label heading style={{ fontSize: 22, letterSpacing: -0.6 }}>
          Favorites
        </Label>
        {likes.length > 0 && (
          <Label style={{ fontSize: 15, color: theme.muted }}>{likes.length}</Label>
        )}
      </View>
      {likes.length ? (
        <View style={{ flexDirection: 'row', gap: 12 }}>
          {[0, 1].map((col) => (
            <View key={col} style={{ flex: 1 }}>
              {likes
                .filter((_, i) => i % 2 === col)
                .map((w, i) => (
                  <ArtCard
                    key={w.id}
                    wallpaper={w}
                    height={(i + col) % 2 ? 292 : 236}
                    onOpen={(origin) => onOpen(w, origin)}
                  />
                ))}
            </View>
          ))}
        </View>
      ) : (
        <View style={{ alignItems: 'center', paddingTop: 8, paddingBottom: 24 }}>
          {catalog.wallpapers.length > 0 && <Fan wallpapers={catalog.wallpapers} height={170} />}
          <Label heading style={{ fontSize: 20, letterSpacing: -0.4, marginTop: 20 }}>
            Nothing saved yet
          </Label>
          <Label style={{ fontSize: 15, color: theme.muted, marginTop: 4 }}>
            Tap the heart on a wallpaper you like.
          </Label>
        </View>
      )}
      {user && (
        <Tap
          accessibilityRole="button"
          disabled={busy}
          dip={0.97}
          onPress={() => setConfirm(true)}
          style={{
            height: 52,
            marginTop: 28,
            borderRadius: 26,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 9,
            backgroundColor: theme.soft,
          }}
        >
          <Trash2 size={19} color={DANGER} strokeWidth={1.9} />
          <Label style={{ fontSize: 16, fontFamily: fonts.heading, color: DANGER }}>
            Delete account
          </Label>
        </Tap>
      )}
      <Modal
        transparent
        visible={confirm}
        animationType="fade"
        onRequestClose={() => setConfirm(false)}
      >
        <View
          style={{
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
            padding: 24,
            backgroundColor: 'rgba(0,0,0,0.35)',
          }}
        >
          <View
            style={{
              width: '100%',
              maxWidth: 380,
              padding: 22,
              gap: 10,
              backgroundColor: theme.bg,
              borderRadius: 32,
            }}
          >
            <Label heading style={{ fontSize: 22, letterSpacing: -0.6 }}>
              Delete account?
            </Label>
            <Label style={{ fontSize: 15, color: theme.muted, lineHeight: 21, marginBottom: 10 }}>
              Your profile and favorites will be removed for good.
            </Label>
            <Button
              title="Delete account"
              icon={Trash2}
              busy={busy}
              onPress={() =>
                void act(async () => {
                  await deleteAccount();
                  setConfirm(false);
                })
              }
            />
            <Button title="Cancel" secondary onPress={() => setConfirm(false)} />
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}
