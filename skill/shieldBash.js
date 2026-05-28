/**
 * 盾击逻辑：击退与撞墙判定
 */
SkillSystem.register('shieldBash', {
    onHit: (targetStats, skill, props, context) => {
        let dr = 0, dc = 0;
        
        if (context) {
            // 如果有上下文（弹道模式），击退方向由点击方向决定
            dr = context.targetR - context.originR;
            dc = context.targetC - context.originC;
        } else {
            // 传统模式：由双方相对位置决定
            dr = targetStats === oppStats ? (oppPos.r - myPos.r) : (myPos.r - oppPos.r);
            dc = targetStats === oppStats ? (oppPos.c - myPos.c) : (myPos.c - oppPos.c);
        }

        // 归一化方向向量
        if (dr !== 0) dr = dr / Math.abs(dr);
        if (dc !== 0) dc = dc / Math.abs(dc);

        let currentPos = targetStats === oppStats ? oppPos : myPos;
        let finalPos = { ...currentPos };

        // 1. 执行击退逻辑：遇到墙体或边界停下
        for (let i = 0; i < props.knockback; i++) {
            let nextR = finalPos.r + dr;
            let nextC = finalPos.c + dc;

            // 越界或撞墙检查
            if (nextR < 0 || nextR >= 15 || nextC < 0 || nextC >= 15 || mapGrid[nextR][nextC] === 2) break;
            // 水面阻挡检查
            if (mapGrid[nextR][nextC] === 1) break;

            finalPos.r = nextR;
            finalPos.c = nextC;
        }

        // 2. 判定额外伤害：击退停止后，检查“身后”那一格是否是墙体或地图边界
        const behindR = finalPos.r + dr;
        const behindC = finalPos.c + dc;
        const isSlammed = (
            behindR < 0 || behindR >= 15 || behindC < 0 || behindC >= 15 || 
            (mapGrid[behindR] && mapGrid[behindR][behindC] === 2)
        );

        // 更新坐标
        if (targetStats === oppStats) oppPos = finalPos; else myPos = finalPos;

        // 撞墙额外效果
        if (isSlammed) {
            applyBuffFromSkill(targetStats, { buffEffect: { name: 'slow', duration: 1 } });
            return { 
                bonusDamage: props.slamDamage,
                logKey: 'log_shield_bash_slam',
                logArgs: [props.slamDamage]
            };
        }
        return null;
    }
});
