import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, PanResponder } from 'react-native';
import Animated, {
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { LiquidGlassView } from 'react-native-liquid-glassmorphism';
import type { LucideIcon } from 'lucide-react-native';
import { useApp } from './state';

const TAB = 60;
const GAP = 2;
const PAD = 5;
const STEP = TAB + GAP;
const follow = { damping: 26, stiffness: 420, mass: 0.6 };
// Slower than `follow`, so a tap shows the drop travelling to the tab instead of snapping.
const glide = { damping: 18, stiffness: 150, mass: 0.9 };
// Loose springs: they overshoot and ring, which is what makes the drop read as jelly.
const jelly = { damping: 9, stiffness: 170, mass: 0.9 };
const bounce = { damping: 11, stiffness: 230, mass: 0.9 };

function TabIcon({
  icon: Icon,
  at,
  x,
  lift,
  color,
  strokeWidth,
}: {
  icon: LucideIcon;
  at: number;
  x: SharedValue<number>;
  lift: SharedValue<number>;
  color: string;
  strokeWidth: number;
}) {
  // Icons swell as the drop passes over them.
  const style = useAnimatedStyle(() => {
    const near = Math.max(0, 1 - Math.abs(x.value - at) / STEP);
    return { transform: [{ scale: 1 + 0.18 * lift.value * near }] };
  });
  return (
    <Animated.View style={style}>
      <Icon size={22} color={color} strokeWidth={strokeWidth} />
    </Animated.View>
  );
}

// Floating tab bar: a plain white pill whose selection is a drop of liquid glass. Tap or
// drag it. While a finger is down the drop lifts out of the bar and follows it, stretching
// in the direction of travel; on release it wobbles to rest on the nearest tab.
export function TabBar<T extends string>({
  tabs,
  tab,
  onChange,
}: {
  tabs: { name: T; icon: LucideIcon }[];
  tab: T;
  onChange: (name: T) => void;
}) {
  const { theme, dark } = useApp();
  const index = tabs.findIndex((t) => t.name === tab);
  const max = (tabs.length - 1) * STEP;
  const x = useSharedValue(index * STEP);
  const tail = useSharedValue(index * STEP);
  const lift = useSharedValue(0);
  // The glass re-captures what is behind it every frame, so it only exists while in use.
  const [live, setLive] = useState(false);
  const rest = useRef<ReturnType<typeof setTimeout> | null>(null);
  const bar = useRef<View>(null);
  const left = useRef(0);
  const latest = useRef({ tabs, onChange, index });
  latest.current = { tabs, onChange, index };
  useEffect(() => {
    x.value = withSpring(index * STEP, follow);
  }, [index]);
  useEffect(() => () => void (rest.current && clearTimeout(rest.current)), []);
  // The tail chases the head on a loose spring; the gap between them is the stretch.
  useAnimatedReaction(
    () => x.value,
    (head) => {
      tail.value = withSpring(head, jelly);
    },
  );

  const responder = useMemo(() => {
    const at = (pageX: number) => Math.min(max, Math.max(0, pageX - left.current - PAD - TAB / 2));
    const drop = (pageX: number | null) => {
      const { tabs: all, onChange: change, index: current } = latest.current;
      const next = pageX === null ? current : Math.round(at(pageX) / STEP);
      // Stay popped out for a beat, so a quick tap reads the same as a drag.
      lift.value = withSequence(
        withTiming(1, { duration: 120 }),
        withDelay(260, withSpring(0, bounce)),
      );
      x.value = withSpring(next * STEP, glide);
      rest.current = setTimeout(() => setLive(false), 1500);
      if (next !== current) change(all[next].name);
    };
    return PanResponder.create({
      onStartShouldSetPanResponderCapture: () => true,
      onMoveShouldSetPanResponderCapture: () => true,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: (e) => {
        const pageX = e.nativeEvent.pageX;
        if (rest.current) clearTimeout(rest.current);
        setLive(true);
        bar.current?.measureInWindow((barX) => {
          left.current = barX;
          x.value = withSpring(at(pageX), glide);
        });
        lift.value = withSpring(1, bounce);
      },
      onPanResponderMove: (e) => {
        x.value = withSpring(at(e.nativeEvent.pageX), follow);
      },
      onPanResponderRelease: (e) => drop(e.nativeEvent.pageX),
      onPanResponderTerminate: () => drop(null),
    });
  }, [max]);

  const drop = useAnimatedStyle(() => {
    const stretch = Math.min(0.5, Math.abs(x.value - tail.value) / TAB);
    const width = TAB * (1 + 0.18 * lift.value + stretch);
    const height = 48 * (1 + 0.34 * lift.value - stretch * 0.45);
    // Real size and position rather than a scale transform: the glass samples the backdrop
    // from its own bounds, so a scaled view would show what is behind it off-centre.
    return {
      left: PAD + (x.value + tail.value) / 2 + (TAB - width) / 2,
      top: PAD + (48 - height) / 2,
      width,
      height,
    };
  });
  const resting = useAnimatedStyle(() => ({ opacity: 1 - Math.min(1, lift.value) }));
  const lifted = useAnimatedStyle(() => ({ opacity: Math.min(1, Math.max(0, lift.value)) }));
  return (
    <View ref={bar} collapsable={false} {...responder.panHandlers}>
      <View
        style={{
          flexDirection: 'row',
          padding: PAD,
          gap: GAP,
          borderRadius: 29,
          backgroundColor: dark ? '#1C1C1E' : '#FFFFFF',
          boxShadow: dark
            ? '0 10px 30px rgba(0,0,0,0.5), 0 0 0 0.5px rgba(255,255,255,0.12)'
            : '0 10px 30px rgba(0,0,0,0.12), 0 0 0 0.5px rgba(0,0,0,0.06)',
        }}
      >
        {tabs.map(({ name, icon }, i) => (
          <View
            key={name}
            accessible
            accessibilityRole="tab"
            accessibilityState={{ selected: name === tab }}
            accessibilityLabel={name}
            accessibilityActions={[{ name: 'activate' }]}
            onAccessibilityAction={() => onChange(name)}
            style={{ height: 48, width: TAB, alignItems: 'center', justifyContent: 'center' }}
          >
            <TabIcon
              icon={icon}
              at={i * STEP}
              x={x}
              lift={lift}
              color={tab === name ? theme.text : theme.muted}
              strokeWidth={tab === name ? 2.2 : 1.9}
            />
          </View>
        ))}
      </View>
      {/* The drop sits over the bar, not inside it, so it can grow past the bar's edge and
          the glass has the icons behind it to refract. */}
      <Animated.View pointerEvents="none" style={[{ position: 'absolute' }, drop]}>
        <Animated.View
          style={[
            { position: 'absolute', inset: 0, borderRadius: 40, backgroundColor: theme.press },
            resting,
          ]}
        />
        {live && (
          <Animated.View
            style={[
              {
                position: 'absolute',
                inset: 0,
                borderRadius: 40,
                boxShadow: '0 8px 20px rgba(0,0,0,0.18)',
              },
              lifted,
            ]}
          >
            <LiquidGlassView
              variant="clear"
              borderRadius={40}
              blurRadius={0}
              thickness={0.3}
              refraction={false}
              edgeReflectionStrength={0}
              magnification={1}
              iridescence={0}
              specularSharpness={2}
              style={{ flex: 1 }}
            />
          </Animated.View>
        )}
      </Animated.View>
    </View>
  );
}
