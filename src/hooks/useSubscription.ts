import { useState, useEffect } from 'react';
import { SubscriptionState } from '../types';
import { getSubscriptionState, saveSubscriptionState } from '../services/subscriptionService';

const FREE_SUBSCRIPTION: SubscriptionState = {
  isSubscribed: false,
  planId: 'pro_monthly',
  planName: 'Plano Athleta AI PRO',
  priceBrl: 15,
  status: 'canceled',
  billingCycle: 'monthly',
  renewsAt: new Date().toISOString(),
  lastPaymentDate: new Date().toISOString(),
};

export function useSubscription(userId?: string) {
  const [subscription, setSubscription] = useState<SubscriptionState>(FREE_SUBSCRIPTION);

  useEffect(() => {
    let cancelled = false;
    if (!userId || userId.startsWith('guest_')) {
      setSubscription(FREE_SUBSCRIPTION);
      return () => { cancelled = true; };
    }

    getSubscriptionState(userId)
      .then((remoteSub) => {
        if (!cancelled) setSubscription(remoteSub);
      })
      .catch((err) => {
        if (!cancelled) {
          console.warn('Erro ao carregar assinatura do servidor:', err);
          setSubscription(FREE_SUBSCRIPTION);
        }
      });

    return () => { cancelled = true; };
  }, [userId]);

  const handleSubscriptionUpdate = async (updatedState: SubscriptionState) => {
    setSubscription(updatedState);
    await saveSubscriptionState(updatedState);
  };

  return { subscription, setSubscription, handleSubscriptionUpdate };
}
