
export const translations = {
  en: {
    game: {
      title: 'Doomsday',
      subtitle: 'Survive the Apocalypse',
      stats: {
        day: 'Day',
        health: 'Health',
        food: 'Food',
        water: 'Water'
      },
      actions: {
        scavenge: 'Scavenge',
        rest: 'Rest',
        fortify: 'Fortify'
      },
      events: {
        findFood: 'You found some canned beans. (+Food)',
        findWater: 'You found a clean water bottle. (+Water)',
        nothing: 'You found nothing but dust.',
        hurt: 'You tripped and got hurt. (-Health)',
        monster: 'A mutant attacked you! You escaped but got injured. (-Health)',
        rested: 'You rested and recovered some strength. (+Health, -Food, -Water)',
        fortified: 'You fortified your shelter. You feel safer.',
        starve: 'You are starving... (-Health)',
        thirst: 'You are dehydrated... (-Health)'
      },
      gameover: {
        died: 'You died.',
        survived: 'You survived!'
      }
    }
  },
  'zh-TW': {
    game: {
      title: '末日預言',
      subtitle: '末日生存挑戰',
      stats: {
        day: '天數',
        health: '生命',
        food: '食物',
        water: '飲水'
      },
      actions: {
        scavenge: '外出搜索',
        rest: '休息',
        fortify: '強化據點'
      },
      events: {
        findFood: '你找到了一些罐頭豆子。(+食物)',
        findWater: '你找到了一瓶乾淨的水。(+飲水)',
        nothing: '除了灰塵，你什麼也沒找到。',
        hurt: '你跌倒受傷了。(-生命)',
        monster: '變種人攻擊了你！你逃脫了但受了傷。(-生命)',
        rested: '你休息並恢復了一些體力。(+生命, -食物, -飲水)',
        fortified: '你強化了避難所。感覺安全多了。',
        starve: '你快餓死了... (-生命)',
        thirst: '你快渴死了... (-生命)'
      },
      gameover: {
        died: '你死了。',
        survived: '你存活了下來！'
      }
    }
  }
};
