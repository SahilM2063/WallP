export async function googleIdToken(): Promise<string> {
  const webClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
  if (!webClientId)
    throw new Error(
      'Google login needs configuration. Follow docs/GOOGLE_SETUP.md, then rebuild your development app.',
    );
  const { GoogleSignin, isSuccessResponse } =
    await import('@react-native-google-signin/google-signin');
  GoogleSignin.configure({ webClientId });
  await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
  const result = await GoogleSignin.signIn();
  if (!isSuccessResponse(result) || !result.data.idToken)
    throw new Error('Google sign-in was cancelled.');
  return result.data.idToken;
}
export async function googleSignOut() {
  const { GoogleSignin } = await import('@react-native-google-signin/google-signin');
  await GoogleSignin.signOut();
}
