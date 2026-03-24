'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Share, Plus } from 'lucide-react';
import Image from 'next/image';

const DISMISS_KEY = 'pwa-install-dismissed';
const DISMISS_TTL = 7 * 24 * 60 * 60 * 1000; // 7 days

function isDismissed(): boolean {
  const ts = localStorage.getItem(DISMISS_KEY);
  if (!ts) return false;
  return Date.now() - Number(ts) < DISMISS_TTL;
}

function dismiss() {
  localStorage.setItem(DISMISS_KEY, String(Date.now()));
}

function isStandalone(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

function isIOSSafari(): boolean {
  const ua = navigator.userAgent;
  const isIOS = /iphone|ipad|ipod/i.test(ua);
  const isSafari = /safari/i.test(ua) && !/crios|fxios|opios|mercury/i.test(ua);
  return isIOS && isSafari;
}

export default function InstallPrompt() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [androidPrompt, setAndroidPrompt] = useState<any>(null);
  const [showAndroid, setShowAndroid] = useState(false);
  const [showIOS, setShowIOS] = useState(false);

  useEffect(() => {
    if (isStandalone() || isDismissed()) return;

    // Android: capture beforeinstallprompt
    const handler = (e: Event) => {
      e.preventDefault();
      setAndroidPrompt(e);
      setShowAndroid(true);
    };
    window.addEventListener('beforeinstallprompt', handler);

    // iOS Safari: show instructions after 2.5s delay
    let timer: ReturnType<typeof setTimeout> | undefined;
    if (isIOSSafari()) {
      timer = setTimeout(() => setShowIOS(true), 2500);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
      if (timer) clearTimeout(timer);
    };
  }, []);

  function handleAndroidInstall() {
    if (!androidPrompt) return;
    androidPrompt.prompt();
    androidPrompt.userChoice.then(() => {
      setShowAndroid(false);
      dismiss();
    });
  }

  function handleDismiss() {
    setShowAndroid(false);
    setShowIOS(false);
    dismiss();
  }

  return (
    <>
      {/* Android Banner — slides down from top */}
      <AnimatePresence>
        {showAndroid && (
          <motion.div
            initial={{ y: -80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -80, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="fixed top-0 left-0 right-0 z-50 bg-crimson-600 text-white px-4 py-3 flex items-center justify-between shadow-lg"
          >
            <div className="flex items-center gap-3">
              <Image src="/icon.svg" alt="" width={36} height={36} className="rounded-xl" />
              <div>
                <p className="font-bold text-sm leading-tight">Spirit of Santa</p>
                <p className="text-xs text-crimson-100">Add to your home screen</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleAndroidInstall}
                className="bg-white text-crimson-600 text-xs font-bold px-3 py-1.5 rounded-full hover:bg-crimson-50 transition"
              >
                Install
              </button>
              <button
                onClick={handleDismiss}
                aria-label="Dismiss"
                className="text-white/70 hover:text-white transition ml-1"
              >
                <X size={18} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* iOS Safari Banner — slides up from bottom */}
      <AnimatePresence>
        {showIOS && (
          <motion.div
            initial={{ y: 200, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 200, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-slate-200 rounded-t-2xl shadow-2xl px-6 pt-5 pb-8"
          >
            <div className="flex justify-between items-start mb-5">
              <div className="flex items-center gap-3">
                <Image src="/icon.svg" alt="" width={40} height={40} className="rounded-xl" />
                <div>
                  <p className="font-bold text-slate-900 leading-tight">Install Spirit of Santa</p>
                  <p className="text-xs text-slate-500 mt-0.5">Add to your home screen</p>
                </div>
              </div>
              <button
                onClick={handleDismiss}
                aria-label="Dismiss"
                className="text-slate-400 hover:text-slate-700 transition mt-1"
              >
                <X size={18} />
              </button>
            </div>
            <ol className="space-y-3 text-sm text-slate-700">
              <li className="flex items-center gap-3">
                <span className="w-6 h-6 bg-crimson-600 text-white rounded-full flex items-center justify-center text-xs font-bold shrink-0">
                  1
                </span>
                <span>
                  Tap the <Share size={14} className="inline mb-0.5" /> <strong>Share</strong> button in your Safari toolbar
                </span>
              </li>
              <li className="flex items-center gap-3">
                <span className="w-6 h-6 bg-crimson-600 text-white rounded-full flex items-center justify-center text-xs font-bold shrink-0">
                  2
                </span>
                <span>
                  Scroll down and tap <strong>&ldquo;Add to Home Screen&rdquo;</strong>
                </span>
              </li>
              <li className="flex items-center gap-3">
                <span className="w-6 h-6 bg-crimson-600 text-white rounded-full flex items-center justify-center text-xs font-bold shrink-0">
                  3
                </span>
                <span>
                  Tap <Plus size={14} className="inline mb-0.5" /> <strong>Add</strong> in the top-right corner
                </span>
              </li>
            </ol>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
