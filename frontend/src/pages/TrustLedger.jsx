import { useState, useEffect } from 'react';
import { ShieldCheck, LinkSimple as LinkIcon, Clock, Hash, Lock, CheckCircle, XCircle } from '@phosphor-icons/react';

export default function TrustLedger() {
  const [blocks, setBlocks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState(null);

  useEffect(() => {
    fetchBlocks();
  }, []);

  const fetchBlocks = async () => {
    try {
      const res = await fetch('http://127.0.0.1:8000/api/ledger');
      const data = await res.json();
      setBlocks(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const verifyChain = async () => {
    setVerifying(true);
    setVerificationResult(null);
    try {
      const res = await fetch('http://127.0.0.1:8000/api/ledger/verify', { method: 'POST' });
      const data = await res.json();
      setVerificationResult(data.valid);
    } catch (e) {
      setVerificationResult(false);
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col p-8 overflow-y-auto">
      <div className="max-w-4xl mx-auto w-full">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-display-sm text-on-dark mb-2 flex items-center gap-3">
              <Lock className="text-primary" />
              Cryptographic Trust Ledger
            </h1>
            <p className="text-body-md text-muted">
              Immutable, tamper-evident record of all security scans.
            </p>
          </div>
          <button
            onClick={verifyChain}
            disabled={verifying || loading}
            className="h-10 px-6 rounded-md font-button text-on-primary bg-primary hover:bg-primary-active transition-colors flex items-center gap-2 disabled:opacity-50"
          >
            {verifying ? <ShieldCheck className="animate-spin" /> : <ShieldCheck />}
            {verifying ? 'Verifying...' : 'Verify Chain Integrity'}
          </button>
        </div>

        {verificationResult !== null && (
          <div className={`mb-8 p-4 rounded-lg flex items-center gap-3 ${verificationResult ? 'bg-success/10 text-success border border-success/20' : 'bg-critical/10 text-critical border border-critical/20'}`}>
            {verificationResult ? <CheckCircle /> : <XCircle />}
            <span className="font-medium">
              {verificationResult 
                ? "Chain is perfectly intact. Cryptographic signatures are mathematically verified." 
                : "WARNING: Chain integrity compromised. A block hash mismatch was detected!"}
            </span>
          </div>
        )}

        <div className="relative">
          {/* Vertical line connecting blocks */}
          <div className="absolute left-6 top-0 bottom-0 w-px bg-hairline-on-dark hidden md:block"></div>
          
          {loading ? (
            <div className="text-center py-12 text-muted animate-pulse">Loading Blockchain Data...</div>
          ) : blocks.length === 0 ? (
            <div className="text-center py-12 text-muted">No blocks mined yet. Run a scan to generate the genesis block.</div>
          ) : (
            <div className="space-y-6">
              {blocks.map((block) => (
                <div key={block.id} className="relative flex items-start gap-6 group">
                  <div className="w-12 h-12 shrink-0 bg-surface-card-dark border-2 border-primary rounded-lg flex items-center justify-center text-primary z-10 relative">
                    <span className="font-mono font-bold text-sm">#{block.id}</span>
                  </div>
                  
                  <div className="flex-1 bg-surface-card-dark border border-hairline-on-dark rounded-xl p-6 shadow-lg transition-transform hover:-translate-y-1">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-title-md text-on-dark flex items-center gap-2">
                        <LinkIcon size={18} className="text-muted" />
                        {block.repository}
                      </h3>
                      <div className="flex items-center gap-2 text-caption text-muted">
                        <Clock size={14} />
                        {new Date(block.timestamp).toLocaleString()}
                      </div>
                    </div>
                    
                    <div className="space-y-3 font-mono text-sm">
                      <div>
                        <div className="text-muted mb-1 flex items-center gap-1"><Hash size={14} /> Record Hash</div>
                        <div className="bg-surface-elevated-dark p-2 rounded text-primary break-all border border-primary/20 shadow-[0_0_10px_rgba(252,213,53,0.1)]">
                          {block.record_hash}
                        </div>
                      </div>
                      <div>
                        <div className="text-muted mb-1 flex items-center gap-1"><Hash size={14} /> Previous Hash</div>
                        <div className="bg-surface-elevated-dark p-2 rounded text-muted break-all">
                          {block.previous_hash}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
