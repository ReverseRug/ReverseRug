// API client for calling the Express backend server
const API_BASE_URL = (import.meta.env.VITE_API_URL as string | undefined)
  || 'http://localhost:4000/api';

export interface DepositRequest {
  amount: number;
  participantIndex: number;
}

export interface ClaimRequest {
  participantIndex: number;
  epoch?: number;
}

export interface PartialWithdrawRequest {
  participantIndex: number;
  epoch?: number;
}

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  error?: string;
  output?: string;
  data?: T;
}

export async function deposit(request: DepositRequest): Promise<ApiResponse<{ amount: number; participantIndex: number }>> {
  const response = await fetch(`${API_BASE_URL}/deposit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    throw new Error(`Deposit failed: ${response.statusText}`);
  }

  return response.json();
}

export async function claim(request: ClaimRequest): Promise<ApiResponse<{ participantIndex: number }>> {
  const response = await fetch(`${API_BASE_URL}/claim`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    throw new Error(`Claim failed: ${response.statusText}`);
  }

  return response.json();
}

export async function partialWithdraw(request: PartialWithdrawRequest): Promise<ApiResponse<{ participantIndex: number; refundPercentage: number }>> {
  const response = await fetch(`${API_BASE_URL}/partial-withdraw`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    throw new Error(`Partial withdraw failed: ${response.statusText}`);
  }

  return response.json();
}

export async function getHealth(): Promise<{ status: string; timestamp: string }> {
  const response = await fetch(`${API_BASE_URL}/health`);

  if (!response.ok) {
    throw new Error(`Health check failed: ${response.statusText}`);
  }

  return response.json();
}
