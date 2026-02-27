import { useState, useEffect } from 'react';

const API_BASE_URL = (import.meta.env.VITE_API_URL as string | undefined)
  || '/api';

interface Winner {
  epoch: number;
  winner: string;
  prize: number; // in USDC (with 6 decimals)
  participants: number;
  timestamp: number;
  txSignature?: string;
}

export const useWinners = () => {
  const [winners, setWinners] = useState<Winner[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchWinners = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/winners`, {
        cache: 'no-store',
      });
      const data = await response.json();
      
      if (data.success) {
        setWinners(data.data);
      } else {
        setError(data.error || 'Failed to fetch winners');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWinners();
    // Refresh frequently so winners list stays live after each round settlement
    const interval = setInterval(fetchWinners, 10000);
    return () => clearInterval(interval);
  }, []);

  return { winners, loading, error, refresh: fetchWinners };
};
