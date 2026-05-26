/**
 * 准备 Buff：提供额外移动点
 */
BuffSystem.register('moveBoost', {
    displayName: '急速',
    icon: '🏃',
    description: '回合开始时额外获得1个移动点',
    effectTiming: 'turnStart', // 修正：在回合开始时生效
    durationTiming: 'turnEnd',

    effect: {
        // 属性驱动：每层 Buff 在回合开始时增加 1 点移动点
        mpBonus: 1
    }
});