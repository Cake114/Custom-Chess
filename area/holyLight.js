window.AreaSystem.register('holyLight', {
    displayName: 'area_holyLight_name',
    color: 'rgba(46, 125, 50, 0.3)', // 深绿色区域，与普通 Buff 区分
    borderColor: 'rgba(255, 255, 255, 0.4)',
    description: 'area_holyLight_desc',
    
    effectTiming: 'opponentTurnStart', // 修正：在对方回合开始时施加
    durationTiming: 'casterTurnEnd',

    effect: {
        onTrigger: (effectRecord, targetStats, targetPos) => {
            // 检查目标是否在区域内
            const isInArea = effectRecord.tiles && effectRecord.tiles.some(t => 
                Math.round(t.r) === Math.round(targetPos.r) && Math.round(t.c) === Math.round(targetPos.c)
            );
            
            if (isInArea && typeof applyBuffFromSkill === 'function') {
                // 构造模拟技能对象，确保翻译键 displayName 被正确传递给日志
                const mockSkill = {
                    name: effectRecord.displayName || 'area_holyLight_name',
                    isSecret: false,
                    buffEffects: [{ name: 'weakness', duration: 1, stacks: 6 }]
                };
                applyBuffFromSkill(targetStats, mockSkill);
            }
            return null;
        }
    }
});