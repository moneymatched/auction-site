"use client";

import { useEffect, useState } from "react";
import { formatTimeRemaining } from "@/lib/auction-utils";
import { Clock } from "lucide-react";

interface CountdownTimerProps {
  endTime: string;
  status: string;
  onExpire?: () => void;
  size?: "sm" | "md" | "lg";
  showExtendedBanner?: boolean;
}

export default function CountdownTimer({
  endTime,
  status,
  onExpire,
  size = "md",
  showExtendedBanner = false,
}: CountdownTimerProps) {
  const [timeData, setTimeData] = useState(formatTimeRemaining(endTime));
  const [extendedMinutes, setExtendedMinutes] = useState<number | null>(null);
  const [prevEndTime, setPrevEndTime] = useState(endTime);

  // Detect auto-extension
  useEffect(() => {
    if (endTime !== prevEndTime) {
      const prevEnd = new Date(prevEndTime).getTime();
      const newEnd = new Date(endTime).getTime();
      if (newEnd > prevEnd && showExtendedBanner) {
        const addedMinutes = Math.round((newEnd - prevEnd) / 60000);
        setExtendedMinutes(addedMinutes);
        setTimeout(() => setExtendedMinutes(null), 5000);
      }
      setPrevEndTime(endTime);
    }
  }, [endTime, prevEndTime, showExtendedBanner]);

  useEffect(() => {
    if (status !== "live") return;
    const interval = setInterval(() => {
      const data = formatTimeRemaining(endTime);
      setTimeData(data);
      if (data.seconds === 0 && onExpire) onExpire();
    }, 1000);
    return () => clearInterval(interval);
  }, [endTime, status, onExpire]);

  if (status === "ended" || status === "cancelled") {
    return (
      <span
        className={`font-mono tabular-nums text-stone-400 ${
          size === "lg" ? "text-3xl" : size === "md" ? "text-xl" : "text-sm"
        }`}
      >
        Ended
      </span>
    );
  }

  if (status === "upcoming") {
    return (
      <div className="flex items-center gap-1.5 text-stone-500">
        <Clock size={size === "lg" ? 18 : 14} />
        <span
          className={`font-mono tabular-nums ${
            size === "lg" ? "text-xl" : size === "md" ? "text-base" : "text-sm"
          }`}
        >
          Starts {new Date(endTime).toLocaleDateString()}
        </span>
      </div>
    );
  }

  const colorClass =
    timeData.urgency === "critical"
      ? "text-red-600"
      : timeData.urgency === "warning"
      ? "text-amber-600"
      : "text-stone-900";

  const sizeClass =
    size === "lg"
      ? "text-4xl"
      : size === "md"
      ? "text-2xl"
      : "text-base";

  return (
    <div className="flex flex-col gap-1">
      {extendedMinutes !== null && showExtendedBanner && (
        <div className="animate-fade-in flex items-center gap-2 px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-sm text-amber-700 text-xs font-medium">
          <span>⏱</span>
          <span>Time Extended! Auction extended by {extendedMinutes} minute{extendedMinutes !== 1 ? "s" : ""}.</span>
        </div>
      )}
      <div className="flex items-center gap-2">
        <Clock
          size={size === "lg" ? 20 : size === "md" ? 16 : 14}
          className={timeData.urgency !== "normal" ? colorClass : "text-stone-400"}
        />
        <span
          className={`font-mono tabular-nums font-medium ${colorClass} ${sizeClass} ${
            timeData.urgency === "critical" ? "animate-pulse" : ""
          }`}
        >
          {timeData.display}
        </span>
      </div>
    </div>
  );
}
