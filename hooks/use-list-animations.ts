import { useCallback, useRef } from 'react';
import {
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

const COLLAPSE_DISTANCE = 80;
const MIN_ITEMS_FOR_COLLAPSE = 6;
const DIRECTION_THRESHOLD = 15;
const MAX_PROGRESS_STEP = 0.08;
const BOTTOM_MARGIN = 50;

export function useListAnimations(itemCount: number) {
  const headerProgress = useSharedValue(1);
  const showScrollTop = useSharedValue(0);

  const dir = useRef(0);
  const prevY = useRef(0);
  const dirChangeStart = useRef(0);

  const handleScroll = useCallback(
    (event: { nativeEvent: { contentOffset: { y: number }; contentSize: { height: number }; layoutMeasurement: { height: number } } }) => {
      const y = event.nativeEvent.contentOffset.y;
      const contentHeight = event.nativeEvent.contentSize.height;
      const viewHeight = event.nativeEvent.layoutMeasurement.height;
      const maxScroll = contentHeight - viewHeight;

      if (itemCount < MIN_ITEMS_FOR_COLLAPSE) {
        headerProgress.value = 1;
        showScrollTop.value = 0;
        prevY.current = y;
        return;
      }

      if (y <= 0) {
        headerProgress.value = withTiming(1, { duration: 150 });
        dir.current = 0;
        dirChangeStart.current = 0;
        showScrollTop.value = withTiming(0, { duration: 200 });
        prevY.current = y;
        return;
      }

      if (y >= maxScroll - BOTTOM_MARGIN) {
        if (headerProgress.value !== 0) {
          headerProgress.value = withTiming(0, { duration: 150 });
        }
        prevY.current = y;
        return;
      }

      const diff = y - prevY.current;
      const rawDir = diff > 0 ? 1 : diff < 0 ? -1 : 0;
      prevY.current = y;

      if (rawDir === 0) return;

      if (rawDir === dir.current) {
        dirChangeStart.current = 0;
        const currentProg = headerProgress.value;

        if (dir.current === 1) {
          const step = Math.min(Math.abs(diff) / COLLAPSE_DISTANCE, MAX_PROGRESS_STEP);
          headerProgress.value = Math.max(currentProg - step, 0);
        } else {
          const step = Math.min(Math.abs(diff) / COLLAPSE_DISTANCE, MAX_PROGRESS_STEP);
          headerProgress.value = Math.min(currentProg + step, 1);
        }
      } else {
        if (dirChangeStart.current === 0) {
          dirChangeStart.current = y;
        }

        const changeDistance = Math.abs(y - dirChangeStart.current);

        if (changeDistance >= DIRECTION_THRESHOLD) {
          dir.current = rawDir;
          dirChangeStart.current = 0;
        }
      }

      if (y > 150 && dir.current === -1) {
        showScrollTop.value = withTiming(1, { duration: 200 });
      } else if (dir.current === 1 || y < 80) {
        showScrollTop.value = withTiming(0, { duration: 200 });
      }
    },
    [headerProgress, showScrollTop, itemCount]
  );

  const headerRowAnimatedStyle = useAnimatedStyle(() => ({
    opacity: headerProgress.value,
    height: interpolate(headerProgress.value, [0, 1], [0, 44], Extrapolation.CLAMP),
    marginBottom: interpolate(headerProgress.value, [0, 1], [0, 0], Extrapolation.CLAMP),
    overflow: 'hidden' as const,
  }));

  const toolbarAnimatedStyle = useAnimatedStyle(() => ({
    opacity: headerProgress.value,
    maxHeight: interpolate(headerProgress.value, [0, 1], [0, 200], Extrapolation.CLAMP),
    marginBottom: interpolate(headerProgress.value, [0, 1], [0, 8], Extrapolation.CLAMP),
    overflow: 'hidden' as const,
  }));

  const filterPillAnimatedStyle = useAnimatedStyle(() => ({
    width: interpolate(headerProgress.value, [0, 1], [52, 130], Extrapolation.CLAMP),
    paddingLeft: interpolate(headerProgress.value, [0, 1], [0, 16], Extrapolation.CLAMP),
    paddingRight: interpolate(headerProgress.value, [0, 1], [0, 14], Extrapolation.CLAMP),
  }));

  const filterPillTextAnimatedStyle = useAnimatedStyle(() => ({
    opacity: headerProgress.value,
    width: interpolate(headerProgress.value, [0, 1], [0, 55], Extrapolation.CLAMP),
    marginRight: interpolate(headerProgress.value, [0, 1], [0, 8], Extrapolation.CLAMP),
  }));

  const scrollTopAnimatedStyle = useAnimatedStyle(() => ({
    opacity: showScrollTop.value,
    transform: [
      { scale: showScrollTop.value },
      { translateY: interpolate(showScrollTop.value, [0, 1], [20, 0]) },
    ],
  }));

  return {
    handleScroll,
    scrollTopAnimatedStyle,
    filterPillAnimatedStyle,
    filterPillTextAnimatedStyle,
    headerRowAnimatedStyle,
    toolbarAnimatedStyle,
  };
}
