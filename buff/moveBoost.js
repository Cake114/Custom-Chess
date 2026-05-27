/**
 * 准备 Buff：提供额外移动点
 */

BuffSystem.register('moveBoost', {
    displayName: t('buff_moveBoost_name'),
    icon: '🏃',
    description: t('buff_moveBoost_desc'),
    effectTiming: 'turnStart', // 修正：在回合开始时生效
    durationTiming: 'turnEnd',

    effect: {
        // 属性驱动：每层 Buff 在回合开始时增加 1 点移动点
        mpBonus: 1
    }
});