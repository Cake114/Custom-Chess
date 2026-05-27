/**
 * 中毒 Buff：每轮结束时触发伤害
 */
const POISON_VAL = 1; // 每一层造成的伤害值

BuffSystem.register('poison', {
    displayName: 'buff_poison_name',
    icon: '🤢',
    description: 'buff_poison_desc',
    effectTiming: 'turnEnd', // 触发时机：回合结束
    durationTiming: 'turnEnd',

    effect: (stats, stacks) => {
        const dmg = stacks * POISON_VAL;
        applyDamage(stats, dmg, 'buff_dot');
        const targetSideKey = (stats === myStats) ? 'log_side_me' : 'log_side_opp';
        addLog('log_poison_dmg', [targetSideKey, dmg], '#795548');
    }
});