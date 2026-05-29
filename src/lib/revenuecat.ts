import Purchases, { LOG_LEVEL } from 'react-native-purchases';
import { Platform } from 'react-native';

const RC_API_KEY_IOS = process.env.EXPO_PUBLIC_RC_API_KEY_IOS!;
const RC_API_KEY_ANDROID = process.env.EXPO_PUBLIC_RC_API_KEY_ANDROID!;

export function initRevenueCat(userId: string) {
  Purchases.setLogLevel(LOG_LEVEL.WARN);

  if (Platform.OS === 'ios') {
    Purchases.configure({ apiKey: RC_API_KEY_IOS, appUserID: userId });
  } else {
    Purchases.configure({ apiKey: RC_API_KEY_ANDROID, appUserID: userId });
  }
}

export async function getActiveSubscription() {
  const customerInfo = await Purchases.getCustomerInfo();
  return customerInfo.activeSubscriptions.length > 0;
}
