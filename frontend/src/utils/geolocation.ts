/**
 * Requests the device's real GPS coordinates via the browser's native
 * Geolocation API — free, no API key, requires the user's explicit
 * permission. Used to replace the scripted demo's fixed city coordinate
 * with the citizen's actual real-world location during a live session.
 */
export function getRealDeviceLocation(): Promise<{ lat: number; lng: number }> {
  return new Promise((resolve, reject) => {
    if (!("geolocation" in navigator)) {
      reject(new Error("Geolocation is not supported by this browser."));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => resolve({ lat: position.coords.latitude, lng: position.coords.longitude }),
      (error) => reject(error),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
    );
  });
}
