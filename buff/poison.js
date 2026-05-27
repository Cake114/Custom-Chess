/**
 * 中毒 Buff：每轮结束时触发伤害
 */

BuffSystem.register('poison', {
    displayName: t('buff_poison_name'),
    icon: '🤢',
    description: t('buff_poison_desc'),
    effectTiming: 'turnEnd', // 触发时机：回合结束
    durationTiming: 'turnEnd',

    effect: (stats, stacks) => {
        const dmg = stacks * 1;
        applyDamage(stats, dmg, 'buff_dot');
        if (typeof addLog === 'function') {
            const targetName = (stats === myStats) ? t('log_side_me') : t('log_side_opp');
            addLog(t('log_poison_dmg', targetName, dmg), '#795548');
        }
    }
});