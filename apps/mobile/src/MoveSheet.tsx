import React, { useState } from 'react';
import { View, Pressable, Modal, ScrollView } from 'react-native';
import { Check } from 'lucide-react-native';
import type { Wallpaper } from '@wallp/shared';
import { useApp } from './state';
import { request } from './api';
import { Label } from './ui';
import { fonts } from './theme';

// Owner-only bottom sheet that moves a wallpaper to another collection. A wallpaper lives
// in one collection at a time, so picking one takes it out of the collection it was in.
export function MoveSheet({
  wallpaper,
  onClose,
  onError,
}: {
  wallpaper: Wallpaper | null;
  onClose: () => void;
  onError: (message: string) => void;
}) {
  const { theme, token, catalog, refresh } = useApp();
  const [busy, setBusy] = useState(false);
  const current = wallpaper?.collectionIds[0] || null;
  const move = async (collectionId: string | null) => {
    if (!wallpaper || collectionId === current) return onClose();
    setBusy(true);
    try {
      await request(
        '/admin/wallpapers/collection',
        token,
        { wallpaperIds: [wallpaper.id], collectionId },
        'PUT',
      );
      await refresh();
      onClose();
    } catch (e) {
      onError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const close = () => !busy && onClose();
  const options = [
    ...catalog.collections.map((c) => ({ id: c.id as string | null, title: c.title })),
    { id: null, title: 'No collection' },
  ];
  return (
    <Modal visible={!!wallpaper} transparent animationType="slide" onRequestClose={close}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'flex-end' }}>
        <Pressable style={{ flex: 1 }} accessibilityLabel="Close" onPress={close} />
        <View
          style={{
            width: '100%',
            maxWidth: 480,
            maxHeight: '70%',
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
            Move to collection
          </Label>
          <ScrollView
            showsVerticalScrollIndicator={false}
            style={{ borderRadius: 24, backgroundColor: theme.soft, opacity: busy ? 0.5 : 1 }}
          >
            {options.map(({ id, title }, i) => (
              <Pressable
                key={id || 'none'}
                accessibilityRole="radio"
                accessibilityState={{ selected: id === current }}
                disabled={busy}
                onPress={() => void move(id)}
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
                <Label
                  numberOfLines={1}
                  style={{
                    flex: 1,
                    fontSize: 16,
                    fontFamily: fonts.medium,
                    color: id ? theme.text : theme.muted,
                  }}
                >
                  {title}
                </Label>
                {id === current && <Check size={20} color={theme.text} strokeWidth={2.2} />}
              </Pressable>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
