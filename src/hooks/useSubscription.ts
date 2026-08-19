import { useState, useEffect } from 'react';
import { SubscriptionState } from '../types';
import {
  getCachedSubscriptionState,
  getSubscriptionState,
  saveSubscriptionState,
} from '../services/subscriptionService';

export function useSubscription(userId?: string) {
  const [subscription, setSubscription] = useState<SubscriptionState>(() => getCachedSubscriptionState());

  useEffect(() => {
    if (userId) {
      getSubscriptionState(userId)
        .then((remoteSub) => setSubscription(remoteSub))
        .catch((err) => console.warn('Erro ao carregar assinatura do servidor:', err));
    }
  }, [userId]);

  const handleSubscriptionUpdate = async (updatedState: SubscriptionState) => {
    setSubscription(updatedState);
    await saveSubscriptionState(updatedState);
  };

  return {
    subscription,
    setSubscription,
    handleSubscriptionUpdate,
  };
}
