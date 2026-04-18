"use client";

import { useState, useEffect } from "react";
import { Bidder } from "@/types";
import {
  RegistrationStep,
  VerifyEmailStep,
  loadStoredBidder,
  storeBidder,
} from "@/components/BidForm";

interface RegisterModalProps {
  onComplete: (bidder: Bidder) => void;
  onClose: () => void;
}

export default function RegisterModal({ onComplete, onClose }: RegisterModalProps) {
  const [bidder, setBidder] = useState<Bidder | null>(null);

  useEffect(() => {
    const stored = loadStoredBidder();
    if (stored?.email_verified_at) {
      onComplete(stored);
    } else if (stored) {
      setBidder(stored);
    }
  }, [onComplete]);

  const emailVerified = Boolean(bidder?.email_verified_at);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-md bg-white rounded-sm shadow-2xl animate-slide-up">
        {bidder ? (
          emailVerified ? null : (
            <VerifyEmailStep
              bidder={bidder}
              onVerified={(b) => {
                storeBidder(b);
                setBidder(b);
                onComplete(b);
              }}
              onClose={onClose}
            />
          )
        ) : (
          <RegistrationStep
            onRegistered={(b) => {
              storeBidder(b);
              setBidder(b);
            }}
            onClose={onClose}
          />
        )}
      </div>
    </div>
  );
}
