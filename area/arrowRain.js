window.AreaSystem.register('arrowRain', {
    displayName: t('area_arrowRain_name'),
    color: 'rgba(255, 165, 0, 0.25)', // 橙色区域
    borderColor: 'rgba(255, 255, 255, 0.4)',
    description: t('area_arrowRain_desc'),
    
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