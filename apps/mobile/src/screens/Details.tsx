import React, { useEffect, useRef, useState } from 'react';
import { View, BackHandler, ActivityIndicator, StyleSheet } from 'react-native';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { ArrowLeft, Heart, Download, Check, FolderInput } from 'lucide-react-native';
import type { Wallpaper } from '@wallp/shared';
import { useApp } from '../state';
import { Label, IconButton, Artwork, Tap, type Rect } from '../ui';
import { SetSheet, setLabel } from '../SetSheet';
import { MoveSheet } from '../MoveSheet';
import { saveWallpaper } from '../actions';
import { fonts } from '../theme';

const TOP = 72;
const BOTTOM = 140;
const ease = Easing.bezier(0.2, 0.8, 0.2, 1);

// The artwork grows out of the card that was tapped (`origin`) and shrinks back into it on
// close; the rest of the screen fades in around it. Everything runs on the UI thread.
export function Details({
  wallpaper: w,
  origin,
  onBack,
  onError,
}: {
  wallpaper: Wallpaper;
  origin?: Rect;
  onBack: () => void;
  onError: (s: string) => void;
}) {
  const { theme, toggleLike, likedIds, user, token } = useApp();
  const liked = likedIds.includes(w.id);
  const [picking, setPicking] = useState(false);
  const [moving, setMoving] = useState(false);
  const [saving, setSaving] = useState(false);
  const [note, setNote] = useState('');
  const root = useRef<View>(null);
  const [frame, setFrame] = useState<Rect | null>(null);
  const progress = useSharedValue(0);
  const leave = useRef(onBack);
  leave.current = onBack;
  const closing = useRef(false);
  const close = () => {
    if (closing.current) return;
    closing.current = true;
    const done = () => leave.current();
    progress.value = withTiming(0, { duration: 240, easing: ease }, (finished) => {
      if (finished) runOnJS(done)();
    });
  };
  const closeRef = useRef(close);
  closeRef.current = close;
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      closeRef.current();
      return true;
    });
    return () => sub.remove();
  }, []);
  useEffect(() => {
    if (frame) progress.value = withTiming(1, { duration: 340, easing: ease });
  }, [!!frame]);

  const to = frame
    ? { x: 20, y: TOP, width: frame.width - 40, height: frame.height - TOP - BOTTOM }
    : { x: 0, y: 0, width: 0, height: 0 };
  const from =
    frame && origin
      ? { ...origin, x: origin.x - frame.x, y: origin.y - frame.y }
      : { ...to, y: to.y + 24 };
  const fades = !origin;
  const art = useAnimatedStyle(() => {
    const p = progress.value;
    return {
      left: from.x + (to.x - from.x) * p,
      top: from.y + (to.y - from.y) * p,
      width: from.width + (to.width - from.width) * p,
      height: from.height + (to.height - from.height) * p,
      borderRadius: 24 + 8 * p,
      opacity: fades ? p : 1,
    };
  });
  const backdrop = useAnimatedStyle(() => ({ opacity: progress.value }));
  const chrome = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ translateY: (1 - progress.value) * 16 }],
  }));

  const save = async () => {
    setSaving(true);
    try {
      await saveWallpaper(w);
      setNote('Saved');
    } catch (e) {
      onError((e as Error).message);
    } finally {
      setSaving(false);
    }
  };
  return (
    <View
      ref={root}
      style={StyleSheet.absoluteFill}
      onLayout={() =>
        root.current?.measureInWindow((x, y, width, height) => setFrame({ x, y, width, height }))
      }
    >
      <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: theme.bg }, backdrop]} />
      {frame && (
        <>
          <Animated.View
            style={[{ position: 'absolute', overflow: 'hidden', backgroundColor: theme.soft }, art]}
          >
            <Artwork wallpaper={w} original />
          </Animated.View>
          <Animated.View
            style={[
              {
                position: 'absolute',
                left: 20,
                right: 20,
                top: 14,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
              },
              chrome,
            ]}
          >
            <IconButton icon={ArrowLeft} label="Back" onPress={close} />
            <Label heading style={{ fontSize: 24, letterSpacing: -0.9 }}>
              wallp
            </Label>
            <IconButton
              icon={Heart}
              active={liked}
              label={liked ? 'Unlike wallpaper' : 'Like wallpaper'}
              onPress={() => void toggleLike(w.id).catch((e) => onError(e.message))}
            />
          </Animated.View>
          <Animated.View
            style={[
              {
                position: 'absolute',
                left: 20,
                right: 20,
                bottom: 0,
                height: BOTTOM,
                paddingTop: 18,
                gap: 16,
              },
              chrome,
            ]}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, height: 28 }}>
              <Label
                heading
                numberOfLines={1}
                style={{ flex: 1, fontSize: 22, letterSpacing: -0.6 }}
              >
                {w.title}
              </Label>
              {!!note && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Check size={16} color={theme.muted} strokeWidth={2.2} />
                  <Label style={{ fontSize: 15, color: theme.muted }}>{note}</Label>
                </View>
              )}
            </View>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <Tap
                accessibilityRole="button"
                accessibilityLabel="Save image"
                disabled={saving}
                dip={0.9}
                onPress={() => void save()}
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: 28,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: theme.soft,
                }}
              >
                {saving ? (
                  <ActivityIndicator color={theme.text} />
                ) : (
                  <Download size={21} color={theme.text} strokeWidth={1.9} />
                )}
              </Tap>
              {user?.isAdmin && !!token && (
                <IconButton
                  icon={FolderInput}
                  size={21}
                  label="Move to collection"
                  onPress={() => setMoving(true)}
                  style={{ width: 56, height: 56, borderRadius: 28 }}
                />
              )}
              <Tap
                accessibilityRole="button"
                dip={0.97}
                onPress={() => setPicking(true)}
                style={{
                  flex: 1,
                  height: 56,
                  borderRadius: 28,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: theme.accent,
                }}
              >
                <Label style={{ fontSize: 16, fontFamily: fonts.heading, color: theme.accentText }}>
                  {setLabel}
                </Label>
              </Tap>
            </View>
          </Animated.View>
        </>
      )}
      <SetSheet
        wallpaper={picking ? w : null}
        onClose={() => setPicking(false)}
        onDone={setNote}
        onError={onError}
      />
      <MoveSheet wallpaper={moving ? w : null} onClose={() => setMoving(false)} onError={onError} />
    </View>
  );
}
