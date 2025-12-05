export interface SeanceTranslation {
  game: {
    title: string;
    subtitle: string;
    spiritEnergy: string;
    askQuestion: string;
    start: string;
    questions: string[];
    spirits: { name: string; responses: string[] }[];
    vagueResponses: string[];
    hostileResponses: string[];
    msgs: {
      start: string;
      spiritArrives: string;
      spiritName: string;
      spiritAngry: string;
      seanceEnd: string;
    };
  };
}

export const translations: { en: SeanceTranslation; 'zh-TW': SeanceTranslation } = {
  en: {
    game: {
      title: 'Séance',
      subtitle: 'Communicate with spirits from beyond',
      spiritEnergy: 'Spirit Energy',
      askQuestion: 'Ask the spirits a question...',
      start: 'Begin Séance',
      questions: [
        'Who are you?',
        'Why are you here?',
        'What do you want?',
        'Are you at peace?',
        'Do you have a message?'
      ],
      spirits: [
        {
          name: 'Eleanor',
          responses: [
            'I have been waiting... so long...',
            'The garden... remember the garden...',
            'Tell my daughter... I love her still...',
            'Peace... I seek only peace...'
          ]
        },
        {
          name: 'Marcus',
          responses: [
            'The truth lies beneath the floorboards...',
            'I was betrayed... by one I trusted...',
            'Find the letter... in the attic...',
            'Justice... I need justice...'
          ]
        },
        {
          name: 'The Shadow',
          responses: [
            'You should not have called me...',
            'I see all... I know all...',
            'The veil is thin tonight...',
            'Your time draws near...'
          ]
        }
      ],
      vagueResponses: [
        'The connection fades...',
        '...unclear... try again...',
        'The spirits are restless tonight...',
        'I cannot say more...'
      ],
      hostileResponses: [
        'LEAVE NOW!',
        'You dare disturb my rest?!',
        'I will NOT be questioned!',
        'The candles... watch the candles...'
      ],
      msgs: {
        start: 'The veil between worlds grows thin...',
        spiritArrives: 'A presence approaches...',
        spiritName: '{name} has joined the séance',
        spiritAngry: 'The spirit grows agitated!',
        seanceEnd: 'The connection fades... the séance is complete.'
      }
    }
  },
  'zh-TW': {
    game: {
      title: '降靈會',
      subtitle: '與彼岸的靈魂溝通',
      spiritEnergy: '靈體能量',
      askQuestion: '向靈魂提問...',
      start: '開始降靈',
      questions: [
        '你是誰？',
        '你為何在這裡？',
        '你想要什麼？',
        '你安息了嗎？',
        '你有什麼訊息？'
      ],
      spirits: [
        {
          name: '艾蓮娜',
          responses: [
            '我已經等待...好久了...',
            '花園...記得那個花園...',
            '告訴我的女兒...我依然愛她...',
            '平靜...我只求平靜...'
          ]
        },
        {
          name: '馬庫斯',
          responses: [
            '真相埋在地板下...',
            '我被背叛了...被我信任的人...',
            '找到那封信...在閣樓裡...',
            '正義...我需要正義...'
          ]
        },
        {
          name: '暗影',
          responses: [
            '你不該召喚我...',
            '我看見一切...我知曉一切...',
            '今夜帷幕很薄...',
            '你的時刻將至...'
          ]
        }
      ],
      vagueResponses: [
        '連結正在消退...',
        '...不清楚...再試一次...',
        '今夜靈魂們躁動不安...',
        '我不能再說更多...'
      ],
      hostileResponses: [
        '立刻離開！',
        '你竟敢打擾我的安息？！',
        '我不接受質問！',
        '蠟燭...注意蠟燭...'
      ],
      msgs: {
        start: '世界之間的帷幕正在變薄...',
        spiritArrives: '有東西正在接近...',
        spiritName: '{name} 已加入降靈會',
        spiritAngry: '靈體變得躁動！',
        seanceEnd: '連結正在消退...降靈會結束了。'
      }
    }
  }
};
