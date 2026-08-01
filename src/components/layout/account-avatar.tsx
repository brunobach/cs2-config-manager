import { useEffect, useState } from "react";
import { UserIcon } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getAvatar, getAvatarUrl } from "@/lib/api";
import { cn, getInitials } from "@/lib/utils";

/** Module-level cache of blob URLs built from local avatar bytes (accountId → object URL). */
const localAvatarCache = new Map<string, string>();

function cacheLocalAvatar(accountId: string, bytes: number[]): string {
  const previous = localAvatarCache.get(accountId);
  if (previous) URL.revokeObjectURL(previous);
  const url = URL.createObjectURL(new Blob([new Uint8Array(bytes)]));
  localAvatarCache.set(accountId, url);
  return url;
}

function dicebearUrl(steamId64: string): string {
  return `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(steamId64)}`;
}

interface AccountAvatarProps {
  accountId: string;
  steamId64: string;
  hasLocalAvatar: boolean;
  className?: string;
  /** Name used for the initials fallback (persona or account name). */
  fallbackLabel?: string;
}

/**
 * Avatar resolution chain: local avatarcache bytes (blob URL, cached per
 * account) → remote Steam profile URL → generated dicebear avatar.
 */
export function AccountAvatar({ accountId, steamId64, hasLocalAvatar, className, fallbackLabel }: AccountAvatarProps) {
  const [src, setSrc] = useState<string | null>(() => (hasLocalAvatar ? (localAvatarCache.get(accountId) ?? null) : null));
  const [loading, setLoading] = useState(src === null);

  useEffect(() => {
    const cached = hasLocalAvatar ? localAvatarCache.get(accountId) : undefined;
    if (cached) {
      setSrc(cached);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    async function resolveSrc(): Promise<string> {
      if (hasLocalAvatar) {
        try {
          const bytes = await getAvatar(accountId);
          if (bytes && bytes.length > 0) return cacheLocalAvatar(accountId, bytes);
        } catch {
          // fall through to the remote URL
        }
      }
      try {
        const remoteUrl = await getAvatarUrl(steamId64);
        if (remoteUrl) return remoteUrl;
      } catch {
        // fall through to the generated avatar
      }
      return dicebearUrl(steamId64);
    }

    void resolveSrc().then((url) => {
      if (cancelled) return;
      setSrc(url);
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [accountId, steamId64, hasLocalAvatar]);

  return (
    <Avatar className={className}>
      {src ? <AvatarImage src={src} alt={fallbackLabel ?? steamId64} /> : null}
      <AvatarFallback className={cn(loading && "animate-pulse")}>
        {fallbackLabel ? getInitials(fallbackLabel) : <UserIcon className="size-4" />}
      </AvatarFallback>
    </Avatar>
  );
}
