import { create } from 'zustand';
import { Profile, Subscription } from '../types/database';

interface ProfileState {
  profile: Profile | null;
  profileLoaded: boolean; // false = not yet fetched from DB
  subscription: Subscription | null;
  isPremium: boolean;
  setProfile: (profile: Profile | null) => void;
  setSubscription: (subscription: Subscription | null) => void;
  reset: () => void;
}

export const useProfileStore = create<ProfileState>((set) => ({
  profile: null,
  profileLoaded: false,
  subscription: null,
  isPremium: false,
  setProfile: (profile) => set({ profile, profileLoaded: true }),
  setSubscription: (subscription) =>
    set({
      subscription,
      isPremium: subscription?.status === 'active',
    }),
  reset: () => set({ profile: null, profileLoaded: false, subscription: null, isPremium: false }),
}));
