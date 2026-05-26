/**
 * 中毒 Buff：每轮结束时触发伤害
 */
BuffSystem.register('poison', {
    displayName: '中毒',
    icon: '🤢',
    description: '每层使回合结束时失去1点HP',
    effectTiming: 'turnEnd', // 触发时机：回合结束
    durationTiming: 'turnEnd',

    effect: (stats, stacks) => {
        applyDamage(stats, stacks, 'buff_dot');
        if (typeof addLog === 'function') {
            const targetName = (stats === myStats) ? '我方' : '敌方';
            addLog(`[状态] ${targetName} 因中毒失去 ${stacks} 点生命`, '#795548');
        }
    }
});