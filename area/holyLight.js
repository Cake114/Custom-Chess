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
            // 使用 Math.round 确保重合(Overlap)时坐标判定 100% 精确
            const isInArea = effectRecord.tiles && effectRecord.tiles.some(t => 
                Math.round(t.r) === Math.round(targetPos.r) && Math.round(t.c) === Math.round(targetPos.c)
            );
            
            if (isInArea && typeof applyBuffFromSkill === 'function') {
                // 确保使用正确的属性名 'name' 传递来源，并使用 'buffEffects' 数组形式提高兼容性
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