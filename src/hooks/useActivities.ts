import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/auth.store';
import type { Activity } from '@/types/database';

export type ActivityWithEquipment = Activity & {
  requiredEquipmentIds: string[];
};

export type ActivitySection = {
  category: string;
  data: ActivityWithEquipment[];
};

export function useActivities() {
  const { session } = useAuthStore();
  const [sections, setSections] = useState<ActivitySection[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!session) return;
    load();
  }, [session]);

  async function load() {
    setLoading(true);

    const [activitiesRes, userEquipRes, actEquipRes] = await Promise.all([
      supabase
        .from('activities')
        .select('*')
        .eq('is_active', true)
        .order('category')
        .order('name'),
      supabase
        .from('user_equipment')
        .select('equipment_id')
        .eq('user_id', session!.user.id),
      supabase.from('activity_equipment').select('activity_id, equipment_id'),
    ]);

    const userEquipIds = new Set(
      (userEquipRes.data ?? []).map((e) => e.equipment_id)
    );

    // Map activity_id → required equipment IDs
    const actEquipMap = new Map<string, string[]>();
    for (const row of actEquipRes.data ?? []) {
      if (!actEquipMap.has(row.activity_id)) actEquipMap.set(row.activity_id, []);
      actEquipMap.get(row.activity_id)!.push(row.equipment_id);
    }

    // Keep only activities where user has all required equipment
    const available = (activitiesRes.data ?? [])
      .map((a) => ({
        ...a,
        requiredEquipmentIds: actEquipMap.get(a.id) ?? [],
      }))
      .filter((a) =>
        a.requiredEquipmentIds.every((id: string) => userEquipIds.has(id))
      ) as ActivityWithEquipment[];

    // Group by category
    const grouped = new Map<string, ActivityWithEquipment[]>();
    for (const activity of available) {
      if (!grouped.has(activity.category)) grouped.set(activity.category, []);
      grouped.get(activity.category)!.push(activity);
    }

    setSections(
      Array.from(grouped.entries()).map(([category, data]) => ({ category, data }))
    );
    setLoading(false);
  }

  return { sections, loading, reload: load };
}
