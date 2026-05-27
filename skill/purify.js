/**
 * 通用净化逻辑脚本
 * 功能：清除目标所有 Buff，并根据清除的种类数量计算额外伤害
 */

SkillSystem.register('purify', {
    onHit: (targetStats, skill, props) => {
        if (!targetStats.activeBuffs || targetStats.activeBuffs.length === 0) {
            return { bonusDamage: 0, purifiedCount: 0 };
        }

        const bonusPerBuff = (props && props.bonusPerBuff) ? props.bonusPerBuff : 0;
        const logKey = (props && props.logKey) ? props.logKey : null;

        // 1. 计算额外伤害：根据 Buff 种类（Set去重）
        const uniqueBuffNames = new Set(targetStats.activeBuffs.map(b => b.name));
        const count = uniqueBuffNames.size;
        const bonus = count * bonusPerBuff;

        // 2. 执行净化：直接修改目标状态
        targetStats.activeBuffs = [];

        return {
            bonusDamage: bonus,
            purifiedCount: count,
            // 如果配置了 logKey，则根据模板生成特定的技能效果日志
            log: (count > 0 && logKey) ? t(logKey, t(skill.name), count, bonus) : null
        };
    }
});