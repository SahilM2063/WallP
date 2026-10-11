import React, { useState } from 'react';
import { View, Pressable, Modal, Platform } from 'react-native';
import { Download, House, Lock, Smartphone, type LucideIcon } from 'lucide-react-native';
import type { Wallpaper } from '@wallp/shared';
import { useApp } from './state';
import { Label, Button } from './ui';
import { applyWallpaper, saveWallpaper } from './actions';
import { fonts } from './theme';

const targets: { key: 'home' | 'lock' | 'both'; title: string; icon: LucideIcon }[] = [
  { key: 'home', title: 'Home screen', icon: House },
  { key: 'lock', title: 'Lock screen', icon: Lock },
  { key: 'both', title: 'Both', icon: Smartphone },
];
export const setLabel = Platform.OS === 'ios' ? 'How to apply' : 'Set wallpaper';

// Bottom sheet that applies a wallpaper (Android) or explains how to (elsewhere).
export function SetSheet({
  wallpaper,
  onClose,
  onDone,
  onError,
}: {
  wallpaper: Wallpaper | null;
  onClose: () => void;
  onDone: (message: string) => void;
  onError: (message: string) => void;
}) {
  const { theme } = useApp();
  const [busy, setBusy] = useState(false);
  const run = async (fn: (w: Wallpaper) => Promise<void>, message: string) => {
    if (!wallpaper) return;
    setBusy(true);
    try {
      await fn(wallpaper);
      onClose();
      onDone(message);
    } catch (e) {
      onError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const close = () => !busy && onClose();
  return (
    <Modal visible={!!wallpaper} transparent animationType="slide" onRequestClose={close}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'flex-end' }}>
        <Pressable style={{ flex: 1 }} accessibilityLabel="Close" onPress={close} />
        <View
          style={{
            width: '100%',
            maxWidth: 480,
            alignSelf: 'center',
            backgroundColor: theme.bg,
            borderTopLeftRadius: 36,
            borderTopRightRadius: 36,
            padding: 20,
            paddingTop: 10,
            paddingBottom: 36,
          }}
        >
          <View
            style={{
              alignSelf: 'center',
              width: 36,
              height: 5,
              borderRadius: 3,
              backgroundColor: theme.border,
              marginBottom: 18,
            }}
          />
          <Label heading style={{ fontSize: 22, letterSpacing: -0.6, marginBottom: 16 }}>
            Set wallpaper
          </Label>
          {Platform.OS === 'android' ? (
            <View
              style={{
                borderRadius: 24,
                backgroundColor: theme.soft,
                overflow: 'hidden',
                opacity: busy ? 0.5 : 1,
              }}
            >
              {targets.map(({ key, title, icon: Icon }, i) => (
                <Pressable
                  key={key}
                  accessibilityRole="button"
                  disabled={busy}
                  onPress={() => void run((w) => applyWallpaper(w, key), 'Wallpaper set')}
                  android_ripple={{ color: theme.press }}
                  style={{
                    height: 58,
                    paddingHorizontal: 20,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 14,
                    borderTopWidth: i ? 1 : 0,
                    borderColor: theme.border,
                  }}
                >
                  <Icon size={20} color={theme.text} strokeWidth={1.9} />
                  <Label style={{ fontSize: 16, fontFamily: fonts.medium }}>{title}</Label>
                </Pressable>
              ))}
            </View>
          ) : (
            <>
              <Label style={{ fontSize: 15, lineHeight: 21, color: theme.muted, marginBottom: 20 }}>
                Save the image, then pick it in your wallpaper settings.
              </Label>
              <Button
                title="Save image"
                icon={Download}
                busy={busy}
                onPress={() => void run(saveWallpaper, 'Saved')}
              />
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}
