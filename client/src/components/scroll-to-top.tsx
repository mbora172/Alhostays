import { useEffect } from "react";
import { useLocation } from "wouter";

/** Client-side navigation keeps the scroll position; reset it on page change. */
export function ScrollToTop() {
  const [location] = useLocation();

  useEffect(() => {
    const hash = window.location.hash;
    if (hash) {
      document.getElementById(hash.slice(1))?.scrollIntoView();
      return;
    }
    window.scrollTo(0, 0);
  }, [location]);

  return null;
}
