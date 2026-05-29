import { Redirect } from 'expo-router';

// Root guard in _layout.tsx handles routing.
// This prevents a blank flash on first load.
export default function Index() {
  return <Redirect href="/(auth)/login" />;
}
