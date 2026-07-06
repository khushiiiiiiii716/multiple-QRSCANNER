import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Mail, Send, CheckCircle, AlertCircle, ExternalLink, User, AtSign } from 'lucide-react';
import { ScanResponse } from '../types';
import { sendResultsByEmail } from '../api';

interface EmailModalProps {
  isOpen: boolean;
  onClose: () => void;
  scanResult: ScanResponse;
}

type SendState = 'idle' | 'sending' | 'success' | 'error';

export const EmailModal: React.FC<EmailModalProps> = ({ isOpen, onClose, scanResult }) => {
  const [email, setEmail]           = useState('');
  const [name, setName]             = useState('');
  const [sendState, setSendState]   = useState<SendState>('idle');
  const [errorMsg, setErrorMsg]     = useState('');
  const [previewURL, setPreviewURL] = useState<string | null>(null);

  const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const handleSend = async () => {
    if (!isValidEmail) return;
    setSendState('sending');
    setErrorMsg('');
    setPreviewURL(null);

    try {
      const result = await sendResultsByEmail(email, name, scanResult);
      setSendState('success');
      if (result.previewURL) setPreviewURL(result.previewURL);
    } catch (err: unknown) {
      setSendState('error');
      const msg =
        err instanceof Error ? err.message :
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ||
        'Failed to send email. Please try again.';
      setErrorMsg(msg);
    }
  };

  const handleClose = () => {
    onClose();
    // Reset after modal closes
    setTimeout(() => {
      setSendState('idle');
      setEmail('');
      setName('');
      setErrorMsg('');
      setPreviewURL(null);
    }, 300);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm"
            onClick={handleClose}
          />

          {/* Modal */}
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 16 }}
              transition={{ type: 'spring', stiffness: 300, damping: 28 }}
              className="w-full max-w-md bg-gray-900 border border-white/15 rounded-2xl shadow-2xl pointer-events-auto overflow-hidden"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-gradient-to-r from-violet-500/10 to-cyan-500/10">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center">
                    <Mail className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <h2 className="text-white font-semibold text-sm">Email Results</h2>
                    <p className="text-gray-500 text-xs">
                      {scanResult.totalFound} QR code{scanResult.totalFound !== 1 ? 's' : ''} · {scanResult.filename}
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleClose}
                  className="p-1.5 rounded-lg hover:bg-white/10 text-gray-500 hover:text-white transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Body */}
              <div className="p-6">
                <AnimatePresence mode="wait">

                  {/* ── Idle / form ── */}
                  {sendState !== 'success' && (
                    <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">

                      {/* What will be sent */}
                      <div className="bg-white/5 rounded-xl p-3 flex items-start gap-3">
                        <div className="mt-0.5 w-8 h-8 rounded-lg bg-violet-500/20 flex items-center justify-center flex-shrink-0">
                          <Mail className="w-4 h-4 text-violet-400" />
                        </div>
                        <div className="text-xs text-gray-400 leading-relaxed">
                          Email will include a <span className="text-white font-medium">summary</span> of all decoded QR codes and the <span className="text-white font-medium">annotated image</span> as an attachment.
                        </div>
                      </div>

                      {/* Name input */}
                      <div>
                        <label className="block text-xs font-medium text-gray-400 mb-1.5">
                          Recipient Name <span className="text-gray-600">(optional)</span>
                        </label>
                        <div className="relative">
                          <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600 pointer-events-none" />
                          <input
                            type="text"
                            value={name}
                            onChange={e => setName(e.target.value)}
                            placeholder="John Doe"
                            disabled={sendState === 'sending'}
                            className="w-full pl-9 pr-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm placeholder-gray-600
                                       focus:outline-none focus:border-violet-500/60 focus:bg-white/8 transition-colors disabled:opacity-50"
                          />
                        </div>
                      </div>

                      {/* Email input */}
                      <div>
                        <label className="block text-xs font-medium text-gray-400 mb-1.5">
                          Recipient Email <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                          <AtSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600 pointer-events-none" />
                          <input
                            type="email"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && isValidEmail && sendState !== 'sending' && handleSend()}
                            placeholder="recipient@example.com"
                            disabled={sendState === 'sending'}
                            className={`w-full pl-9 pr-3 py-2.5 bg-white/5 border rounded-xl text-white text-sm placeholder-gray-600
                                        focus:outline-none transition-colors disabled:opacity-50
                                        ${email && !isValidEmail
                                          ? 'border-red-500/60 focus:border-red-500'
                                          : 'border-white/10 focus:border-violet-500/60 focus:bg-white/8'
                                        }`}
                          />
                        </div>
                        {email && !isValidEmail && (
                          <p className="mt-1 text-xs text-red-400">Enter a valid email address</p>
                        )}
                      </div>

                      {/* Error */}
                      {sendState === 'error' && (
                        <motion.div
                          initial={{ opacity: 0, y: -4 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="flex items-start gap-2 px-3 py-2.5 bg-red-500/10 border border-red-500/30 rounded-xl text-sm text-red-400"
                        >
                          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                          <span>{errorMsg}</span>
                        </motion.div>
                      )}

                      {/* Buttons */}
                      <div className="flex items-center gap-3 pt-1">
                        <button
                          onClick={handleClose}
                          className="flex-1 btn-secondary text-sm py-2.5"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleSend}
                          disabled={!isValidEmail || sendState === 'sending'}
                          className="flex-1 btn-primary text-sm py-2.5 flex items-center justify-center gap-2"
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
                            <>
                              <Send className="w-4 h-4" />
                              Send Results
                            </>
                          )}
                        </button>
                      </div>
                    </motion.div>
                  )}

                  {/* ── Success ── */}
                  {sendState === 'success' && (
                    <motion.div
                      key="success"
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="text-center py-4 space-y-4"
                    >
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.1 }}
                        className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto"
                      >
                        <CheckCircle className="w-8 h-8 text-green-400" />
                      </motion.div>

                      <div>
                        <h3 className="text-white font-semibold text-base">Email Sent!</h3>
                        <p className="text-gray-400 text-sm mt-1">
                          Results delivered to <span className="text-violet-300 font-medium">{email}</span>
                        </p>
                      </div>

                      {/* Dev mode: Ethereal preview link */}
                      {previewURL && (
                        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 text-left">
                          <p className="text-amber-300 text-xs font-medium mb-1">🧪 Dev Mode — Ethereal Preview</p>
                          <p className="text-amber-400/70 text-xs mb-2">
                            No real email was sent. Click below to preview in Ethereal.
                          </p>
                          <a
                            href={previewURL}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 text-xs text-amber-300 hover:text-amber-200 underline underline-offset-2"
                          >
                            <ExternalLink className="w-3 h-3" />
                            Preview Email in Browser
                          </a>
                        </div>
                      )}

                      <button onClick={handleClose} className="btn-primary text-sm w-full py-2.5">
                        Done
                      </button>
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
