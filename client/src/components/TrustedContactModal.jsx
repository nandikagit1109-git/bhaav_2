import React, { useState } from 'react';
import { X, Copy, ExternalLink, Check, ShieldAlert, HeartHandshake } from 'lucide-react';

export default function TrustedContactModal({ isOpen, onClose, contactName = 'Samira' }) {
  const [message, setMessage] = useState(
    `Hey ${contactName || 'there'}, I've had a heavier-than-usual week and could use a little company. Are you free to talk?`
  );
  const [isEditing, setIsEditing] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(message);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  const handleOpenMessaging = () => {
    window.open(`sms:?&body=${encodeURIComponent(message)}`, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink-950/40 backdrop-blur-xs animate-fadeIn">
      <div className="bg-paper-50 rounded-2xl border border-stone-border max-w-md w-full p-6 sm:p-8 shadow-paper-lg space-y-6 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 text-ink-400 hover:text-ink-700 rounded-lg hover:bg-paper-200 transition-colors"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="space-y-1 pr-6">
          <div className="eyebrow text-accent-terracotta flex items-center gap-1.5">
            <HeartHandshake className="w-3.5 h-3.5" />
            <span>OPTIONAL CONNECTION</span>
          </div>
          <h3 className="font-serif text-2xl sm:text-3xl text-ink-950">Reach out on your terms.</h3>
          <p className="text-xs sm:text-sm text-ink-600">
            A gentle pre-drafted message to share with someone you trust when your rhythm feels heavier.
          </p>
        </div>

        {/* The Draft Box */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-ink-500 font-mono">
            <span>PRE-DRAFTED MESSAGE</span>
            <button
              onClick={() => setIsEditing(!isEditing)}
              className="text-ink-700 hover:text-ink-950 underline font-sans text-xs"
            >
              {isEditing ? 'Done editing' : 'Edit message'}
            </button>
          </div>

          {isEditing ? (
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
              className="w-full p-3 bg-paper-100 border border-stone-border rounded-xl text-sm text-ink-900 focus:outline-none focus:ring-1 focus:ring-ink-900 font-sans leading-relaxed"
            />
          ) : (
            <div className="p-4 bg-paper-100 border border-stone-border rounded-xl text-sm text-ink-800 font-serif italic leading-relaxed">
              &ldquo;{message}&rdquo;
            </div>
          )}
        </div>

        {/* Privacy Notice */}
        <div className="p-3.5 bg-accent-sageLight/50 border border-accent-sage/30 rounded-xl flex items-start gap-2.5 text-xs text-accent-sage">
          <ShieldAlert className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>
            <strong>Bhaav never sends this message for you.</strong> You copy, review, and send it yourself only if you choose to.
          </span>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
          <button
            onClick={handleCopy}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-full bg-ink-950 hover:bg-ink-800 text-paper-100 text-xs sm:text-sm font-medium transition-colors"
          >
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            <span>{copied ? 'Copied to clipboard' : 'Copy message'}</span>
          </button>

          <button
            onClick={handleOpenMessaging}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-full border border-ink-900/25 hover:border-ink-900 text-ink-800 text-xs sm:text-sm font-medium transition-colors"
          >
            <ExternalLink className="w-4 h-4 text-ink-600" />
            <span>Open messaging</span>
          </button>
        </div>
      </div>
    </div>
  );
}
