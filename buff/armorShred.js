/**
 * 碎甲 Buff 逻辑
 * 每一层碎甲会使目标减少 1 点护甲
 */

BuffSystem.register('armorShred', {
    displayName: t('buff_armorShred_name'),
    icon: '💔', 
    description: t('buff_armorShred_desc'),
    effectTiming: 'continuous', 

    effect: {
        armorBonus: -1 // 持续属性修正
    }
});
