/**
 * 隐蔽 Buff：伤害免疫
 */
BuffSystem.register('invincible', {
    displayName: 'buff_invincible_name',
    icon: '👤',
    description: 'buff_invincible_desc',
    hide: true,
    effectTiming: 'continuous',
    durationTiming: 'opponentTurnEnd', // 时长结算时机：在对手的回合结束时减少
    
    effect: {
        isMiss: true // 移入 effect 对象中
    }
});
