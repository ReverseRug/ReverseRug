import { useEffect, useMemo, useState } from "react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { useWallet } from "@solana/wallet-adapter-react";

const API_BASE_URL = (import.meta.env.VITE_API_URL as string | undefined) || "/api";
const ADMIN_WALLETS = ((import.meta.env.VITE_ADMIN_WALLET as string | undefined)
  || "")
  .split(",")
  .map((wallet) => wallet.trim())
  .filter(Boolean);

interface AdminOverview {
  adminWallet: string;
  authority: string;
  currentEpoch: number;
  epochStart: number;
  epochEnd: number;
  epochDuration: number;
  timeLeft: number;
  roundEnded: boolean;
  vault: {
    tokenAccount: string;
    uiAmount: string;
  };
  feeWallets: {
    dev: {
      owner: string;
      tokenAccount: string;
      uiAmount: string;
    };
    buyback: {
      owner: string;
      tokenAccount: string;
      uiAmount: string;
    };
  };
}

interface ParticipantLogEntry {
  wallet: string;
  depositedUsdc: number;
}

interface RoundParticipantLog {
  epoch: number;
  participantCount: number;
  participants: ParticipantLogEntry[];
}

const sessionKeyFor = (wallet: string) => `admin-session-token-${wallet}`;

export const AdminPage = () => {
  const { publicKey, signMessage, connected } = useWallet();
  const [token, setToken] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<"" | "start" | "distribute">("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [durationSeconds, setDurationSeconds] = useState(604800);
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [participantRounds, setParticipantRounds] = useState<RoundParticipantLog[]>([]);
  const [participantLogLoading, setParticipantLogLoading] = useState(false);
  const [logs, setLogs] = useState("");

  const walletAddress = publicKey?.toBase58() || "";
  const isAllowedWallet = ADMIN_WALLETS.includes(walletAddress);

  const authHeaders = useMemo(() => {
    if (!token) return {};
    return { "x-admin-token": token };
  }, [token]);

  useEffect(() => {
    if (!walletAddress) {
      setToken(null);
      return;
    }
    const stored = sessionStorage.getItem(sessionKeyFor(walletAddress));
    setToken(stored || null);
  }, [walletAddress]);

  const fetchOverview = async () => {
    if (!token) return;
    const response = await fetch(`${API_BASE_URL}/admin/overview`, {
      headers: authHeaders,
    });
    const payload = await response.json();
    if (!response.ok || !payload?.success) {
      throw new Error(payload?.error || "Failed to fetch admin overview");
    }
    setOverview(payload.data as AdminOverview);
  };

  const fetchParticipantLog = async () => {
    if (!token) return;
    setParticipantLogLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/admin/participants-log?limit=25`, {
        headers: authHeaders,
      });
      const payload = await response.json();
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.error || "Failed to fetch participant log");
      }
      setParticipantRounds((payload.data?.rounds || []) as RoundParticipantLog[]);
    } finally {
      setParticipantLogLoading(false);
    }
  };

  useEffect(() => {
    if (!token) return;
    Promise.all([
      fetchOverview(),
      fetchParticipantLog(),
    ]).catch((err: any) => setError(err.message || "Failed to fetch admin data"));
    const timer = setInterval(() => {
      Promise.all([
        fetchOverview(),
        fetchParticipantLog(),
      ]).catch(() => {});
    }, 15000);
    return () => clearInterval(timer);
  }, [token]);

  const handleAdminLogin = async () => {
    if (!publicKey || !isAllowedWallet) {
      setError("Allowed admin wallet is not connected.");
      return;
    }
    if (!signMessage) {
      setError("Wallet does not support message signing.");
      return;
    }

    setAuthLoading(true);
    setError("");
    setSuccess("");
    try {
      const challengeRes = await fetch(`${API_BASE_URL}/admin/auth/challenge`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wallet: walletAddress }),
      });
      const challengePayload = await challengeRes.json();
      if (!challengeRes.ok || !challengePayload?.success) {
        throw new Error(challengePayload?.error || "Could not create admin challenge");
      }

      const message = challengePayload.data.message as string;
      const encoded = new TextEncoder().encode(message);
      const signature = await signMessage(encoded);
      const signatureBase64 = btoa(String.fromCharCode(...signature));

      const verifyRes = await fetch(`${API_BASE_URL}/admin/auth/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          wallet: walletAddress,
          message,
          signature: signatureBase64,
        }),
      });
      const verifyPayload = await verifyRes.json();
      if (!verifyRes.ok || !verifyPayload?.success) {
        throw new Error(verifyPayload?.error || "Admin signature verification failed");
      }

      const newToken = verifyPayload.data.token as string;
      setToken(newToken);
      sessionStorage.setItem(sessionKeyFor(walletAddress), newToken);
      setSuccess("Admin session opened.");
      await Promise.all([fetchOverview(), fetchParticipantLog()]);
    } catch (err: any) {
      setError(err.message || "Admin login failed");
    } finally {
      setAuthLoading(false);
    }
  };

  const handleStartEpoch = async () => {
    if (!token) return;
    setActionLoading("start");
    setError("");
    setSuccess("");
    setLogs("");
    try {
      const response = await fetch(`${API_BASE_URL}/admin/start-epoch`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders,
        },
        body: JSON.stringify({ durationSeconds }),
      });
      const payload = await response.json();
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.error || "Failed to start epoch");
      }
      setSuccess(`New epoch started (${durationSeconds}s).`);
      setLogs(payload.output || "");
      await fetchOverview();
    } catch (err: any) {
      setError(err.message || "Failed to start epoch");
    } finally {
      setActionLoading("");
    }
  };

  const handleDistribute = async () => {
    if (!token) return;
    setActionLoading("distribute");
    setError("");
    setSuccess("");
    setLogs("");
    try {
      const response = await fetch(`${API_BASE_URL}/admin/distribute`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders,
        },
      });
      const payload = await response.json();
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.error || "Distribution failed");
      }
      setSuccess("Distribution triggered.");
      setLogs(payload.output || "");
      await fetchOverview();
    } catch (err: any) {
      setError(err.message || "Distribution failed");
    } finally {
      setActionLoading("");
    }
  };

  return (
    <div className="min-h-screen bg-[#FEF3C7] text-[#0F172A]">
      <div className="border-b-4 border-black bg-[#F8EFC4]">
        <div className="max-w-6xl mx-auto px-4 py-5 flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase text-[#06B6D4]">ReverseRug</p>
            <h1 className="text-2xl font-black uppercase">Admin Panel</h1>
          </div>
          <a
            href="/"
            className="px-4 py-2 font-black uppercase border-4 border-black bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
          >
            Home
          </a>
        </div>
      </div>

      <main className="max-w-6xl mx-auto px-4 py-8 space-y-6">
        <section className="bg-white border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] p-5 space-y-4">
          <h2 className="text-xl font-black uppercase">Admin Login</h2>
          <div className="flex flex-col sm:flex-row gap-3 items-start">
            <WalletMultiButton className="!rounded-none !font-black !uppercase !bg-[#06B6D4] !text-black !border-4 !border-black" />
            <button
              onClick={handleAdminLogin}
              disabled={!connected || !isAllowedWallet || !signMessage || authLoading}
              className="px-6 py-3 font-black uppercase border-4 border-black bg-[#22C55E] disabled:opacity-50 disabled:cursor-not-allowed shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
            >
              {authLoading ? "Signing..." : token ? "Refresh Session" : "Login as Admin"}
            </button>
          </div>
          <div className="text-sm font-bold">
            Allowed wallets:
            <div className="mt-1 space-y-1">
              {ADMIN_WALLETS.map((wallet) => (
                <div key={wallet} className="break-all">{wallet}</div>
              ))}
            </div>
          </div>
          {walletAddress && !isAllowedWallet && (
            <p className="text-sm font-bold text-red-700">
              Connected wallet is not authorized for this admin panel.
            </p>
          )}
        </section>

        {error && <div className="p-4 border-4 border-black bg-red-100 font-bold text-red-700">{error}</div>}
        {success && <div className="p-4 border-4 border-black bg-green-100 font-bold text-green-700">{success}</div>}

        {token && overview && (
          <>
            <section className="grid md:grid-cols-3 gap-4">
              <div className="bg-[#E0F2FE] border-4 border-black p-4 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
                <p className="text-xs font-black uppercase text-[#475569]">Current Epoch</p>
                <p className="text-3xl font-black">{overview.currentEpoch}</p>
              </div>
              <div className="bg-[#DCFCE7] border-4 border-black p-4 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
                <p className="text-xs font-black uppercase text-[#475569]">Vault Balance</p>
                <p className="text-3xl font-black">{overview.vault.uiAmount} USDC</p>
              </div>
              <div className="bg-[#FEF3C7] border-4 border-black p-4 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
                <p className="text-xs font-black uppercase text-[#475569]">Round Status</p>
                <p className="text-2xl font-black">{overview.roundEnded ? "Ended" : `${overview.timeLeft}s left`}</p>
              </div>
            </section>

            <section className="grid md:grid-cols-2 gap-4">
              <div className="bg-white border-4 border-black p-4 space-y-2">
                <h3 className="font-black uppercase">Fee Wallets</h3>
                <p className="text-sm"><span className="font-black">Dev:</span> {overview.feeWallets.dev.uiAmount} USDC</p>
                <p className="text-xs break-all text-[#475569]">{overview.feeWallets.dev.owner}</p>
                <p className="text-xs break-all text-[#475569]">{overview.feeWallets.dev.tokenAccount}</p>
                <hr className="border-black" />
                <p className="text-sm"><span className="font-black">Buyback:</span> {overview.feeWallets.buyback.uiAmount} USDC</p>
                <p className="text-xs break-all text-[#475569]">{overview.feeWallets.buyback.owner}</p>
                <p className="text-xs break-all text-[#475569]">{overview.feeWallets.buyback.tokenAccount}</p>
              </div>

              <div className="bg-white border-4 border-black p-4 space-y-3">
                <h3 className="font-black uppercase">Admin Actions</h3>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="number"
                    min={10}
                    value={durationSeconds}
                    onChange={(e) => setDurationSeconds(Number(e.target.value))}
                    className="flex-1 px-3 py-2 border-4 border-black font-black"
                  />
                  <button
                    onClick={handleStartEpoch}
                    disabled={actionLoading !== ""}
                    className="px-5 py-2 font-black uppercase border-4 border-black bg-[#06B6D4] disabled:opacity-50"
                  >
                    {actionLoading === "start" ? "Starting..." : "Start Epoch"}
                  </button>
                </div>
                <button
                  onClick={handleDistribute}
                  disabled={actionLoading !== ""}
                  className="w-full px-5 py-3 font-black uppercase border-4 border-black bg-[#F97316] disabled:opacity-50"
                >
                  {actionLoading === "distribute" ? "Running..." : "Distribute Rewards + Fees"}
                </button>
              </div>
            </section>

            {logs && (
              <section className="bg-black text-green-300 border-4 border-black p-4">
                <p className="font-black uppercase text-white mb-2">Last Command Output</p>
                <pre className="whitespace-pre-wrap text-xs">{logs}</pre>
              </section>
            )}

            <section className="bg-[#E0F2FE] border-4 border-black p-4 sm:p-5 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] space-y-4">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-lg sm:text-xl font-black uppercase">Round Participant Log</h3>
                <button
                  type="button"
                  onClick={() => fetchParticipantLog().catch((err: any) => setError(err.message || "Failed to refresh participant log"))}
                  disabled={participantLogLoading}
                  className="px-4 py-2 text-xs sm:text-sm font-black uppercase border-4 border-black bg-[#FBBF24] disabled:opacity-50"
                >
                  {participantLogLoading ? "Refreshing..." : "Refresh"}
                </button>
              </div>

              <div className="max-h-[520px] overflow-y-auto pr-1 space-y-3">
                {participantRounds.length === 0 ? (
                  <div className="bg-white border-4 border-black p-4 text-sm font-bold text-[#475569]">
                    No participant logs yet.
                  </div>
                ) : (
                  participantRounds.map((round) => (
                    <div
                      key={round.epoch}
                      className="bg-white border-4 border-black p-4 space-y-3"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-black uppercase text-sm sm:text-base">
                          Round {round.epoch}
                        </p>
                        <span className="px-2 py-1 text-xs font-black uppercase border-2 border-black bg-[#FEF3C7]">
                          {round.participantCount} participants
                        </span>
                      </div>

                      {round.participants.length === 0 ? (
                        <p className="text-sm font-bold text-[#64748B]">No participants in this round.</p>
                      ) : (
                        <div className="max-h-52 overflow-y-auto border-2 border-black">
                          <table className="w-full text-left">
                            <thead className="bg-[#FEF3C7] border-b-2 border-black">
                              <tr>
                                <th className="px-3 py-2 text-xs font-black uppercase">Wallet</th>
                                <th className="px-3 py-2 text-xs font-black uppercase text-right">Deposit</th>
                              </tr>
                            </thead>
                            <tbody>
                              {round.participants.map((p) => (
                                <tr key={`${round.epoch}-${p.wallet}`} className="border-b border-black/20">
                                  <td className="px-3 py-2 text-xs sm:text-sm font-bold break-all">{p.wallet}</td>
                                  <td className="px-3 py-2 text-xs sm:text-sm font-black text-right">{p.depositedUsdc} USDC</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </section>
          </>
        )}
      </main>
    </div>
  );
};
