import React, { useRef } from 'react';
import {
  Text,
  View,
  Pressable,
  Animated,
  Platform,
  ActivityIndicator,
  type TextProps,
  type ViewStyle,
  type StyleProp,
  type PressableProps,
} from 'react-native';
import { Image, type ImageStyle } from 'expo-image';
import { Heart, type LucideIcon } from 'lucide-react-native';
import type { Wallpaper } from '@wallp/shared';
import { useApp } from './state';
import { fonts } from './theme';
import { artSource } from './demo';

export type Rect = { x: number; y: number; width: number; height: number };

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
// Pressable that dips slightly while held.
export function Tap({
  style,
  children,
  dip = 0.95,
  onPressIn,
  onPressOut,
  ...props
}: Omit<PressableProps, 'style' | 'children'> & {
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
  dip?: number;
}) {
  const scale = useRef(new Animated.Value(1)).current;
  const to = (toValue: number) =>
    Animated.spring(scale, {
      toValue,
      speed: 40,
      bounciness: 4,
      useNativeDriver: Platform.OS !== 'web',
    }).start();
  return (
    <AnimatedPressable
      {...props}
      onPressIn={(e) => {
        to(dip);
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        to(1);
        onPressOut?.(e);
      }}
      style={[style, { transform: [{ scale }] }]}
    >
      {children}
    </AnimatedPressable>
  );
}
// Measures where a view sits on screen, so the next screen can grow out of it.
export function openFrom(view: View | null, open: (origin?: Rect) => void) {
  if (!view) return open();
  view.measureInWindow((x, y, width, height) =>
    open(width && height ? { x, y, width, height } : undefined),
  );
}
export function Label({ children, style, heading, ...props }: TextProps & { heading?: boolean }) {
  const { theme } = useApp();
  return (
    <Text
      {...props}
      style={[{ fontFamily: heading ? fonts.heading : fonts.body, color: theme.text }, style]}
    >
      {children}
    </Text>
  );
}
export function IconButton({
  icon: Icon,
  onPress,
  label,
  active = false,
  size = 20,
  onArt = false,
  style,
}: {
  icon: LucideIcon;
  onPress: () => void;
  label: string;
  active?: boolean;
  size?: number;
  onArt?: boolean;
  style?: ViewStyle;
}) {
  const { theme } = useApp();
  const color = onArt ? '#FFFFFF' : theme.text;
  return (
    <Tap
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: active }}
      onPress={onPress}
      hitSlop={6}
      dip={0.9}
      style={{
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: onArt ? 'rgba(0,0,0,0.28)' : theme.soft,
        ...style,
      }}
    >
      <Icon size={size} color={color} fill={active ? color : 'transparent'} strokeWidth={1.9} />
    </Tap>
  );
}
export function Chip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  const { theme } = useApp();
  return (
    <Tap
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={{
        height: 38,
        paddingHorizontal: 16,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 19,
        backgroundColor: active ? theme.accent : theme.soft,
      }}
    >
      <Label
        style={{
          fontSize: 14,
          fontFamily: fonts.medium,
          color: active ? theme.accentText : theme.text,
        }}
      >
        {label}
      </Label>
    </Tap>
  );
}
export function Button({
  title,
  onPress,
  icon: Icon,
  busy = false,
  secondary = false,
}: {
  title: string;
  onPress: () => void;
  icon?: LucideIcon;
  busy?: boolean;
  secondary?: boolean;
}) {
  const { theme } = useApp();
  const color = secondary ? theme.text : theme.accentText;
  return (
    <Tap
      disabled={busy}
      accessibilityRole="button"
      onPress={onPress}
      dip={0.97}
      style={{
        minHeight: 52,
        borderRadius: 26,
        backgroundColor: secondary ? theme.soft : theme.accent,
        paddingHorizontal: 22,
        flexDirection: 'row',
        gap: 9,
        alignItems: 'center',
        justifyContent: 'center',
        opacity: busy ? 0.6 : 1,
      }}
    >
      {busy ? (
        <ActivityIndicator color={color} />
      ) : (
        <>
          {Icon && <Icon size={19} color={color} strokeWidth={1.9} />}
          <Label style={{ fontFamily: fonts.heading, fontSize: 16, color }}>{title}</Label>
        </>
      )}
    </Tap>
  );
}
export function Artwork({
  wallpaper,
  style,
  original = false,
  blurRadius,
}: {
  wallpaper: Wallpaper;
  style?: ImageStyle;
  original?: boolean;
  blurRadius?: number;
}) {
  return (
    <Image
      source={artSource(wallpaper, original)}
      style={[{ width: '100%', height: '100%' }, style]}
      contentFit="cover"
      transition={180}
      blurRadius={blurRadius}
      accessibilityLabel={wallpaper.title}
    />
  );
}
const compact = (n: number) =>
  n < 1000 ? String(n) : `${(n / 1000).toFixed(n < 10000 ? 1 : 0).replace(/\.0$/, '')}k`;
export function ArtCard({
  wallpaper,
  height,
  onOpen,
}: {
  wallpaper: Wallpaper;
  height: number;
  onOpen: (origin?: Rect) => void;
}) {
  const { theme, likedIds, demo } = useApp();
  const liked = likedIds.includes(wallpaper.id);
  // The bundled preview catalog has fixed counts, so a local like is added on top.
  const likes = wallpaper.likes + (demo && liked ? 1 : 0);
  const frame = useRef<View>(null);
  return (
    <View ref={frame} collapsable={false} style={{ height, marginBottom: 12 }}>
      <Tap
        accessibilityRole="button"
        accessibilityLabel={`View ${wallpaper.title}, ${likes} likes`}
        onPress={() => openFrom(frame.current, onOpen)}
        dip={0.97}
        style={{ flex: 1, borderRadius: 24, overflow: 'hidden', backgroundColor: theme.soft }}
      >
        <Artwork wallpaper={wallpaper} />
        <View
          style={{
            position: 'absolute',
            left: 10,
            bottom: 10,
            height: 26,
            paddingHorizontal: 9,
            borderRadius: 13,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 5,
            backgroundColor: 'rgba(0,0,0,0.28)',
          }}
        >
          <Heart
            size={12}
            color="#FFFFFF"
            fill={liked ? '#FFFFFF' : 'transparent'}
            strokeWidth={2.2}
          />
          <Label style={{ fontSize: 12, fontFamily: fonts.medium, color: '#FFFFFF' }}>
            {compact(likes)}
          </Label>
        </View>
      </Tap>
    </View>
  );
}
// Up to three wallpapers fanned out like a hand of cards.
export function Fan({ wallpapers, height = 190 }: { wallpapers: Wallpaper[]; height?: number }) {
  const { theme } = useApp();
  const w = height * 0.66;
  const spots = [
    { left: 0, top: height * 0.08, rotate: '-9deg' },
    { left: w * 0.72, top: height * 0.1, rotate: '8deg' },
    { left: w * 0.36, top: height * 0.2, rotate: '-2deg' },
  ];
  return (
    <View style={{ width: w * 1.72, height: height * 1.2 }}>
      {wallpapers.slice(0, 3).map((item, i) => (
        <View
          key={item.id}
          style={{
            position: 'absolute',
            left: spots[i].left,
            top: spots[i].top,
            width: w,
            height,
            borderRadius: 22,
            borderWidth: 3,
            borderColor: theme.surface,
            backgroundColor: theme.soft,
            overflow: 'hidden',
            transform: [{ rotate: spots[i].rotate }],
            boxShadow: '0 12px 28px rgba(0,0,0,0.14)',
          }}
        >
          <Artwork wallpaper={item} />
        </View>
      ))}
    </View>
  );
}
export function Empty({ title, description }: { title: string; description: string }) {
  const { theme } = useApp();
  return (
    <View style={{ paddingVertical: 48, paddingHorizontal: 32, alignItems: 'center', gap: 6 }}>
      <Label heading style={{ fontSize: 20, letterSpacing: -0.4, textAlign: 'center' }}>
        {title}
      </Label>
      <Label style={{ color: theme.muted, textAlign: 'center', fontSize: 15, lineHeight: 21 }}>
        {description}
      </Label>
    </View>
  );
}
