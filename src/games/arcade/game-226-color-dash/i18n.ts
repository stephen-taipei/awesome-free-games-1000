/**
 * 色彩衝刺遊戲多語言翻譯
 */

export const translations = {
  'zh-TW': {
    game: {
      title: '色彩衝刺',
      subtitle: '穿越同色障礙，挑戰最高分！',
      newGame: '新遊戲',
      score: '分數',
      best: '最高分',
      gameOver: '遊戲結束',
      tapToStart: '點擊開始',
      tryAgain: '再試一次',
      howToPlay: '遊戲說明',
      howToPlayContent: '控制彩色小球穿越障礙物。只能穿越與小球相同顏色的障礙！收集顏色切換器來改變小球顏色。使用左右方向鍵或滑動來移動。',
      language: '語言',
      close: '關閉',
    },
  },
  'zh-CN': {
    game: {
      title: '色彩冲刺',
      subtitle: '穿越同色障碍，挑战最高分！',
      newGame: '新游戏',
      score: '分数',
      best: '最高分',
      gameOver: '游戏结束',
      tapToStart: '点击开始',
      tryAgain: '再试一次',
      howToPlay: '游戏说明',
      howToPlayContent: '控制彩色小球穿越障碍物。只能穿越与小球相同颜色的障碍！收集颜色切换器来改变小球颜色。使用左右方向键或滑动来移动。',
      language: '语言',
      close: '关闭',
    },
  },
  en: {
    game: {
      title: 'Color Dash',
      subtitle: 'Pass through matching colors!',
      newGame: 'New Game',
      score: 'Score',
      best: 'Best',
      gameOver: 'Game Over',
      tapToStart: 'Tap to Start',
      tryAgain: 'Try Again',
      howToPlay: 'How to Play',
      howToPlayContent: 'Control the colored ball through obstacles. You can only pass through obstacles that match your ball\'s color! Collect color switchers to change your ball\'s color. Use arrow keys or swipe to move.',
      language: 'Language',
      close: 'Close',
    },
  },
  ja: {
    game: {
      title: 'カラーダッシュ',
      subtitle: '同じ色の障害物を通り抜けよう！',
      newGame: '新しいゲーム',
      score: 'スコア',
      best: 'ベスト',
      gameOver: 'ゲームオーバー',
      tapToStart: 'タップして開始',
      tryAgain: 'もう一度',
      howToPlay: '遊び方',
      howToPlayContent: 'カラーボールを操作して障害物を通過します。ボールと同じ色の障害物のみ通過できます！カラースイッチャーを集めてボールの色を変えましょう。矢印キーまたはスワイプで移動します。',
      language: '言語',
      close: '閉じる',
    },
  },
  ko: {
    game: {
      title: '컬러 대시',
      subtitle: '같은 색 장애물을 통과하세요!',
      newGame: '새 게임',
      score: '점수',
      best: '최고점',
      gameOver: '게임 오버',
      tapToStart: '탭하여 시작',
      tryAgain: '다시 시도',
      howToPlay: '게임 방법',
      howToPlayContent: '컬러 볼을 조종하여 장애물을 통과하세요. 볼과 같은 색의 장애물만 통과할 수 있습니다! 컬러 스위처를 수집하여 볼 색상을 변경하세요. 화살표 키 또는 스와이프로 이동합니다.',
      language: '언어',
      close: '닫기',
    },
  },
};

export type TranslationKey = keyof typeof translations['en']['game'];

export default translations;
