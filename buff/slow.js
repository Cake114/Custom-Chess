window.BuffSystem.register('slow', {
    displayName: '减速',
    icon: '🐌',
    description: '移动点保持0，且回合开始时无法获得溢出点',
    priority: 10, // 高优先级：确保在所有增益效果之后结算，以实现强制覆盖
    effectTiming: 'turnStart', // 修正：在回合开始时生效
    durationTiming: 'turnEnd',

    effect: {
        mpOverride: 0, 
        onCheckOverflow: (currentVal, stacks) => false
    }
});
