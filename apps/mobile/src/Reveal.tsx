import React, { useEffect, useRef, useState } from 'react';
import { View, BackHandler, StyleSheet } from 'react-native';
import Animated, {
  Easing,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import type { Rect } from './ui';

const ease = Easing.bezier(0.2, 0.8, 0.2, 1);

// A screen that opens by growing a circle out of the button that launched it (`origin`),
// and closes by shrinking back into it. Only transforms and opacity are animated.
export function Reveal({
  origin,
  color,
  onClosed,
  children,
}: {
  origin?: Rect;
  color: string;
  onClosed: () => void;
  children: (close: () => void) => React.ReactNode;
}) {
  const root = useRef<View>(null);
  const [frame, setFrame] = useState<Rect | null>(null);
  const progress = useSharedValue(0);
  const closed = useRef(onClosed);
  closed.current = onClosed;
  const closing = useRef(false);
  const close = () => {
    if (closing.current) return;
    closing.current = true;
    const done = () => closed.current();
    progress.value = withTiming(0, { duration: 300, easing: ease }, (finished) => {
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
    if (frame) progress.value = withTiming(1, { duration: 420, easing: ease });
  }, [!!frame]);

  const size = origin?.width || 0;
  const cx = frame && origin ? origin.x - frame.x + origin.width / 2 : 0;
  const cy = frame && origin ? origin.y - frame.y + origin.height / 2 : 0;
  const reach = frame
    ? Math.hypot(Math.max(cx, frame.width - cx), Math.max(cy, frame.height - cy))
    : 0;
  const full = size ? (reach * 2) / size : 1;
  const circle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + (full - 1) * progress.value }],
  }));
  const content = useAnimatedStyle(() => ({
    opacity: size ? interpolate(progress.value, [0.45, 1], [0, 1], 'clamp') : progress.value,
  }));
  return (
    <View
      ref={root}
      style={[StyleSheet.absoluteFill, { overflow: 'hidden' }]}
      onLayout={() =>
        root.current?.measureInWindow((x, y, width, height) => setFrame({ x, y, width, height }))
      }
    >
      {frame && size > 0 && (
        <Animated.View
          style={[
            {
              position: 'absolute',
              left: cx - size / 2,
              top: cy - size / 2,
              width: size,
              height: size,
              borderRadius: size / 2,
              backgroundColor: color,
            },
            circle,
          ]}
        />
      )}
      <Animated.View
        style={[StyleSheet.absoluteFill, !size && { backgroundColor: color }, content]}
      >
        {frame && children(close)}
      </Animated.View>
    </View>
  );
}
