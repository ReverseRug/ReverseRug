// Hook for fetching round data
import { useState, useEffect, useCallback } from 'react';

const API_BASE_URL = (import.meta.env.VITE_API_URL as string | undefined)
  || 'http://localhost:4000/api';

export interface RoundData {
  currentEpoch: number;
  epochStart: number;
  epochEnd: number;
  epochDuration: number;
  timeLeft: number;
  timeLeftDays: string;
  minDepositUsd: number;
  thresholdUsd: number;
  totalPayout: number;
  carryoverEpoch: string;
  isCarryover: boolean;
  authority: string;
  vault: string;
  vaultLocked: boolean;
  vaultLockTimeLeft: number;
}

export interface StatsData {
  participants: number;
  maxParticipants: number;
  jackpot: number;
  minDeposit: number;
  currentEpoch: number;
}

export interface ParticipantData {
  exists: boolean;
  wallet: string;
  owner?: string;
  depositedUsdc?: number;
  eligible?: boolean;
  lastDepositEpoch?: number;
  lastDepositTime?: number;
  currentEpoch: number;
  carryover?: {
    epoch: number;
    depositedUsdc: number;
    eligible: boolean;
    lastDepositTime: number;
  };
}

export const useRoundData = () => {
  const [data, setData] = useState<RoundData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRoundData = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/round/current`);
      const result = await response.json();
      
      if (result.success) {
        setData(result.data);
        setError(null);
      } else {
        setError(result.error || 'Failed to fetch round data');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRoundData();
    // Refresh every 30 seconds
    const interval = setInterval(fetchRoundData, 30000);
    return () => clearInterval(interval);
  }, []);

  return { data, loading, error, refresh: fetchRoundData };
};

export const useStatsData = () => {
  const [data, setData] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStatsData = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/round/stats`);
      const result = await response.json();
      
      if (result.success) {
        setData(result.data);
        setError(null);
      } else {
        setError(result.error || 'Failed to fetch stats data');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatsData();
    // Refresh every 10 seconds
    const interval = setInterval(fetchStatsData, 10000);
    return () => clearInterval(interval);
  }, []);

  return { data, loading, error, refresh: fetchStatsData };
};

export const useParticipantData = (wallet: string | null) => {
  const [data, setData] = useState<ParticipantData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchParticipantData = useCallback(async () => {
    if (!wallet) {
      setData(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/participant/${wallet}`);
      const result = await response.json();
      
      if (result.success) {
        setData(result.data);
        setError(null);
      } else {
        setError(result.error || 'Failed to fetch participant data');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [wallet]);

  useEffect(() => {
    fetchParticipantData();
  }, [fetchParticipantData]);

  return { data, loading, error, refresh: fetchParticipantData };
};
