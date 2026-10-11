import { z } from 'zod';

export const moodSchema = z.enum(['dark', 'light', 'colorful']);
export type Mood = z.infer<typeof moodSchema>;
export interface Wallpaper {
  id: string;
  title: string;
  mood: Mood;
  palette: string[];
  width: number;
  height: number;
  imageUrl: string;
  thumbnailUrl: string;
  likes: number;
  createdAt: string;
  collectionIds: string[];
  demoArt?: number;
}
export interface Collection {
  id: string;
  title: string;
  kind: 'curated' | 'monthly';
  month: string | null;
  coverId: string | null;
  count: number;
}
export interface User {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  isAdmin: boolean;
}
export interface Catalog {
  wallpapers: Wallpaper[];
  collections: Collection[];
  features: Partial<Record<'day' | 'week' | 'month', string>>;
  nextCursor: string | null;
}
// Mood and palette are read from the image by the server, so they are not inputs.
export const wallpaperInput = z.object({
  title: z.string().trim().min(2).max(80),
  collectionId: z.string().uuid().optional(),
  confirmsAbstractAndRights: z.literal(true),
});
export const collectionInput = z
  .object({
    title: z.string().trim().min(2).max(80),
    kind: z.enum(['curated', 'monthly']),
    month: z
      .string()
      .regex(/^\d{4}-(0[1-9]|1[0-2])$/)
      .optional(),
    coverId: z.string().uuid().optional(),
    wallpaperIds: z
      .array(z.string().uuid())
      .max(200)
      .refine((ids) => new Set(ids).size === ids.length, 'Duplicate artwork IDs.')
      .optional(),
  })
  .refine((v) => v.kind !== 'monthly' || !!v.month, {
    message: 'Monthly collections need YYYY-MM.',
    path: ['month'],
  });
export const featureInput = z
  .object({
    kind: z.enum(['day', 'week', 'month']),
    wallpaperId: z.string().uuid(),
    startsAt: z.string().datetime(),
    endsAt: z.string().datetime(),
  })
  .refine((v) => Date.parse(v.endsAt) > Date.parse(v.startsAt), {
    message: 'End must follow start.',
    path: ['endsAt'],
  });
