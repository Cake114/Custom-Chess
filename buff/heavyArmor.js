BuffSystem.register('heavyArmor', {
    displayName: 'buff_heavyArmor_name',
    icon: '🛡️',
    description: 'buff_heavyArmor_desc',
    effectTiming: 'continuous',
    durationTiming: 'turnEnd',
    effect: {
        armorBonus: 1 // 每层增加1点护甲
    }
});