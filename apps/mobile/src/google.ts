export async function googleIdToken(): Promise<string> {
  throw new Error(
    'Google sign-in is available in the Android development build. See docs/GOOGLE_SETUP.md.',
  );
}
export async function googleSignOut(): Promise<void> {}
