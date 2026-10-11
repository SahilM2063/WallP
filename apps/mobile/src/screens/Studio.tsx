import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  ScrollView,
  TextInput,
  Pressable,
  Platform,
  BackHandler,
  useWindowDimensions,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'expo-image';
import {
  ArrowLeft,
  Upload,
  Check,
  Plus,
  CalendarDays,
  Archive,
  ImagePlus,
  X,
} from 'lucide-react-native';
import { wallpaperInput, collectionInput, featureInput, type Wallpaper } from '@wallp/shared';
import { useApp } from '../state';
import { request } from '../api';
import { Label, Button, Chip, IconButton, ArtCard, Artwork, Empty, Tap, type Rect } from '../ui';
import { Folder } from '../Folder';
import { fonts } from '../theme';

const tabs = ['Collections', 'Features', 'Catalog'] as const;
const title = (s: string) => s[0].toUpperCase() + s.slice(1);
const today = () => new Date().toISOString().slice(0, 10);
const midnight = (date: string) => `${date}T00:00:00.000Z`;
// The day a feature of this kind ends if it starts on `date`; '' while the date is incomplete.
function endOf(date: string, kind: 'day' | 'week' | 'month') {
  const d = new Date(midnight(date));
  if (Number.isNaN(d.getTime())) return '';
  if (kind === 'month') d.setUTCMonth(d.getUTCMonth() + 1);
  else d.setUTCDate(d.getUTCDate() + (kind === 'week' ? 7 : 1));
  return d.toISOString().slice(0, 10);
}

function Heading({ children }: { children: string }) {
  return (
    <Label style={{ fontSize: 15, fontFamily: fonts.medium, marginTop: 22, marginBottom: 10 }}>
      {children}
    </Label>
  );
}
function Field({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (s: string) => void;
  placeholder?: string;
}) {
  const { theme } = useApp();
  return (
    <View style={{ flex: 1 }}>
      <Heading>{label}</Heading>
      <TextInput
        accessibilityLabel={label}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={theme.muted}
        autoCapitalize="sentences"
        style={{
          minHeight: 52,
          borderRadius: 18,
          backgroundColor: theme.soft,
          paddingHorizontal: 16,
          paddingVertical: 14,
          color: theme.text,
          fontFamily: fonts.body,
          fontSize: 16,
        }}
      />
    </View>
  );
}
// Three-across grid of wallpapers to choose from; chosen ones get a ring and a tick.
function PickGrid({
  items,
  selected,
  onToggle,
}: {
  items: Wallpaper[];
  selected: string[];
  onToggle: (id: string) => void;
}) {
  const { theme } = useApp();
  const width = (Math.min(useWindowDimensions().width, 480) - 40 - 16) / 3;
  if (!items.length)
    return <Label style={{ fontSize: 15, color: theme.muted }}>No wallpapers to choose.</Label>;
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
      {items.map((w) => {
        const chosen = selected.includes(w.id);
        return (
          <Tap
            key={w.id}
            accessibilityRole="checkbox"
            accessibilityLabel={w.title}
            accessibilityState={{ checked: chosen }}
            dip={0.96}
            onPress={() => onToggle(w.id)}
            style={{
              width,
              height: width * 1.5,
              borderRadius: 18,
              overflow: 'hidden',
              backgroundColor: theme.soft,
            }}
          >
            <Artwork wallpaper={w} />
            {chosen && (
              <>
                <View
                  style={{
                    position: 'absolute',
                    inset: 0,
                    borderRadius: 18,
                    borderWidth: 3,
                    borderColor: theme.text,
                  }}
                />
                <View
                  style={{
                    position: 'absolute',
                    right: 8,
                    top: 8,
                    width: 26,
                    height: 26,
                    borderRadius: 13,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: theme.text,
                  }}
                >
                  <Check size={14} color={theme.bg} strokeWidth={2.6} />
                </View>
              </>
            )}
          </Tap>
        );
      })}
    </View>
  );
}

// The owner's workspace. Collections are folders: open one to see its wallpapers, upload a
// new one straight into it, or move existing ones in. A wallpaper lives in one collection.
export function Studio({
  onBack,
  onOpen,
  onError,
}: {
  onBack: () => void;
  onOpen: (w: Wallpaper, origin?: Rect) => void;
  onError: (s: string) => void;
}) {
  const { user, token, theme, catalog, refresh } = useApp();
  const size = (Math.min(useWindowDimensions().width, 480) - 40 - 16) / 2;
  const [tab, setTab] = useState<(typeof tabs)[number]>('Collections');
  // null: the folder grid. '': wallpapers in no collection. Otherwise a collection's id.
  const [openId, setOpenId] = useState<string | null>(null);
  const [mode, setMode] = useState<'view' | 'upload' | 'add' | 'new'>('view');
  const [busy, setBusy] = useState(false);
  const [success, setSuccess] = useState('');
  const [asset, setAsset] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [name, setName] = useState('');
  const [confirms, setConfirms] = useState(false);
  const [kind, setKind] = useState<'curated' | 'monthly'>('curated');
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [selected, setSelected] = useState<string[]>([]);
  const [featureKind, setFeatureKind] = useState<'day' | 'week' | 'month'>('day');
  const [featureId, setFeatureId] = useState('');
  const [startsOn, setStartsOn] = useState(today);
  const [endsOn, setEndsOn] = useState(() => endOf(today(), 'day'));
  const [archiving, setArchiving] = useState('');
  // One step back: out of a form, then out of a folder, then out of Studio.
  const back = () => {
    setSuccess('');
    if (mode !== 'view') setMode('view');
    else if (openId !== null) setOpenId(null);
    else onBack();
  };
  const backRef = useRef(back);
  backRef.current = back;
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      backRef.current();
      return true;
    });
    return () => sub.remove();
  }, []);
  if (!user?.isAdmin || !token)
    return (
      <Empty
        title="This Studio is private"
        description="Sign in with the owner’s verified Google account to continue."
      />
    );
  const run = async (fn: () => Promise<void>, message: string) => {
    setBusy(true);
    setSuccess('');
    try {
      await fn();
      await refresh();
      setSuccess(message);
    } catch (e) {
      // Validation errors carry a list of issues; show the first one in plain words.
      const issue = (e as { issues?: { message: string }[] }).issues?.[0]?.message;
      onError(issue || (e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const start = (next: typeof mode) => {
    setSuccess('');
    setName('');
    setAsset(null);
    setConfirms(false);
    setSelected([]);
    setMode(next);
  };
  const pick = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 1,
      });
      if (!result.canceled) {
        const a = result.assets[0];
        if (a.width < 1080 || a.height < 1920 || a.width >= a.height)
          throw new Error('Use a portrait image of at least 1080 × 1920.');
        if (a.fileSize && a.fileSize > 20 * 1024 * 1024)
          throw new Error('Maximum image size is 20 MB.');
        setAsset(a);
      }
    } catch (e) {
      onError((e as Error).message);
    }
  };
  const publish = () =>
    run(async () => {
      if (!asset) throw new Error('Choose an image first.');
      const input = wallpaperInput.parse({
        title: name,
        confirmsAbstractAndRights: confirms,
        collectionId: openId || undefined,
      });
      const form = new FormData();
      form.append('metadata', JSON.stringify(input));
      if (Platform.OS === 'web') {
        const blob = await (await fetch(asset.uri)).blob();
        form.append('image', blob, asset.fileName || 'artwork.jpg');
      } else {
        form.append('image', {
          uri: asset.uri,
          name: asset.fileName || 'artwork.jpg',
          type: asset.mimeType || 'image/jpeg',
        } as unknown as Blob);
      }
      await request('/admin/wallpapers', token, form, 'POST');
      setMode('view');
    }, 'Wallpaper published');
  const create = () =>
    run(async () => {
      const input = collectionInput.parse({
        title: name,
        kind,
        month: kind === 'monthly' ? month : undefined,
      });
      const { id } = await request<{ id: string }>('/admin/collections', token, input, 'POST');
      setMode('view');
      setOpenId(id);
    }, 'Collection created');
  const moveHere = () =>
    run(async () => {
      await request(
        '/admin/wallpapers/collection',
        token,
        { wallpaperIds: selected, collectionId: openId },
        'PUT',
      );
      setMode('view');
    }, `${selected.length} moved here`);
  const toggle = (id: string) =>
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  const collection = catalog.collections.find((c) => c.id === openId);
  const inside = (id: string) =>
    catalog.wallpapers.filter((w) => (id ? w.collectionIds.includes(id) : !w.collectionIds.length));
  const members = openId === null ? [] : inside(openId);
  const unsorted = inside('');
  const heading =
    mode === 'new'
      ? 'New collection'
      : mode === 'upload'
        ? 'Upload'
        : mode === 'add'
          ? 'Add wallpapers'
          : openId === null
            ? 'Studio'
            : collection?.title || 'Unsorted';
  return (
    <ScrollView
      contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      <View style={{ paddingTop: 14 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <IconButton icon={ArrowLeft} label="Back" onPress={back} />
          {/* Deeper in, back only goes up a level; this leaves Studio in one tap. */}
          {(openId !== null || mode !== 'view') && (
            <IconButton icon={X} label="Close Studio" onPress={onBack} />
          )}
        </View>
        <Label
          heading
          numberOfLines={1}
          style={{ fontSize: 32, letterSpacing: -1.2, marginTop: 20 }}
        >
          {heading}
        </Label>
        {openId !== null && mode !== 'view' && (
          <Label numberOfLines={1} style={{ fontSize: 15, color: theme.muted, marginTop: 4 }}>
            to {collection?.title}
          </Label>
        )}
        {openId !== null && mode === 'view' && (
          <Label style={{ fontSize: 15, color: theme.muted, marginTop: 4 }}>
            {members.length} wallpapers
          </Label>
        )}
      </View>
      {openId === null && mode === 'view' && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ marginHorizontal: -20, marginTop: 16 }}
          contentContainerStyle={{ gap: 8, paddingHorizontal: 20 }}
        >
          {tabs.map((t) => (
            <Chip
              label={t}
              active={tab === t}
              key={t}
              onPress={() => {
                setTab(t);
                setSuccess('');
                setArchiving('');
              }}
            />
          ))}
        </ScrollView>
      )}
      {!!success && (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 10,
            height: 48,
            paddingHorizontal: 16,
            borderRadius: 24,
            backgroundColor: theme.soft,
            marginTop: 16,
          }}
        >
          <Check size={18} color={theme.text} strokeWidth={2.2} />
          <Label style={{ fontSize: 15, fontFamily: fonts.medium }}>{success}</Label>
        </View>
      )}

      {/* Collections: the folder grid */}
      {tab === 'Collections' && openId === null && mode === 'view' && (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 16, marginTop: 24 }}>
          {[
            ...catalog.collections.map((c) => ({ id: c.id, title: c.title })),
            ...(unsorted.length ? [{ id: '', title: 'Unsorted' }] : []),
          ].map((c) => {
            const items = inside(c.id);
            return (
              <Tap
                key={c.id || 'unsorted'}
                accessibilityRole="button"
                accessibilityLabel={`Open ${c.title}, ${items.length} wallpapers`}
                dip={0.97}
                onPress={() => {
                  setSuccess('');
                  setOpenId(c.id);
                }}
                style={{ width: size, marginBottom: 8 }}
              >
                <Folder wallpapers={items} size={size} />
                <View
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'center',
                    alignItems: 'baseline',
                    gap: 6,
                    marginTop: 10,
                  }}
                >
                  <Label
                    numberOfLines={1}
                    style={{ flexShrink: 1, fontSize: 16, fontFamily: fonts.heading }}
                  >
                    {c.title}
                  </Label>
                  <Label style={{ fontSize: 14, color: theme.muted }}>{items.length}</Label>
                </View>
              </Tap>
            );
          })}
          <Tap
            accessibilityRole="button"
            accessibilityLabel="New collection"
            dip={0.97}
            onPress={() => start('new')}
            style={{ width: size, marginBottom: 8 }}
          >
            <View
              style={{
                width: size,
                height: size,
                borderRadius: 24,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: theme.soft,
              }}
            >
              <View
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: 26,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: theme.surface,
                }}
              >
                <Plus size={22} color={theme.text} strokeWidth={1.9} />
              </View>
            </View>
            <Label
              style={{
                fontSize: 16,
                fontFamily: fonts.heading,
                textAlign: 'center',
                marginTop: 10,
              }}
            >
              New
            </Label>
          </Tap>
        </View>
      )}
      {mode === 'new' && (
        <>
          <Field label="Title" value={name} onChange={setName} />
          <Heading>Type</Heading>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {(['curated', 'monthly'] as const).map((k) => (
              <Chip label={title(k)} active={kind === k} onPress={() => setKind(k)} key={k} />
            ))}
          </View>
          {kind === 'monthly' && (
            <Field label="Month" value={month} onChange={setMonth} placeholder="2026-10" />
          )}
          <View style={{ marginTop: 24 }}>
            <Button title="Create" icon={Plus} busy={busy} onPress={() => void create()} />
          </View>
        </>
      )}

      {/* Inside a folder */}
      {openId !== null && mode === 'view' && (
        <>
          {!!openId && (
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 20 }}>
              <View style={{ flex: 1 }}>
                <Button title="Upload" icon={Upload} onPress={() => start('upload')} />
              </View>
              <View style={{ flex: 1 }}>
                <Button secondary title="Add existing" icon={Plus} onPress={() => start('add')} />
              </View>
            </View>
          )}
          {members.length ? (
            <View style={{ flexDirection: 'row', gap: 12, marginTop: 20 }}>
              {[0, 1].map((col) => (
                <View key={col} style={{ flex: 1 }}>
                  {members
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
            <Empty
              title="Nothing in here yet"
              description="Upload a wallpaper or add existing ones."
            />
          )}
        </>
      )}
      {mode === 'upload' && (
        <>
          <Tap
            accessibilityRole="button"
            accessibilityLabel={asset ? 'Change image' : 'Choose image'}
            dip={0.98}
            onPress={() => void pick()}
            style={{
              alignSelf: 'center',
              width: 200,
              height: 340,
              marginTop: 24,
              borderRadius: 32,
              overflow: 'hidden',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: theme.soft,
              gap: 12,
            }}
          >
            {asset ? (
              <>
                <Image
                  source={{ uri: asset.uri }}
                  style={{ position: 'absolute', width: '100%', height: '100%' }}
                  contentFit="cover"
                />
                <View
                  style={{
                    position: 'absolute',
                    bottom: 12,
                    height: 36,
                    paddingHorizontal: 16,
                    borderRadius: 18,
                    justifyContent: 'center',
                    backgroundColor: '#FFFFFF',
                  }}
                >
                  <Label style={{ fontSize: 14, fontFamily: fonts.heading, color: '#0B0B0C' }}>
                    Change
                  </Label>
                </View>
              </>
            ) : (
              <>
                <View
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: 28,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: theme.surface,
                  }}
                >
                  <ImagePlus size={24} color={theme.text} strokeWidth={1.9} />
                </View>
                <Label style={{ fontSize: 16, fontFamily: fonts.heading }}>Choose image</Label>
                <Label
                  style={{
                    fontSize: 13,
                    lineHeight: 18,
                    color: theme.muted,
                    textAlign: 'center',
                    paddingHorizontal: 20,
                  }}
                >
                  Portrait, 1080 × 1920 or larger, up to 20 MB
                </Label>
              </>
            )}
          </Tap>
          <Field label="Title" value={name} onChange={setName} />
          <Pressable
            accessibilityRole="checkbox"
            accessibilityState={{ checked: confirms }}
            onPress={() => setConfirms(!confirms)}
            style={{ flexDirection: 'row', gap: 12, marginTop: 24, marginBottom: 20 }}
          >
            <View
              style={{
                width: 26,
                height: 26,
                borderRadius: 13,
                backgroundColor: confirms ? theme.accent : theme.soft,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {confirms && <Check size={15} color={theme.accentText} strokeWidth={2.6} />}
            </View>
            <Label style={{ fontSize: 14, lineHeight: 20, color: theme.muted, flex: 1 }}>
              This is original abstract art, I have the rights to publish it, and it shows no
              prohibited subjects.
            </Label>
          </Pressable>
          <Button title="Publish" icon={Upload} busy={busy} onPress={() => void publish()} />
        </>
      )}
      {mode === 'add' && (
        <>
          <Label style={{ fontSize: 14, lineHeight: 20, color: theme.muted, marginTop: 16 }}>
            A wallpaper lives in one collection, so the ones you pick leave where they are now.
          </Label>
          <View style={{ marginTop: 16 }}>
            <PickGrid
              items={catalog.wallpapers.filter((w) => !w.collectionIds.includes(openId || ''))}
              selected={selected}
              onToggle={toggle}
            />
          </View>
          {selected.length > 0 && (
            <View style={{ marginTop: 20 }}>
              <Button
                title={`Move ${selected.length} here`}
                busy={busy}
                onPress={() => void moveHere()}
              />
            </View>
          )}
        </>
      )}

      {tab === 'Features' && openId === null && mode === 'view' && (
        <>
          <Heading>Featured for</Heading>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {(['day', 'week', 'month'] as const).map((k) => (
              <Chip
                label={title(k)}
                active={featureKind === k}
                onPress={() => {
                  setFeatureKind(k);
                  setEndsOn(endOf(startsOn, k) || endsOn);
                }}
                key={k}
              />
            ))}
          </View>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <Field
              label="Starts"
              value={startsOn}
              onChange={(date) => {
                setStartsOn(date);
                setEndsOn(endOf(date, featureKind) || endsOn);
              }}
              placeholder="2026-10-11"
            />
            <Field label="Ends" value={endsOn} onChange={setEndsOn} placeholder="2026-10-12" />
          </View>
          <Label style={{ fontSize: 13, color: theme.muted, marginTop: 8 }}>
            Dates are in UTC and start at midnight.
          </Label>
          <Heading>Wallpaper</Heading>
          <PickGrid
            items={catalog.wallpapers}
            selected={featureId ? [featureId] : []}
            onToggle={(id) => setFeatureId(id === featureId ? '' : id)}
          />
          <View style={{ marginTop: 20 }}>
            <Button
              title="Schedule"
              icon={CalendarDays}
              busy={busy}
              onPress={() =>
                void run(async () => {
                  if (!featureId) throw new Error('Choose a wallpaper to feature.');
                  await request(
                    '/admin/features',
                    token,
                    featureInput.parse({
                      kind: featureKind,
                      wallpaperId: featureId,
                      startsAt: midnight(startsOn),
                      endsAt: midnight(endsOn),
                    }),
                    'POST',
                  );
                }, 'Feature scheduled')
              }
            />
          </View>
        </>
      )}
      {tab === 'Catalog' && openId === null && mode === 'view' && (
        <View style={{ marginTop: 12 }}>
          {!catalog.wallpapers.length && (
            <Empty title="Nothing published yet" description="Upload a wallpaper to see it here." />
          )}
          {catalog.wallpapers.map((w, i) => (
            <View
              key={w.id}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 14,
                paddingVertical: 12,
                borderTopWidth: i ? 1 : 0,
                borderColor: theme.border,
              }}
            >
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`View ${w.title}`}
                onPress={() => onOpen(w)}
                style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 14 }}
              >
                <View
                  style={{
                    width: 46,
                    height: 68,
                    borderRadius: 12,
                    overflow: 'hidden',
                    backgroundColor: theme.soft,
                  }}
                >
                  <Artwork wallpaper={w} />
                </View>
                <View style={{ flex: 1 }}>
                  <Label numberOfLines={1} style={{ fontSize: 16, fontFamily: fonts.medium }}>
                    {w.title}
                  </Label>
                  <Label
                    numberOfLines={1}
                    style={{ fontSize: 14, color: theme.muted, marginTop: 2 }}
                  >
                    {catalog.collections.find((c) => w.collectionIds.includes(c.id))?.title ||
                      'Unsorted'}
                    {'  ·  '}
                    {w.likes} likes
                  </Label>
                </View>
              </Pressable>
              {archiving === w.id ? (
                <Tap
                  accessibilityRole="button"
                  accessibilityLabel={`Confirm archiving ${w.title}`}
                  disabled={busy}
                  onPress={() =>
                    void run(async () => {
                      await request(
                        `/admin/wallpapers/${w.id}`,
                        token,
                        { status: 'archived' },
                        'PATCH',
                      );
                      setArchiving('');
                    }, 'Wallpaper archived')
                  }
                  style={{
                    height: 44,
                    paddingHorizontal: 18,
                    borderRadius: 22,
                    justifyContent: 'center',
                    backgroundColor: theme.accent,
                    opacity: busy ? 0.6 : 1,
                  }}
                >
                  <Label
                    style={{ fontSize: 14, fontFamily: fonts.heading, color: theme.accentText }}
                  >
                    Archive
                  </Label>
                </Tap>
              ) : (
                <IconButton
                  icon={Archive}
                  label={`Archive ${w.title}`}
                  onPress={() => setArchiving(w.id)}
                />
              )}
            </View>
          ))}
          {catalog.wallpapers.length > 0 && (
            <Label style={{ fontSize: 13, lineHeight: 18, color: theme.muted, marginTop: 16 }}>
              Archiving hides a wallpaper everywhere in the app. The original file is kept.
            </Label>
          )}
        </View>
      )}
    </ScrollView>
  );
}
