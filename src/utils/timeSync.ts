// 时间同步工具：页面加载时从服务器校准一次，后续使用本地时钟 + 偏移量

let timeOffset = 0; // 本地时钟与服务器的偏移（毫秒）
let isSynced = false;

export async function syncTime(): Promise<boolean> {
  if (isSynced) return true;

  try {
    const clientTime1 = Date.now();
    const response = await fetch("/api/time");
    const clientTime2 = Date.now();

    if (!response.ok) throw new Error("Time sync request failed");

    const data = await response.json();
    const serverTime = data.timestamp;

    // 计算往返延迟和时钟偏移
    const roundTrip = clientTime2 - clientTime1;
    const estimatedServerTime = serverTime + roundTrip / 2;
    timeOffset = estimatedServerTime - clientTime2;

    isSynced = true;
    console.log(
      `[TimeSync] 已同步服务器时间，偏移: ${timeOffset}ms，延迟: ${roundTrip}ms`
    );
    return true;
  } catch (error) {
    console.warn("[TimeSync] 时间同步失败，使用本地时间", error);
  }

  return false;
}

export function getNow(): Date {
  return new Date(Date.now() + timeOffset);
}

export function getTimeOffset(): number {
  return timeOffset;
}

export function isSynchronized(): boolean {
  return isSynced;
}
