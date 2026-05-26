window.AreaSystem.register('arrowRain', {
    displayName: '箭雨',
    color: 'rgba(255, 165, 0, 0.25)', // 橙色区域
    borderColor: 'rgba(255, 255, 255, 0.4)',
    description: '施放时对中心敌人造成伤害，随后每轮结束对区域内敌人造成伤害',
    
    effectTiming: 'opponentTurnEnd', // 触发时机：对方(非施法者)回合结束
    durationTiming: 'casterTurnEnd', // 时长结算：我方(施法者)回合结束

    effect: {
        // 触发效果：每回合的持续伤害
        onTrigger: (effectRecord, targetStats, targetPos) => {
            const isInArea = effectRecord.tiles.some(t => t.r === targetPos.r && t.c === targetPos.c);
            return isInArea ? { damage: effectRecord.damage, hit: true } : { damage: 0, hit: false };
        }
    }
});
