import { useEffect } from "react";

const SITE_NAME = "Aloha Stays";

export function usePageTitle(title?: string) {
  useEffect(() => {
    document.title = title ? `${title} | ${SITE_NAME}` : `${SITE_NAME} | Waikiki Vacation Rentals`;
  }, [title]);
}
