/**
 * 共用工具函數
 */

/**
 * 格式化數字（加入千分位）
 */
export function formatNumber(num: number): string {
  return num.toLocaleString();
}

/**
 * 格式化時間（秒轉為 mm:ss）
 */
export function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

/**
 * 取得隨機整數 [min, max]
 */
export function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * 陣列洗牌
 */
export function shuffle<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/**
 * 深拷貝
 */
export function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

/**
 * 防抖函數
 */
export function debounce<T extends (...args: unknown[]) => void>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
}

/**
 * 節流函數
 */
export function throttle<T extends (...args: unknown[]) => void>(
  fn: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle = false;
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      fn(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

/**
 * 儲存遊戲資料到 localStorage
 */
export function saveGameData(gameId: string, data: unknown): void {
  try {
    localStorage.setItem(`game_${gameId}`, JSON.stringify(data));
  } catch (e) {
    console.error('Failed to save game data:', e);
  }
}

/**
 * 讀取遊戲資料從 localStorage
 */
export function loadGameData<T>(gameId: string): T | null {
  try {
    const data = localStorage.getItem(`game_${gameId}`);
    return data ? JSON.parse(data) : null;
  } catch (e) {
    console.error('Failed to load game data:', e);
    return null;
  }
}

/**
 * 檢測是否為行動裝置
 */
export function isMobile(): boolean {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

/**
 * 檢測是否支援觸控
 */
export function isTouchDevice(): boolean {
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
}

/**
 * 請求全螢幕
 */
export function requestFullscreen(element: HTMLElement): void {
  if (element.requestFullscreen) {
    element.requestFullscreen();
  }
}

/**
 * 離開全螢幕
 */
export function exitFullscreen(): void {
  if (document.exitFullscreen) {
    document.exitFullscreen();
  }
}
