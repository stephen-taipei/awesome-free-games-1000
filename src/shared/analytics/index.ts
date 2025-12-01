/**
 * Google Analytics 4 追蹤模組
 * 用於追蹤遊戲事件
 */

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    dataLayer?: unknown[];
  }
}

export interface GameEventParams {
  game_id: string;
  game_name: string;
  category?: string;
  score?: number;
  level?: number;
  duration?: number;
  achievement_id?: string;
  platform?: string;
  [key: string]: string | number | undefined;
}

class Analytics {
  private initialized = false;
  private measurementId: string | null = null;

  /**
   * 初始化 Google Analytics
   */
  init(measurementId: string): void {
    if (this.initialized || !measurementId) return;

    this.measurementId = measurementId;

    // 載入 gtag.js
    const script = document.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
    document.head.appendChild(script);

    // 初始化 dataLayer
    window.dataLayer = window.dataLayer || [];
    window.gtag = function gtag(...args: unknown[]) {
      window.dataLayer!.push(args);
    };

    window.gtag('js', new Date());
    window.gtag('config', measurementId);

    this.initialized = true;
  }

  /**
   * 追蹤自訂事件
   */
  private trackEvent(eventName: string, params?: GameEventParams): void {
    if (!this.initialized || !window.gtag) {
      console.log(`[Analytics] ${eventName}`, params);
      return;
    }
    window.gtag('event', eventName, params);
  }

  /**
   * 遊戲開始事件
   */
  gameStart(params: Pick<GameEventParams, 'game_id' | 'game_name' | 'category'>): void {
    this.trackEvent('game_start', params);
  }

  /**
   * 遊戲結束事件
   */
  gameEnd(params: Pick<GameEventParams, 'game_id' | 'game_name' | 'score' | 'duration'>): void {
    this.trackEvent('game_end', params);
  }

  /**
   * 關卡完成事件
   */
  levelComplete(params: Pick<GameEventParams, 'game_id' | 'game_name' | 'level' | 'score'>): void {
    this.trackEvent('level_complete', params);
  }

  /**
   * 成就解鎖事件
   */
  achievementUnlock(params: Pick<GameEventParams, 'game_id' | 'game_name' | 'achievement_id'>): void {
    this.trackEvent('achievement_unlock', params);
  }

  /**
   * 分享遊戲事件
   */
  shareGame(params: Pick<GameEventParams, 'game_id' | 'game_name' | 'platform'>): void {
    this.trackEvent('share_game', params);
  }

  /**
   * 自訂事件
   */
  custom(eventName: string, params?: GameEventParams): void {
    this.trackEvent(eventName, params);
  }
}

export const analytics = new Analytics();
export default analytics;
