/**
 * 隐蔽 Buff：伤害免疫
 */
BuffSystem.register('invincible', {
    displayName: '隐蔽',
    icon: '👤',
    description: '无法被命中',
    hide: true,
    effectTiming: 'continuous',
    durationTiming: 'opponentTurnEnd', // 时长结算时机：在对手的回合结束时减少
    
    effect: {
        isMiss: true // 移入 effect 对象中
    }
});
