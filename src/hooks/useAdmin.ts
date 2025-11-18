/**
 * useAdmin Hook
 * Custom React hook for admin functionality
 */

import { useState, useEffect } from 'react';
import { checkIsAdmin } from '../lib/admin';
import { useAuth } from '../contexts/AuthContext';

export function useAdmin() {
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchAdminStatus() {
      if (!user) {
        setIsAdmin(false);
        setLoading(false);
        return;
      }

      try {
        const adminStatus = await checkIsAdmin();
        setIsAdmin(adminStatus);
      } catch (error) {
        console.error('Error fetching admin status:', error);
        setIsAdmin(false);
      } finally {
        setLoading(false);
      }
    }

    fetchAdminStatus();
  }, [user]);

  return { isAdmin, loading };
}
