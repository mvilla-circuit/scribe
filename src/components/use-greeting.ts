import { useEffect, useState } from "react";

// Pick a time-of-day greeting for the given moment.
function greetingFor(date: Date): string {
  const hour = date.getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

// Milliseconds from `now` until the greeting bucket can next change: the next
// noon, 6pm, or midnight, whichever comes first.
function msUntilNextGreetingChange(now: Date): number {
  const boundaryHour = now.getHours() < 12 ? 12 : now.getHours() < 18 ? 18 : 24;
  const next = new Date(now);
  next.setHours(boundaryHour, 0, 0, 0);
  return next.getTime() - now.getTime();
}

/**
 * The current time-of-day greeting ("Good morning/afternoon/evening"), refreshed
 * only when it can actually change. A single timeout is aligned to the next
 * boundary (noon / 6pm / midnight) rather than ticking on an interval, and a
 * window-focus listener recomputes to recover from a slept or backgrounded
 * window that missed its timer.
 */
export function useGreeting(): string {
  const [greeting, setGreeting] = useState(() => greetingFor(new Date()));

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;

    const refresh = () => {
      setGreeting(greetingFor(new Date()));
    };

    const schedule = () => {
      timer = setTimeout(() => {
        refresh();
        schedule();
      }, msUntilNextGreetingChange(new Date()));
    };

    schedule();
    window.addEventListener("focus", refresh);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("focus", refresh);
    };
  }, []);

  return greeting;
}
