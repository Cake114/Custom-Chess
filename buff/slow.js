window.BuffSystem.register('slow', {
    displayName: t('buff_slow_name'),
    icon: '🐌',
    description: t('buff_slow_desc'),
    priority: 10, // 高优先级：确保在所有增益效果之后结算，以实现强制覆盖
    effectTiming: 'turnStart', // 修正：在回合开始时生效
    durationTiming: 'turnEnd',

    effect: {
        mpOverride: 0, 
        onCheckOverflow: (currentVal, stacks) => false
    }
});
