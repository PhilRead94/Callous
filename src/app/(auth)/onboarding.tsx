import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/auth.store';
import { useProfileStore } from '@/stores/profile.store';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Colors } from '@/constants/colors';
import type { FitnessLevel, Equipment } from '@/types/database';

const FITNESS_LEVELS: { value: FitnessLevel; label: string; description: string }[] = [
  { value: 'beginner', label: 'Beginner', description: 'New to disciplined training' },
  { value: 'intermediate', label: 'Intermediate', description: 'Consistent for 6+ months' },
  { value: 'advanced', label: 'Advanced', description: 'Highly disciplined, high output' },
];

const TOTAL_STEPS = 3;

export default function OnboardingScreen() {
  const router = useRouter();
  const { session } = useAuthStore();
  const { setProfile } = useProfileStore();

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Step 1
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');

  // Step 2
  const [fitnessLevel, setFitnessLevel] = useState<FitnessLevel>('beginner');

  // Step 3
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [selectedEquipment, setSelectedEquipment] = useState<Set<string>>(new Set());
  const [equipmentLoading, setEquipmentLoading] = useState(false);

  useEffect(() => {
    if (step === 3) fetchEquipment();
  }, [step]);

  async function fetchEquipment() {
    setEquipmentLoading(true);
    const { data } = await supabase.from('equipment').select('*').order('name');
    setEquipment((data as Equipment[]) ?? []);
    setEquipmentLoading(false);
  }

  function toggleEquipment(id: string) {
    setSelectedEquipment((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function validateStep1() {
    if (!username.trim()) {
      setError('Username is required.');
      return false;
    }
    if (username.length < 3) {
      setError('Username must be at least 3 characters.');
      return false;
    }
    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      setError('Username can only contain letters, numbers, and underscores.');
      return false;
    }

    // Check username availability
    setLoading(true);
    const { data } = await supabase
      .from('profiles')
      .select('id')
      .eq('username', username.toLowerCase().trim())
      .maybeSingle();
    setLoading(false);

    if (data && data.id !== session?.user.id) {
      setError('That username is already taken.');
      return false;
    }
    return true;
  }

  async function handleNext() {
    setError('');

    if (step === 1) {
      const valid = await validateStep1();
      if (!valid) return;
    }

    if (step < TOTAL_STEPS) {
      setStep((s) => s + 1);
      return;
    }

    // Final step — submit everything
    await handleSubmit();
  }

  async function handleSubmit() {
    if (!session?.user.id) return;
    setLoading(true);
    setError('');

    // Upsert profile
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .upsert({
        id: session.user.id,
        username: username.toLowerCase().trim(),
        bio: bio.trim() || null,
        fitness_level: fitnessLevel,
      })
      .select()
      .single();

    if (profileError) {
      setError(profileError.message);
      setLoading(false);
      return;
    }

    // Insert equipment selections (delete old ones first)
    if (selectedEquipment.size > 0) {
      await supabase.from('user_equipment').delete().eq('user_id', session.user.id);
      await supabase.from('user_equipment').insert(
        Array.from(selectedEquipment).map((equipment_id) => ({
          user_id: session.user.id,
          equipment_id,
        }))
      );
    }

    setProfile(profileData as any);
    setLoading(false);
    router.replace('/(tabs)');
  }

  const stepTitles = ['Your Profile', 'Fitness Level', 'Your Equipment'];
  const stepSubtitles = [
    'Who are you?',
    'How conditioned are you right now?',
    'What do you have access to?',
  ];

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        {/* Progress */}
        <View style={styles.progressRow}>
          {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
            <View
              key={i}
              style={[styles.progressDot, i < step ? styles.progressDotActive : undefined]}
            />
          ))}
        </View>

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.stepLabel}>Step {step} of {TOTAL_STEPS}</Text>
          <Text style={styles.title}>{stepTitles[step - 1]}</Text>
          <Text style={styles.subtitle}>{stepSubtitles[step - 1]}</Text>
        </View>

        {error ? <Text style={styles.errorBanner}>{error}</Text> : null}

        {/* Step 1: Profile */}
        {step === 1 && (
          <View style={styles.form}>
            <Input
              label="Username"
              value={username}
              onChangeText={setUsername}
              placeholder="goggins_mode"
              autoCapitalize="none"
              autoCorrect={false}
            />
            <Input
              label="Bio (optional)"
              value={bio}
              onChangeText={setBio}
              placeholder="Stay hard."
              multiline
              numberOfLines={3}
              style={styles.bioInput}
            />
          </View>
        )}

        {/* Step 2: Fitness Level */}
        {step === 2 && (
          <View style={styles.optionList}>
            {FITNESS_LEVELS.map((level) => (
              <Pressable
                key={level.value}
                style={[
                  styles.optionCard,
                  fitnessLevel === level.value && styles.optionCardSelected,
                ]}
                onPress={() => setFitnessLevel(level.value)}
              >
                <View style={styles.optionCardInner}>
                  <View
                    style={[
                      styles.radio,
                      fitnessLevel === level.value && styles.radioSelected,
                    ]}
                  />
                  <View style={styles.optionText}>
                    <Text style={styles.optionLabel}>{level.label}</Text>
                    <Text style={styles.optionDescription}>{level.description}</Text>
                  </View>
                </View>
              </Pressable>
            ))}
          </View>
        )}

        {/* Step 3: Equipment */}
        {step === 3 && (
          <View style={styles.form}>
            <Text style={styles.equipmentHint}>
              Select everything you have regular access to. This shapes your training plan and
              activity suggestions.
            </Text>
            {equipmentLoading ? (
              <ActivityIndicator color={Colors.textPrimary} style={styles.loader} />
            ) : (
              <View style={styles.equipmentGrid}>
                {equipment.map((item) => {
                  const selected = selectedEquipment.has(item.id);
                  return (
                    <Pressable
                      key={item.id}
                      style={[styles.equipmentChip, selected && styles.equipmentChipSelected]}
                      onPress={() => toggleEquipment(item.id)}
                    >
                      <Text
                        style={[
                          styles.equipmentChipText,
                          selected && styles.equipmentChipTextSelected,
                        ]}
                      >
                        {item.name}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            )}
          </View>
        )}

        {/* Navigation */}
        <View style={styles.navRow}>
          {step > 1 && (
            <Button
              title="Back"
              variant="outline"
              onPress={() => { setError(''); setStep((s) => s - 1); }}
              style={styles.backButton}
            />
          )}
          <Button
            title={step === TOTAL_STEPS ? 'Get Started' : 'Next'}
            onPress={handleNext}
            loading={loading}
            style={styles.nextButton}
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: Colors.background },
  container: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 64,
    paddingBottom: 48,
    gap: 32,
  },
  progressRow: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.border,
  },
  progressDotActive: {
    backgroundColor: Colors.textPrimary,
  },
  header: { gap: 6 },
  stepLabel: {
    color: Colors.textMuted,
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  title: {
    color: Colors.textPrimary,
    fontSize: 28,
    fontWeight: '700',
  },
  subtitle: {
    color: Colors.textSecondary,
    fontSize: 15,
  },
  errorBanner: {
    color: Colors.danger,
    fontSize: 14,
    textAlign: 'center',
    backgroundColor: '#1a0000',
    borderRadius: 8,
    padding: 12,
  },
  form: { gap: 16 },
  bioInput: { height: 80, textAlignVertical: 'top' },
  optionList: { gap: 12 },
  optionCard: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    padding: 16,
    backgroundColor: Colors.surface,
  },
  optionCardSelected: {
    borderColor: Colors.textPrimary,
    backgroundColor: Colors.surfaceElevated,
  },
  optionCardInner: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: Colors.border,
  },
  radioSelected: {
    borderColor: Colors.textPrimary,
    backgroundColor: Colors.textPrimary,
  },
  optionText: { gap: 2 },
  optionLabel: { color: Colors.textPrimary, fontSize: 16, fontWeight: '600' },
  optionDescription: { color: Colors.textSecondary, fontSize: 13 },
  equipmentHint: {
    color: Colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
  },
  loader: { marginVertical: 24 },
  equipmentGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  equipmentChip: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: Colors.surface,
  },
  equipmentChipSelected: {
    borderColor: Colors.textPrimary,
    backgroundColor: Colors.textPrimary,
  },
  equipmentChipText: {
    color: Colors.textSecondary,
    fontSize: 14,
    fontWeight: '500',
  },
  equipmentChipTextSelected: {
    color: Colors.background,
    fontWeight: '600',
  },
  navRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 'auto',
  },
  backButton: { flex: 1 },
  nextButton: { flex: 2 },
});
