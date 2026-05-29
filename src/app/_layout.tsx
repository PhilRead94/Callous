import { useEffect } from 'react';
import { Slot, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/auth.store';
import { useProfileStore } from '@/stores/profile.store';
import type { Profile } from '@/types/database';

export default function RootLayout() {
  const router = useRouter();
  const segments = useSegments();
  const { session, isLoading, setSession, setLoading } = useAuthStore();
  const { profile, profileLoaded, setProfile, reset } = useProfileStore();

  // Bootstrap Supabase auth listener
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (!session) reset();
    });

    return () => subscription.unsubscribe();
  }, []);

  // Route guard — runs when auth or profile state changes
  useEffect(() => {
    if (isLoading) return;

    const inAuth = segments[0] === '(auth)';

    if (!session) {
      if (!inAuth) router.replace('/(auth)/login');
      return;
    }

    if (profileLoaded) {
      // Profile already in store — route based on it
      if (!profile?.username) {
        router.replace('/(auth)/onboarding');
      } else if (inAuth) {
        router.replace('/(tabs)');
      }
      return;
    }

    // First load — fetch profile from DB
    supabase
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .maybeSingle()
      .then(({ data }) => {
        setProfile(data as Profile | null);
      });
  }, [session, isLoading, profileLoaded, profile?.username]);

  if (isLoading) return null;

  return (
    <>
      <StatusBar style="light" />
      <Slot />
    </>
  );
}
