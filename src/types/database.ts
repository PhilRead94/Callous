export type FitnessLevel = 'beginner' | 'intermediate' | 'advanced';
export type SubscriptionStatus = 'active' | 'expired' | 'trial';
export type SubscriptionPlan = 'monthly' | 'annual';

export interface Profile {
  id: string;
  username: string;
  bio: string | null;
  avatar_url: string | null;
  fitness_level: FitnessLevel;
  total_points: number;
  created_at: string;
}

export interface Equipment {
  id: string;
  name: string;
}

export interface Activity {
  id: string;
  name: string;
  description: string | null;
  category: string;
  points: number;
  is_active: boolean;
}

export interface ActivityLog {
  id: string;
  user_id: string;
  activity_id: string | null;
  custom_name: string | null;
  notes: string | null;
  photo_url: string | null;
  points_earned: number;
  logged_at: string;
}

export interface ActivityLogWithProfile extends ActivityLog {
  profiles: Pick<Profile, 'id' | 'username' | 'avatar_url'>;
  activities: Pick<Activity, 'name' | 'category'> | null;
}

export interface Follow {
  follower_id: string;
  following_id: string;
  created_at: string;
}

export interface TrainingPlan {
  id: string;
  user_id: string;
  week_start: string;
  plan_data: TrainingPlanDay[];
  created_at: string;
}

export interface TrainingPlanDay {
  day: number; // 0 = Monday, 6 = Sunday
  activities: string[]; // activity names or descriptions
  rest: boolean;
}

export interface Subscription {
  user_id: string;
  status: SubscriptionStatus;
  plan: SubscriptionPlan | null;
  expires_at: string | null;
  rc_customer_id: string | null;
}
