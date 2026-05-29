import { useState } from 'react';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  SectionList,
  StyleSheet,
  Text,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/auth.store';
import { useProfileStore } from '@/stores/profile.store';
import { useActivities } from '@/hooks/useActivities';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Colors } from '@/constants/colors';
import type { ActivityWithEquipment } from '@/hooks/useActivities';

type LogState = {
  activity: ActivityWithEquipment | null;
  isCustom: boolean;
  customName: string;
  notes: string;
  photoUri: string | null;
};

const EMPTY_LOG: LogState = {
  activity: null,
  isCustom: false,
  customName: '',
  notes: '',
  photoUri: null,
};

export default function LogScreen() {
  const { session } = useAuthStore();
  const { profile, setProfile } = useProfileStore();
  const { sections, loading } = useActivities();

  const [log, setLog] = useState<LogState>(EMPTY_LOG);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const isOpen = log.activity !== null || log.isCustom;

  function openActivity(activity: ActivityWithEquipment) {
    setLog({ ...EMPTY_LOG, activity });
    setError('');
  }

  function openCustom() {
    setLog({ ...EMPTY_LOG, isCustom: true });
    setError('');
  }

  function closeSheet() {
    setLog(EMPTY_LOG);
    setError('');
  }

  async function pickPhoto() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
      allowsEditing: true,
      aspect: [4, 3],
    });
    if (!result.canceled) {
      setLog((prev) => ({ ...prev, photoUri: result.assets[0].uri }));
    }
  }

  async function uploadPhoto(uri: string, userId: string): Promise<string | null> {
    const ext = uri.split('.').pop() ?? 'jpg';
    const path = `${userId}/${Date.now()}.${ext}`;

    const response = await fetch(uri);
    const blob = await response.blob();

    const { error } = await supabase.storage
      .from('activity-photos')
      .upload(path, blob, { contentType: `image/${ext}` });

    if (error) return null;

    const { data } = supabase.storage.from('activity-photos').getPublicUrl(path);
    return data.publicUrl;
  }

  async function handleSubmit() {
    if (!session?.user.id) return;

    if (log.isCustom && !log.customName.trim()) {
      setError('Please enter an activity name.');
      return;
    }

    setSubmitting(true);
    setError('');

    let photoUrl: string | null = null;
    if (log.photoUri) {
      photoUrl = await uploadPhoto(log.photoUri, session.user.id);
    }

    const { error: insertError } = await supabase.from('activity_logs').insert({
      user_id: session.user.id,
      activity_id: log.activity?.id ?? null,
      custom_name: log.isCustom ? log.customName.trim() : null,
      notes: log.notes.trim() || null,
      photo_url: photoUrl,
      points_earned: 1,
    });

    if (insertError) {
      setError(insertError.message);
      setSubmitting(false);
      return;
    }

    // Optimistically update points in store
    if (profile) {
      setProfile({ ...profile, total_points: profile.total_points + 1 });
    }

    const activityName = log.isCustom
      ? log.customName.trim()
      : log.activity?.name ?? 'Activity';

    setSubmitting(false);
    closeSheet();
    setSuccessMessage(`${activityName} logged. Stay hard.`);
    setTimeout(() => setSuccessMessage(''), 3000);
  }

  const sheetTitle = log.isCustom
    ? 'Custom Activity'
    : log.activity?.name ?? '';

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      {/* Success toast */}
      {successMessage ? (
        <View style={styles.toast}>
          <Text style={styles.toastText}>{successMessage}</Text>
        </View>
      ) : null}

      {/* Header row */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>What did you do?</Text>
        <Pressable style={styles.customButton} onPress={openCustom}>
          <Text style={styles.customButtonText}>+ Custom</Text>
        </Pressable>
      </View>

      {loading ? (
        <ActivityIndicator color={Colors.textPrimary} style={styles.loader} />
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          stickySectionHeadersEnabled={false}
          renderSectionHeader={({ section }) => (
            <Text style={styles.sectionHeader}>{section.category.toUpperCase()}</Text>
          )}
          renderItem={({ item }) => (
            <Pressable style={styles.activityRow} onPress={() => openActivity(item)}>
              <View style={styles.activityRowInner}>
                <Text style={styles.activityName}>{item.name}</Text>
                {item.description ? (
                  <Text style={styles.activityDesc} numberOfLines={1}>
                    {item.description}
                  </Text>
                ) : null}
              </View>
              <Text style={styles.activityArrow}>›</Text>
            </Pressable>
          )}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          renderSectionFooter={() => <View style={styles.sectionFooter} />}
        />
      )}

      {/* Log sheet modal */}
      <Modal
        visible={isOpen}
        transparent
        animationType="slide"
        onRequestClose={closeSheet}
      >
        <TouchableWithoutFeedback onPress={closeSheet}>
          <View style={styles.backdrop} />
        </TouchableWithoutFeedback>

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.sheetWrapper}
          pointerEvents="box-none"
        >
          <View style={styles.sheet}>
            {/* Sheet handle */}
            <View style={styles.handle} />

            <Text style={styles.sheetTitle}>{sheetTitle}</Text>

            {log.isCustom && (
              <Input
                label="Activity name"
                value={log.customName}
                onChangeText={(v) => setLog((p) => ({ ...p, customName: v }))}
                placeholder="e.g. Ice swim, 5am wake-up"
                autoFocus
              />
            )}

            <Input
              label="Notes (optional)"
              value={log.notes}
              onChangeText={(v) => setLog((p) => ({ ...p, notes: v }))}
              placeholder="How did it go?"
              multiline
              numberOfLines={3}
              style={styles.notesInput}
            />

            {/* Photo picker */}
            <Pressable style={styles.photoRow} onPress={pickPhoto}>
              {log.photoUri ? (
                <Image source={{ uri: log.photoUri }} style={styles.photoPreview} />
              ) : (
                <View style={styles.photoPlaceholder}>
                  <Text style={styles.photoPlaceholderText}>📷  Add Photo</Text>
                </View>
              )}
            </Pressable>

            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            <Button
              title="Log It"
              onPress={handleSubmit}
              loading={submitting}
            />
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  loader: { marginTop: 60 },
  toast: {
    position: 'absolute',
    top: 16,
    left: 24,
    right: 24,
    backgroundColor: Colors.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 14,
    zIndex: 100,
    alignItems: 'center',
  },
  toastText: { color: Colors.textPrimary, fontWeight: '600', fontSize: 14 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerTitle: { color: Colors.textPrimary, fontSize: 18, fontWeight: '700' },
  customButton: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  customButtonText: { color: Colors.textPrimary, fontSize: 13, fontWeight: '600' },
  listContent: { paddingHorizontal: 20, paddingBottom: 32 },
  sectionHeader: {
    color: Colors.textMuted,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.5,
    marginTop: 24,
    marginBottom: 8,
  },
  activityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  activityRowInner: { flex: 1, gap: 2 },
  activityName: { color: Colors.textPrimary, fontSize: 15, fontWeight: '600' },
  activityDesc: { color: Colors.textSecondary, fontSize: 12 },
  activityArrow: { color: Colors.textMuted, fontSize: 22, marginLeft: 8 },
  separator: { height: 1, backgroundColor: Colors.border, marginLeft: 16 },
  sectionFooter: { marginBottom: 8 },
  // Modal
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  sheetWrapper: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderTopWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 24,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    paddingTop: 12,
    gap: 16,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: Colors.border,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 8,
  },
  sheetTitle: { color: Colors.textPrimary, fontSize: 20, fontWeight: '700' },
  notesInput: { height: 80, textAlignVertical: 'top' },
  photoRow: { alignSelf: 'stretch' },
  photoPlaceholder: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    borderStyle: 'dashed',
    paddingVertical: 16,
    alignItems: 'center',
  },
  photoPlaceholderText: { color: Colors.textSecondary, fontSize: 14 },
  photoPreview: {
    width: '100%',
    height: 160,
    borderRadius: 10,
    resizeMode: 'cover',
  },
  errorText: { color: Colors.danger, fontSize: 13, textAlign: 'center' },
});
