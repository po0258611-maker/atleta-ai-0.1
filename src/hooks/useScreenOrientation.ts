import { useState, useEffect } from 'react';

export type ScreenOrientationType = 'portrait' | 'landscape';

export interface ScreenOrientationState {
  orientation: ScreenOrientationType;
  isLandscape: boolean;
  isPortrait: boolean;
  width: number;
  height: number;
  isShortViewport: boolean; // e.g. mobile in landscape (height < 550px)
  aspectRatio: number;
}

export function useScreenOrientation(): ScreenOrientationState {
  const getOrientationState = (): ScreenOrientationState => {
    if (typeof window === 'undefined') {
      return {
        orientation: 'portrait',
        isLandscape: false,
        isPortrait: true,
        width: 1024,
        height: 768,
        isShortViewport: false,
        aspectRatio: 1024 / 768,
      };
    }

    const width = window.innerWidth;
    const height = window.innerHeight;
    const isLandscape = width > height;
    const isPortrait = !isLandscape;
    const isShortViewport = height <= 540 && isLandscape;
    const aspectRatio = width / (height || 1);

    return {
      orientation: isLandscape ? 'landscape' : 'portrait',
      isLandscape,
      isPortrait,
      width,
      height,
      isShortViewport,
      aspectRatio,
    };
  };

  const [state, setState] = useState<ScreenOrientationState>(getOrientationState);

  useEffect(() => {
    const handleResize = () => {
      setState(getOrientationState());
    };

    window.addEventListener('resize', handleResize, { passive: true });
    window.addEventListener('orientationchange', handleResize, { passive: true });

    // Match media listener for orientation
    const mql = window.matchMedia('(orientation: landscape)');
    const handleMediaChange = () => {
      setState(getOrientationState());
    };

    if (mql.addEventListener) {
      mql.addEventListener('change', handleMediaChange);
    } else if ((mql as any).addListener) {
      (mql as any).addListener(handleMediaChange);
    }

    // Call once to ensure accurate values
    handleResize();

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
      if (mql.removeEventListener) {
        mql.removeEventListener('change', handleMediaChange);
      } else if ((mql as any).removeListener) {
        (mql as any).removeListener(handleMediaChange);
      }
    };
  }, []);

  return state;
}
