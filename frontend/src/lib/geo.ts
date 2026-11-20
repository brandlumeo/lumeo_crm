// Phones (especially iPhones indoors) often report a rough first fix from Wi-Fi/cell towers
// that can be hundreds of metres off, then sharpen within a few seconds once GPS locks.
// Watch the position for a short while and keep the most accurate reading.

export type BestPosition = { latitude: number; longitude: number; accuracy: number };

export function getBestPosition({
  goodEnough = 30,
  maxWaitMs = 12000,
}: { goodEnough?: number; maxWaitMs?: number } = {}): Promise<BestPosition> {
  return new Promise((resolve, reject) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      reject(new Error("unsupported"));
      return;
    }
    let best: BestPosition | null = null;
    let done = false;
    let watchId: number | null = null;

    const finish = (err?: GeolocationPositionError) => {
      if (done) return;
      done = true;
      if (watchId !== null) navigator.geolocation.clearWatch(watchId);
      clearTimeout(timer);
      if (best) resolve(best);
      else reject(err ?? new Error("timeout"));
    };

    const timer = setTimeout(() => finish(), maxWaitMs);

    watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const reading = { latitude: pos.coords.latitude, longitude: pos.coords.longitude, accuracy: pos.coords.accuracy };
        if (!best || reading.accuracy < best.accuracy) best = reading;
        if (reading.accuracy <= goodEnough) finish();
      },
      (err) => {
        // Permission denied is final; other errors may recover while we wait.
        if (err.code === err.PERMISSION_DENIED || best === null) {
          if (err.code === err.PERMISSION_DENIED) finish(err);
        }
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: maxWaitMs },
    );
  });
}

export function locationErrorMessage(err: unknown): string {
  const e = err as GeolocationPositionError | Error | undefined;
  if (e && "code" in e && e.code === 1) {
    return "Location access is blocked. On iPhone: Settings › Privacy & Security › Location Services › Safari Websites › While Using, with Precise Location on. Then reload and try again.";
  }
  if (e instanceof Error && e.message === "unsupported") return "Your browser doesn't support location.";
  return "Couldn't get your location. Step near a window or outside for a moment and try again.";
}
