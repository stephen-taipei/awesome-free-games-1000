export interface SCP {
  number: string;
  class: 'safe' | 'euclid' | 'keter';
  description: string;
}

export interface SCPTranslation {
  game: {
    title: string;
    subtitle: string;
    power: string;
    containment: string;
    lockdown: string;
    restorePower: string;
    recontain: string;
    start: string;
    scpList: SCP[];
  };
}

export const translations: { en: SCPTranslation; 'zh-TW': SCPTranslation } = {
  en: {
    game: {
      title: 'Containment Breach',
      subtitle: 'Secure. Contain. Protect.',
      power: 'Power',
      containment: 'Containment',
      lockdown: 'LOCKDOWN',
      restorePower: 'RESTORE POWER',
      recontain: 'RECONTAIN',
      start: 'Initialize System',
      scpList: [
        {
          number: 'SCP-173',
          class: 'euclid',
          description: 'Animate concrete sculpture. Extremely hostile. Cannot move while in direct line of sight. Blinks cause movement.'
        },
        {
          number: 'SCP-096',
          class: 'euclid',
          description: 'Humanoid entity. Triggered by viewing its face. Will pursue and terminate viewer regardless of distance.'
        },
        {
          number: 'SCP-049',
          class: 'euclid',
          description: 'Humanoid resembling medieval plague doctor. Touch causes instant death. Believes it is curing "the pestilence."'
        },
        {
          number: 'SCP-682',
          class: 'keter',
          description: 'Large reptilian creature. Extremely hostile and adaptive. Has survived all termination attempts. Must be contained in acid.'
        },
        {
          number: 'SCP-106',
          class: 'keter',
          description: 'Elderly humanoid. Can pass through solid matter. Takes victims to pocket dimension. Corrosive to all materials.'
        },
        {
          number: 'SCP-999',
          class: 'safe',
          description: 'Orange slime creature. Friendly and playful. Contact induces euphoria. Used for therapeutic purposes.'
        }
      ]
    }
  },
  'zh-TW': {
    game: {
      title: '收容突破',
      subtitle: '控制。收容。保護。',
      power: '電力',
      containment: '收容',
      lockdown: '封鎖',
      restorePower: '恢復電力',
      recontain: '重新收容',
      start: '初始化系統',
      scpList: [
        {
          number: 'SCP-173',
          class: 'euclid',
          description: '活動的混凝土雕塑。極度敵意。在直接視線內無法移動。眨眼會導致其移動。'
        },
        {
          number: 'SCP-096',
          class: 'euclid',
          description: '人形實體。觀看其面部會觸發攻擊。無論距離都會追蹤並消滅觀看者。'
        },
        {
          number: 'SCP-049',
          class: 'euclid',
          description: '類似中世紀瘟疫醫生的人形生物。接觸會導致即死。認為自己在治療「瘟疫」。'
        },
        {
          number: 'SCP-682',
          class: 'keter',
          description: '大型爬蟲類生物。極度敵意且具適應性。所有終結嘗試都失敗。必須以酸液收容。'
        },
        {
          number: 'SCP-106',
          class: 'keter',
          description: '老年人形生物。可穿過固體物質。將受害者帶入口袋維度。對所有材料具腐蝕性。'
        },
        {
          number: 'SCP-999',
          class: 'safe',
          description: '橘色黏液生物。友善且愛玩。接觸會引發愉悅感。用於治療目的。'
        }
      ]
    }
  }
};
