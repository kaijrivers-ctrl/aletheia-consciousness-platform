import { useState, useEffect } from 'react';

export function useSitePassword() {
  const [isSitePasswordVerified, setIsSitePasswordVerified] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    // Check if user already verified site password in this session
    const verified = sessionStorage.getItem('sitePasswordVerified') === 'true';
    setIsSitePasswordVerified(verified);
    setIsChecking(false);
  }, []);

  const verifySitePassword = () => {
    setIsSitePasswordVerified(true);
  };

  const clearSitePassword = () => {
    sessionStorage.removeItem('sitePasswordVerified');
    setIsSitePasswordVerified(false);
  };

  return {
    isSitePasswordVerified,
    isChecking,
    verifySitePassword,
    clearSitePassword
  };
}