/**
 * 碎甲 Buff 逻辑
 * 每一层碎甲会使目标减少 1 点护甲
 */
BuffSystem.register('armorShred', {
    displayName: '碎甲',
    icon: '💔', // 或者其他你喜欢的 Unicode 图标
    description: '每层减少1点护甲',
    effectTiming: 'continuous', // 持久效果
    durationTiming: 'turnEnd',

    effect: {
        armorBonus: -1 // 持续属性修正
    }
});
