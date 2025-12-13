/**
 * 切割大師遊戲多語言翻譯
 */

export const translations = {
  'zh-TW': {
    game: {
      title: '切割大師',
      subtitle: '滑動切割水果，避開炸彈！',
      newGame: '新遊戲',
      score: '分數',
      best: '最高分',
      combo: '連擊',
      lives: '生命',
      gameOver: '遊戲結束',
      tapToStart: '點擊開始',
      tryAgain: '再試一次',
      howToPlay: '遊戲說明',
      howToPlayContent: '滑動手指或滑鼠來切割飛起的水果。連續切割可獲得連擊獎勵！小心不要切到炸彈，也不要讓水果掉落。每漏掉一個水果會失去一條命。',
      language: '語言',
      close: '關閉',
    },
  },
  'zh-CN': {
    game: {
      title: '切割大师',
      subtitle: '滑动切割水果，避开炸弹！',
      newGame: '新游戏',
      score: '分数',
      best: '最高分',
      combo: '连击',
      lives: '生命',
      gameOver: '游戏结束',
      tapToStart: '点击开始',
      tryAgain: '再试一次',
      howToPlay: '游戏说明',
      howToPlayContent: '滑动手指或鼠标来切割飞起的水果。连续切割可获得连击奖励！小心不要切到炸弹，也不要让水果掉落。每漏掉一个水果会失去一条命。',
      language: '语言',
      close: '关闭',
    },
  },
  en: {
    game: {
      title: 'Slice Master',
      subtitle: 'Slice fruits, avoid bombs!',
      newGame: 'New Game',
      score: 'Score',
      best: 'Best',
      combo: 'Combo',
      lives: 'Lives',
      gameOver: 'Game Over',
      tapToStart: 'Tap to Start',
      tryAgain: 'Try Again',
      howToPlay: 'How to Play',
      howToPlayContent: 'Swipe your finger or mouse to slice the flying fruits. Chain slices for combo bonus! Be careful not to hit bombs or let fruits fall. Each missed fruit costs one life.',
      language: 'Language',
      close: 'Close',
    },
  },
  ja: {
    game: {
      title: 'スライスマスター',
      subtitle: 'フルーツを切って、爆弾を避けよう！',
      newGame: '新しいゲーム',
      score: 'スコア',
      best: 'ベスト',
      combo: 'コンボ',
      lives: 'ライフ',
      gameOver: 'ゲームオーバー',
      tapToStart: 'タップして開始',
      tryAgain: 'もう一度',
      howToPlay: '遊び方',
      howToPlayContent: '指やマウスをスワイプして飛んでくるフルーツを切りましょう。連続で切るとコンボボーナス！爆弾に当たらないように、フルーツを落とさないように注意。フルーツを逃すとライフが減ります。',
      language: '言語',
      close: '閉じる',
    },
  },
  ko: {
    game: {
      title: '슬라이스 마스터',
      subtitle: '과일을 자르고, 폭탄을 피하세요!',
      newGame: '새 게임',
      score: '점수',
      best: '최고점',
      combo: '콤보',
      lives: '생명',
      gameOver: '게임 오버',
      tapToStart: '탭하여 시작',
      tryAgain: '다시 시도',
      howToPlay: '게임 방법',
      howToPlayContent: '손가락이나 마우스를 스와이프하여 날아오는 과일을 자르세요. 연속으로 자르면 콤보 보너스! 폭탄을 치거나 과일을 떨어뜨리지 않도록 주의하세요. 과일을 놓치면 생명이 줄어듭니다.',
      language: '언어',
      close: '닫기',
    },
  },
};

export type TranslationKey = keyof typeof translations['en']['game'];

export default translations;
