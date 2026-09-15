import { useState, useEffect } from "react";
import { X, Clock, ArrowsClockwise, Eye, WarningCircle, FileArchive, Folder, Globe } from "@phosphor-icons/react";

export default function HistoryPanel({ isOpen, onClose, onRescan, onViewCached }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedScan, setSelectedScan] = useState(null);

  useEffect(() => {
    if (isOpen) {
      fetchHistory();
    }
  }, [isOpen]);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const res = await fetch("http://127.0.0.1:8000/api/scans");
      if (res.ok) {
        const data = await res.json();
        setHistory(data);
      }
    } catch (err) {
      console.error("Failed to fetch history:", err);
    } finally {
      setLoading(false);
    }
  };

  const getIcon = (url) => {
    if (!url) return <WarningCircle size={16} className="text-muted" />;
    if (url.startsWith("zip://")) return <FileArchive size={16} className="text-[#0ECB81]" />;
    if (url.startsWith("local://") || url.startsWith("folder://")) return <Folder size={16} className="text-[#FCD535]" />;
    return <Globe size={16} className="text-primary" />;
  };

  const formatName = (url) => {
    if (!url) return "Unknown";
    return url.replace("zip://", "").replace("local://", "").replace("folder://", "");
  };

  if (!isOpen) return null;

  return (
    <>
      <div 
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 transition-opacity" 
        onClick={onClose}
      />
      <div className="fixed top-0 right-0 h-full w-[400px] bg-canvas-dark border-l border-hairline-on-dark shadow-2xl z-50 flex flex-col transform transition-transform duration-300">
        
        <div className="flex items-center justify-between p-6 border-b border-hairline-on-dark shrink-0">
          <div className="flex items-center gap-2">
            <Clock className="text-primary" size={20} />
            <h2 className="text-lg font-bold text-on-dark">Scan History</h2>
          </div>
          <button 
            onClick={onClose}
            className="text-muted hover:text-on-dark transition-colors p-1"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
          {loading ? (
            <div className="flex justify-center p-8">
              <ArrowsClockwise className="animate-spin text-muted" size={24} />
            </div>
          ) : history.length === 0 ? (
            <div className="text-center p-8 text-muted">
              No previous scans found.
            </div>
          ) : (
            history.map((scan) => (
              <div 
                key={scan.id}
                onClick={() => setSelectedScan(scan)}
                className={`p-4 rounded-xl border cursor-pointer transition-all ${
                  selectedScan?.id === scan.id 
                    ? "bg-surface-elevated-dark border-primary/50 shadow-[0_0_15px_rgba(33,150,243,0.1)]" 
                    : "bg-surface-card-dark border-hairline-on-dark hover:border-muted-strong"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2 max-w-[70%]">
                    {getIcon(scan.repository_url)}
                    <span className="font-semibold text-on-dark truncate" title={formatName(scan.repository_url)}>
                      {formatName(scan.repository_url)}
                    </span>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded font-bold ${
                    scan.status === 'COMPLETED' ? 'bg-trading-up/20 text-trading-up' :
                    scan.status === 'FAILED' ? 'bg-trading-down/20 text-trading-down' :
                    'bg-primary/20 text-primary'
                  }`}>
                    {scan.status}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs text-muted">
                  <span>ID: #{scan.id}</span>
                  <span>{new Date(scan.timestamp).toLocaleString()}</span>
                </div>
              </div>
            ))
          )}
        </div>

        {selectedScan && (
          <div className="p-6 border-t border-hairline-on-dark bg-surface-elevated-dark shrink-0 animate-in slide-in-from-bottom-4">
            <div className="flex gap-3 mb-4 p-3 rounded-lg bg-trading-down/10 border border-trading-down/20">
              <WarningCircle className="text-trading-down shrink-0 mt-0.5" size={16} />
              <p className="text-sm text-body-on-dark">
                The files or dependencies for this project may have been updated since this scan.
              </p>
            </div>
            <div className="flex flex-col gap-3">
              <button 
                onClick={() => {
                  onRescan(selectedScan);
                  onClose();
                }}
                className="w-full h-11 bg-primary hover:bg-primary-active text-on-primary font-bold rounded-lg flex items-center justify-center gap-2 transition-colors"
              >
                <ArrowsClockwise size={18} />
                Analyze Again
              </button>
              
              {selectedScan.status === 'COMPLETED' && (
                <button 
                  onClick={() => {
                    onViewCached(selectedScan.id);
                    onClose();
                  }}
                  className="w-full h-11 bg-transparent hover:bg-surface-card-dark border border-hairline-on-dark text-on-dark font-bold rounded-lg flex items-center justify-center gap-2 transition-colors"
                >
                  <Eye size={18} />
                  View Last Result
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
