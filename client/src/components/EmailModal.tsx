import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Mail, Send, CheckCircle2, AlertCircle, ExternalLink, User, AtSign,
  Paperclip, FileImage
} from 'lucide-react';
import { ScanResponse } from '../types';
import { sendResultsByEmail } from '../api';

interface EmailModalProps {
  isOpen: boolean;
  onClose: () => void;
  scanResult: ScanResponse;
}

type SendState = 'idle' | 'sending' | 'success' | 'error';

export const EmailModal: React.FC<EmailModalProps> = ({ isOpen, onClose, scanResult }) => {
  const [email, setEmail]         = useState('');
  const [name, setName]           = useState('');
  const [sendState, setSendState] = useState<SendState>('idle');
  const [errorMsg, setErrorMsg]   = useState('');
  const [previewURL, setPreviewURL] = useState<string | null>(null);

  const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const handleSend = async () => {
    if (!isValidEmail) return;
    setSendState('sending');
    setErrorMsg('');
    setPreviewURL(null);
    try {
      const res = await sendResultsByEmail(email, name, scanResult);
      setSendState('success');
      if (res.previewURL) setPreviewURL(res.previewURL);
    } catch (err: unknown) {
      setSendState('error');
      const msg =
        err instanceof Error ? err.message :
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ||
        'Failed to send. Please try again.';
      setErrorMsg(msg);
    }
  };

  const handleClose = () => {
    onClose();
    setTimeout(() => {
      setSendState('idle'); setEmail(''); setName(''); setErrorMsg(''); setPreviewURL(null);
    }, 300);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
            onClick={handleClose}
          />

          {/* Modal */}
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.94, y: 20 }}
              animate={{ opacity: 1, scale: 1,    y: 0  }}
              exit={{    opacity: 0, scale: 0.94, y: 16 }}
              transition={{ type: 'spring', stiffness: 300, damping: 28 }}
              className="w-full max-w-md glass-card pointer-events-auto overflow-hidden"
              style={{ boxShadow: 'var(--shadow-lg), 0 0 60px rgba(59,130,246,0.12)' }}
            >
              {/* Gradient top bar */}
              <div className="h-1" style={{ background: 'linear-gradient(90deg, #3b82f6, #8b5cf6, #14b8a6)' }} />

              {/* Header */}
              <div
                className="flex items-center justify-between px-6 py-4"
                style={{ borderBottom: '1px solid var(--border-color)' }}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{ background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)' }}
                  >
                    <Mail className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h2 className="font-bold text-base" style={{ color: 'var(--text-primary)' }}>
                      Email Results
                    </h2>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                      {scanResult.totalFound} QR code{scanResult.totalFound !== 1 ? 's' : ''} · {scanResult.filename}
                    </p>
                  </div>
                </div>
                <button onClick={handleClose} className="btn-ghost p-2">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Body */}
              <div className="p-6">
                <AnimatePresence mode="wait">

                  {sendState !== 'success' && (
                    <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                      className="space-y-5">

                      {/* What's included */}
                      <div
                        className="flex items-start gap-3 p-3 rounded-xl"
                        style={{ background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.15)' }}
                      >
                        <div className="space-y-1 text-xs" style={{ color: 'var(--text-secondary)' }}>
                          <div className="flex items-center gap-2 font-semibold" style={{ color: 'var(--text-primary)' }}>
                            <Mail className="w-3.5 h-3.5 text-blue-400" /> Email Contents
                          </div>
                          <div className="flex items-center gap-2 pl-5">
                            <Paperclip className="w-3 h-3" /> Full QR decode report (HTML)
                          </div>
                          <div className="flex items-center gap-2 pl-5">
                            <FileImage className="w-3 h-3" /> Annotated image attachment
                          </div>
                        </div>
                      </div>

                      {/* Name */}
                      <div>
                        <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                          Name <span style={{ color: 'var(--text-muted)' }}>(optional)</span>
                        </label>
                        <div className="relative">
                          <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: 'var(--text-muted)' }} />
                          <input
                            type="text"
                            value={name}
                            onChange={e => setName(e.target.value)}
                            placeholder="John Doe"
                            disabled={sendState === 'sending'}
                            className="input-premium pl-9"
                          />
                        </div>
                      </div>

                      {/* Email */}
                      <div>
                        <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                          Email Address <span style={{ color: '#ef4444' }}>*</span>
                        </label>
                        <div className="relative">
                          <AtSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: 'var(--text-muted)' }} />
                          <input
                            type="email"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && isValidEmail && sendState !== 'sending' && handleSend()}
                            placeholder="recipient@example.com"
                            disabled={sendState === 'sending'}
                            className="input-premium pl-9"
                            style={email && !isValidEmail ? { borderColor: 'rgba(239,68,68,0.5)' } : {}}
                          />
                        </div>
                        {email && !isValidEmail && (
                          <p className="mt-1 text-xs" style={{ color: '#f87171' }}>Enter a valid email address</p>
                        )}
                      </div>

                      {/* Error */}
                      <AnimatePresence>
                        {sendState === 'error' && (
                          <motion.div
                            initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                            className="flex items-start gap-2.5 px-3 py-3 rounded-xl text-sm"
                            style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', color: '#f87171' }}
                          >
                            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                            <span>{errorMsg}</span>
                          </motion.div>
                        )}
                      </AnimatePresence>

                      {/* Buttons */}
                      <div className="flex gap-3 pt-1">
                        <button onClick={handleClose} className="btn-secondary flex-1">Cancel</button>
                        <button
                          onClick={handleSend}
                          disabled={!isValidEmail || sendState === 'sending'}
                          className="btn-primary flex-1"
                        >
                          {sendState === 'sending' ? (
                            <>
                              <motion.div
                                className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full"
                                animate={{ rotate: 360 }}
                                transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
                              />
                              Sending…
                            </>
                          ) : (
                            <><Send className="w-4 h-4" /> Send Results</>
                          )}
                        </button>
                      </div>
                    </motion.div>
                  )}

                  {sendState === 'success' && (
                    <motion.div
                      key="success"
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="text-center py-6 space-y-5"
                    >
                      <motion.div
                        initial={{ scale: 0, rotate: -20 }}
                        animate={{ scale: 1, rotate: 0 }}
                        transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.1 }}
                        className="w-20 h-20 rounded-full flex items-center justify-center mx-auto"
                        style={{ background: 'rgba(34,197,94,0.12)', border: '2px solid rgba(34,197,94,0.3)' }}
                      >
                        <CheckCircle2 className="w-10 h-10" style={{ color: '#22c55e' }} />
                      </motion.div>

                      <div>
                        <h3 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Email Sent!</h3>
                        <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
                          Results delivered to{' '}
                          <span className="font-semibold" style={{ color: '#3b82f6' }}>{email}</span>
                        </p>
                      </div>

                      {previewURL && (
                        <div
                          className="text-left p-3 rounded-xl"
                          style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)' }}
                        >
                          <p className="text-xs font-bold mb-1" style={{ color: '#f59e0b' }}>🧪 Dev Mode — Ethereal Preview</p>
                          <p className="text-xs mb-2" style={{ color: 'var(--text-muted)' }}>
                            Email was captured by Ethereal (test SMTP). No real email was sent.
                          </p>
                          <a
                            href={previewURL} target="_blank" rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 text-xs font-semibold underline underline-offset-2"
                            style={{ color: '#f59e0b' }}
                          >
                            <ExternalLink className="w-3 h-3" />
                            Preview in Browser
                          </a>
                        </div>
                      )}

                      <button onClick={handleClose} className="btn-primary w-full">Done</button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
};
