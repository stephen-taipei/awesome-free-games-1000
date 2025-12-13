/**
 * 時間慢動作遊戲多語言翻譯
 */

export const translations = {
  'zh-TW': {
    game: {
      title: '時間慢動作',
      subtitle: '慢動作閃避子彈！',
      newGame: '新遊戲',
      score: '分數',
      best: '最高分',
      energy: '能量',
      gameOver: '遊戲結束',
      tapToStart: '點擊開始',
      tryAgain: '再試一次',
      howToPlay: '遊戲說明',
      howToPlayContent: '移動滑鼠或手指控制角色閃避子彈。按住空白鍵或螢幕啟動慢動作模式。慢動作會消耗能量，放開可以恢復。生存越久分數越高！',
      language: '語言',
      close: '關閉',
      slowMode: '慢動作',
    },
  },
  'zh-CN': {
    game: {
      title: '时间慢动作',
      subtitle: '慢动作闪避子弹！',
      newGame: '新游戏',
      score: '分数',
      best: '最高分',
      energy: '能量',
      gameOver: '游戏结束',
      tapToStart: '点击开始',
      tryAgain: '再试一次',
      howToPlay: '游戏说明',
      howToPlayContent: '移动鼠标或手指控制角色闪避子弹。按住空格键或屏幕启动慢动作模式。慢动作会消耗能量，松开可以恢复。生存越久分数越高！',
      language: '语言',
      close: '关闭',
      slowMode: '慢动作',
    },
  },
  en: {
    game: {
      title: 'Slow Motion',
      subtitle: 'Dodge bullets in slow-mo!',
      newGame: 'New Game',
      score: 'Score',
      best: 'Best',
      energy: 'Energy',
      gameOver: 'Game Over',
      tapToStart: 'Tap to Start',
      tryAgain: 'Try Again',
      howToPlay: 'How to Play',
      howToPlayContent: 'Move mouse or finger to dodge bullets. Hold space or screen to activate slow motion. Slow motion drains energy, release to recharge. Survive longer for higher scores!',
      language: 'Language',
      close: 'Close',
      slowMode: 'Slow-Mo',
    },
  },
  ja: {
    game: {
      title: 'スローモーション',
      subtitle: 'スローモーションで弾を避けろ！',
      newGame: '新しいゲーム',
      score: 'スコア',
      best: 'ベスト',
      energy: 'エネルギー',
      gameOver: 'ゲームオーバー',
      tapToStart: 'タップして開始',
      tryAgain: 'もう一度',
      howToPlay: '遊び方',
      howToPlayContent: 'マウスまたは指を動かして弾を避けます。スペースキーまたは画面を押し続けてスローモーションを発動。スローモーションはエネルギーを消費し、離すと回復します。長く生き残るほど高スコア！',
      language: '言語',
      close: '閉じる',
      slowMode: 'スロー',
    },
  },
  ko: {
    game: {
      title: '슬로우 모션',
      subtitle: '슬로우 모션으로 총알을 피하세요!',
      newGame: '새 게임',
      score: '점수',
      best: '최고점',
      energy: '에너지',
      gameOver: '게임 오버',
      tapToStart: '탭하여 시작',
      tryAgain: '다시 시도',
      howToPlay: '게임 방법',
      howToPlayContent: '마우스나 손가락을 움직여 총알을 피하세요. 스페이스바나 화면을 누르고 있으면 슬로우 모션이 발동됩니다. 슬로우 모션은 에너지를 소모하고, 놓으면 회복됩니다. 오래 생존할수록 높은 점수!',
      language: '언어',
      close: '닫기',
      slowMode: '슬로우',
    },
  },
};

export type TranslationKey = keyof typeof translations['en']['game'];

export default translations;
