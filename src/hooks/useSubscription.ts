import { useState, useEffect } from 'react';
import { SubscriptionState } from '../types';
import { getSubscriptionState, saveSubscriptionState } from '../services/subscriptionService';

const SAFE_FREE_SUBSCRIPTION: SubscriptionState = {
  isSubscribed: false,
  planId: 'pro_monthly',
  planName: 'Plano Gratuito Atleta AI',
  priceBrl: 0,
  status: 'expired',
  billingCycle: 'monthly',
  renewsAt: '',
};

export function useSubscription(userId?: string) {
  // Client state is presentation/cache only. Premium entitlement is server-authoritative.
  const [subscription, setSubscription] = useState<SubscriptionState>(SAFE_FREE_SUBSCRIPTION);

  useEffect(() => {
    let active = true;

    if (!userId) {
      setSubscription(SAFE_FREE_SUBSCRIPTION);
      return () => {
        active = false;
      };
    }

    setSubscription(SAFE_FREE_SUBSCRIPTION);
    getSubscriptionState(userId)
      .then((remoteSub) => {
        if (active) setSubscription(remoteSub);
      })
      .catch(() => {
        if (active) setSubscription(SAFE_FREE_SUBSCRIPTION);
      });

    return () => {
      active = false;
    };
  }, [userId]);

  const handleSubscriptionUpdate = async (updatedState: SubscriptionState) => {
    // This only updates local UI cache. It never grants server entitlements.
    setSubscription(updatedState);
    await saveSubscriptionState(updatedState);
  };

  return {
    subscription,
    setSubscription,
    handleSubscriptionUpdate,
  };
}
