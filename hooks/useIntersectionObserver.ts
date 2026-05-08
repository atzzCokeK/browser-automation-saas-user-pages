import { useEffect, useRef, type RefObject } from "react";

type UseIntersectionObserverOptions = {
  threshold?: number;
  rootMargin?: string;
  enabled?: boolean;
};

export function useIntersectionObserver(
  ref: RefObject<Element | null>,
  callback: () => void,
  options: UseIntersectionObserverOptions = {}
): void {
  const { threshold = 0, rootMargin = "0px", enabled = true } = options;
  const callbackRef = useRef(callback);

  // Keep callback ref up to date
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    if (!enabled) return;

    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            callbackRef.current();
          }
        });
      },
      { threshold, rootMargin }
    );

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [ref, threshold, rootMargin, enabled]);
}
