import { useCallback, useEffect, useState } from 'react';
import {
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/auth.store';
import { useProfileStore } from '@/stores/profile.store';
import { getLevelForPoints } from '@/constants/levels';
import { Colors } from '@/constants/colors';

type LogEntry = {
  id: string;
  custom_name: string | null;
  notes: string | null;
  photo_url: string | null;
  points_earned: number;
  logged_at: string;
  activities: { name: string; category: string } | null;
};

function timeAgo(dateStr: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function ProfileScreen() {
  const { session } = useAuthStore();
  const { profile } = useProfileStore();
  const level = profile ? getLevelForPoints(profile.total_points) : null;

  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const fetchLogs = useCallback(async () => {
    if (!session?.user.id) return;
    const { data } = await supabase
      .from('activity_logs')
      .select('id, custom_name, notes, photo_url, points_earned, logged_at, activities(name, category)')
      .eq('user_id', session.user.id)
      .order('logged_at', { ascending: false })
      .limit(30);
    setLogs((data as unknown as LogEntry[]) ?? []);
  }, [session?.user.id]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  async function handleRefresh() {
    setRefreshing(true);
    await fetchLogs();
    setRefreshing(false);
  }

  function renderLog({ item }: { item: LogEntry }) {
    const name = item.activities?.name ?? item.custom_name ?? 'Custom';
    const category = item.activities?.category;
    return (
      <View style={styles.logRow}>
        {item.photo_url ? (
          <Image source={{ uri: item.photo_url }} style={styles.logPhoto} />
        ) : null}
        <View style={styles.logContent}>
          <View style={styles.logTopRow}>
            <Text style={styles.logName}>{name}</Text>
            {category ? <Text style={styles.logCategory}>{category}</Text> : null}
          </View>
          {item.notes ? <Text style={styles.logNotes} numberOfLines={2}>{item.notes}</Text> : null}
          <Text style={styles.logTime}>{timeAgo(item.logged_at)}</Text>
        </View>
        <Text style={styles.logPoints}>+{item.points_earned}</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <FlatList
        data={logs}
        keyExtractor={(item) => item.id}
        renderItem={renderLog}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={Colors.textPrimary}
          />
        }
        ListHeaderComponent={
          <View style={styles.profileHeader}>
            {/* Avatar */}
            <View style={styles.avatar}>
              <Text style={styles.avatarInitial}>
                {profile?.username?.charAt(0).toUpperCase() ?? '?'}
              </Text>
            </View>

            <Text style={styles.username}>@{profile?.username}</Text>
            {profile?.bio ? <Text style={styles.bio}>{profile.bio}</Text> : null}

            {/* Stats */}
            <View style={styles.statsRow}>
              <View style={styles.stat}>
                <Text style={styles.statValue}>{profile?.total_points ?? 0}</Text>
                <Text style={styles.statLabel}>Points</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.stat}>
                <Text style={styles.statValue} numberOfLines={1} adjustsFontSizeToFit>
                  {level?.name ?? '—'}
                </Text>
                <Text style={styles.statLabel}>Level</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.stat}>
                <Text style={styles.statValue}>{logs.length}</Text>
                <Text style={styles.statLabel}>Activities</Text>
              </View>
            </View>

            {logs.length > 0 && (
              <Text style={styles.sectionLabel}>RECENT ACTIVITY</Text>
            )}
          </View>
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>No activities yet.</Text>
            <Text style={styles.emptySub}>Go do something hard.</Text>
          </View>
        }
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListFooterComponent={
          <Pressable style={styles.signOutButton} onPress={() => supabase.auth.signOut()}>
            <Text style={styles.signOutText}>Sign Out</Text>
          </Pressable>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  listContent: { paddingBottom: 32 },
  profileHeader: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 8,
    gap: 10,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  avatarInitial: { color: Colors.textPrimary, fontSize: 32, fontWeight: '700' },
  username: { color: Colors.textPrimary, fontSize: 20, fontWeight: '700' },
  bio: { color: Colors.textSecondary, fontSize: 14, textAlign: 'center', lineHeight: 20 },
  statsRow: {
    flexDirection: 'row',
    marginTop: 8,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingVertical: 18,
    paddingHorizontal: 20,
    alignSelf: 'stretch',
    justifyContent: 'space-around',
  },
  stat: { alignItems: 'center', gap: 4, flex: 1 },
  statValue: { color: Colors.textPrimary, fontSize: 18, fontWeight: '700' },
  statLabel: {
    color: Colors.textSecondary,
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  statDivider: { width: 1, backgroundColor: Colors.border },
  sectionLabel: {
    alignSelf: 'flex-start',
    color: Colors.textMuted,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.5,
    marginTop: 16,
    marginBottom: 4,
  },
  // Log rows
  logRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingVertical: 14,
    gap: 12,
  },
  logPhoto: {
    width: 56,
    height: 56,
    borderRadius: 8,
    backgroundColor: Colors.surface,
  },
  logContent: { flex: 1, gap: 3 },
  logTopRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  logName: { color: Colors.textPrimary, fontSize: 15, fontWeight: '600' },
  logCategory: {
    color: Colors.textMuted,
    fontSize: 11,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  logNotes: { color: Colors.textSecondary, fontSize: 13, lineHeight: 18 },
  logTime: { color: Colors.textMuted, fontSize: 12 },
  logPoints: { color: Colors.textPrimary, fontWeight: '700', fontSize: 15 },
  separator: { height: 1, backgroundColor: Colors.border },
  empty: { alignItems: 'center', paddingTop: 48, gap: 8 },
  emptyTitle: { color: Colors.textPrimary, fontSize: 17, fontWeight: '600' },
  emptySub: { color: Colors.textSecondary, fontSize: 14 },
  signOutButton: {
    marginHorizontal: 24,
    marginTop: 32,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  signOutText: { color: Colors.textSecondary, fontSize: 15, fontWeight: '600' },
});
