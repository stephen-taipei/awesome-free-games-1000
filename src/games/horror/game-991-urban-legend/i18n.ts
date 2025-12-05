export interface Legend {
  title: string;
  icon: string;
  story: string;
  choices: string[];
  correctChoice: number;
  explanation: string;
}

export interface UrbanLegendTranslation {
  game: {
    title: string;
    subtitle: string;
    courage: string;
    survival: string;
    start: string;
    next: string;
    legends: Legend[];
    msgs: {
      start: string;
      correct: string;
      wrong: string;
      win: string;
      lose: string;
    };
  };
}

export const translations: { en: UrbanLegendTranslation; 'zh-TW': UrbanLegendTranslation } = {
  en: {
    game: {
      title: 'Urban Legend',
      subtitle: 'Choose wisely or face the consequences',
      courage: 'Courage',
      survival: 'Survival',
      start: 'Begin Investigation',
      next: 'Next Legend',
      legends: [
        {
          title: 'The Midnight Elevator',
          icon: '🛗',
          story: 'You enter an elevator at midnight. A pale woman in white gets in at the 4th floor. She stares at you without blinking and whispers "Going down?" The elevator shows floor 13, which doesn\'t exist in this building.',
          choices: [
            'Press all the buttons and run out at the next floor',
            'Calmly say "No, I\'m going up" and press a higher floor',
            'Ignore her and keep looking at your phone',
            'Scream for help'
          ],
          correctChoice: 1,
          explanation: 'Never show fear. Spirits feed on it.'
        },
        {
          title: 'The Red Room',
          icon: '🚪',
          story: 'A pop-up appears on your screen: "Do you like the red room?" No matter how many times you close it, it returns. The voice from your speakers asks the same question, getting louder each time.',
          choices: [
            'Unplug your computer immediately',
            'Type "Yes" in response',
            'Close your eyes and say "I do not consent"',
            'Keep clicking the X button'
          ],
          correctChoice: 2,
          explanation: 'Denying consent breaks supernatural contracts.'
        },
        {
          title: 'The Teke-Teke',
          icon: '🔪',
          story: 'Walking home late, you hear a scratching sound behind you. You turn and see a woman dragging herself with her hands - she has no lower body. She\'s moving incredibly fast toward you.',
          choices: [
            'Run as fast as you can',
            'Stand still and close your eyes',
            'Ask her what she wants',
            'Jump over her when she gets close'
          ],
          correctChoice: 3,
          explanation: 'The Teke-Teke cannot turn quickly. Jump over her to escape.'
        },
        {
          title: 'Bloody Mary',
          icon: '🪞',
          story: 'Your friends dare you to say "Bloody Mary" three times in front of a mirror at midnight. You\'ve said it twice. The lights flicker, and you see something moving in the mirror that isn\'t you.',
          choices: [
            'Say it the third time',
            'Break the mirror',
            'Turn on all the lights and leave',
            'Cover the mirror with a cloth'
          ],
          correctChoice: 3,
          explanation: 'Cover the portal before she fully manifests.'
        },
        {
          title: 'The Slit-Mouthed Woman',
          icon: '😷',
          story: 'A woman in a surgical mask approaches you and asks: "Am I beautiful?" You know the legend - if you say yes, she removes her mask revealing a mouth slit ear to ear. If you say no, she kills you.',
          choices: [
            'Say "You\'re average"',
            'Run away immediately',
            'Say "Yes" and hope for the best',
            'Ask "What do you think?"'
          ],
          correctChoice: 0,
          explanation: 'An ambiguous answer confuses her long enough to escape.'
        }
      ],
      msgs: {
        start: 'The investigation begins...',
        correct: 'You survived this encounter!',
        wrong: 'A terrible fate befalls you...',
        win: 'You\'ve become a legendary investigator!',
        lose: 'The legends claimed another victim...'
      }
    }
  },
  'zh-TW': {
    game: {
      title: '都市傳說',
      subtitle: '明智選擇，否則後果自負',
      courage: '勇氣',
      survival: '存活率',
      start: '開始調查',
      next: '下一個傳說',
      legends: [
        {
          title: '午夜電梯',
          icon: '🛗',
          story: '你在午夜進入電梯。一個穿白衣的蒼白女人在4樓進來。她一眨不眨地盯著你，低聲問「要下去嗎？」電梯顯示13樓，但這棟大樓根本沒有13樓。',
          choices: [
            '按下所有按鈕，在下一層跑出去',
            '冷靜地說「不，我要上去」並按更高的樓層',
            '無視她，繼續看手機',
            '大聲呼救'
          ],
          correctChoice: 1,
          explanation: '永遠不要表現出恐懼。靈體以恐懼為食。'
        },
        {
          title: '紅色房間',
          icon: '🚪',
          story: '你的螢幕跳出彈窗：「你喜歡紅色房間嗎？」無論關閉多少次都會再次出現。音響傳出的聲音問著同樣的問題，一次比一次大聲。',
          choices: [
            '立即拔掉電腦插頭',
            '打字回答「是」',
            '閉上眼睛說「我不同意」',
            '繼續點擊X按鈕'
          ],
          correctChoice: 2,
          explanation: '拒絕同意可以打破超自然契約。'
        },
        {
          title: '裂口女',
          icon: '😷',
          story: '一個戴著口罩的女人走向你問：「我漂亮嗎？」你知道這個傳說——如果說是，她會摘下口罩露出裂到耳邊的嘴。如果說不，她會殺了你。',
          choices: [
            '說「你還可以」',
            '立即逃跑',
            '說「是」然後期待最好的結果',
            '反問「你覺得呢？」'
          ],
          correctChoice: 0,
          explanation: '模糊的回答會讓她困惑，足夠讓你逃走。'
        },
        {
          title: '半身女妖',
          icon: '🔪',
          story: '深夜回家的路上，你聽到身後有刮擦聲。轉身看到一個用雙手拖著自己前進的女人——她沒有下半身。她正以驚人的速度向你逼近。',
          choices: [
            '盡全力奔跑',
            '站著不動閉上眼睛',
            '問她想要什麼',
            '等她靠近時跳過她'
          ],
          correctChoice: 3,
          explanation: '半身女妖無法快速轉向。跳過她就能逃脫。'
        },
        {
          title: '血腥瑪麗',
          icon: '🪞',
          story: '朋友們挑戰你在午夜對著鏡子說三次「血腥瑪麗」。你已經說了兩次。燈光閃爍，你在鏡中看到某個不是你的東西在移動。',
          choices: [
            '說出第三次',
            '打破鏡子',
            '打開所有燈然後離開',
            '用布蓋住鏡子'
          ],
          correctChoice: 3,
          explanation: '在她完全現形之前蓋住通道。'
        }
      ],
      msgs: {
        start: '調查開始了...',
        correct: '你在這次遭遇中存活了！',
        wrong: '可怕的命運降臨在你身上...',
        win: '你已成為傳奇調查員！',
        lose: '傳說又收割了一個受害者...'
      }
    }
  }
};
