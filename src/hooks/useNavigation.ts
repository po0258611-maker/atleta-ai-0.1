import { useState } from 'react';
import { TabType } from '../components/SidebarNav';

export function useNavigation() {
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState<boolean>(false);

  // Modals state
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [isSubscriptionModalOpen, setIsSubscriptionModalOpen] = useState<boolean>(false);
  const [isDeviceModalOpen, setIsDeviceModalOpen] = useState<boolean>(false);
  const [isBodyMeasurementsOpen, setIsBodyMeasurementsOpen] = useState<boolean>(false);
  const [isPremiumGateOpen, setIsPremiumGateOpen] = useState<boolean>(false);
  const [showOnboarding, setShowOnboarding] = useState<boolean>(false);

  const navigateToTab = (tab: TabType) => {
    setActiveTab(tab);
    setIsMobileNavOpen(false);
  };

  return {
    activeTab,
    setActiveTab: navigateToTab,
    isSidebarCollapsed,
    setIsSidebarCollapsed,
    isMobileNavOpen,
    setIsMobileNavOpen,
    isAuthModalOpen,
    setIsAuthModalOpen,
    isSubscriptionModalOpen,
    setIsSubscriptionModalOpen,
    isDeviceModalOpen,
    setIsDeviceModalOpen,
    isBodyMeasurementsOpen,
    setIsBodyMeasurementsOpen,
    isPremiumGateOpen,
    setIsPremiumGateOpen,
    showOnboarding,
    setShowOnboarding,
  };
}
