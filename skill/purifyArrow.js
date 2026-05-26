/**
 * 净化箭矢逻辑脚本
 */
SkillSystem.register('purifyArrow', {
    onHit: (targetStats, skill) => {
        if (!targetStats.activeBuffs || targetStats.activeBuffs.length === 0) {
            return { bonusDamage: 0 };
        }

        // 1. 计算额外伤害：根据 Buff 种类（Set去重）
        const uniqueBuffNames = new Set(targetStats.activeBuffs.map(b => b.name));
        const count = uniqueBuffNames.size;
        const bonus = count * 8;

        // 2. 执行净化：直接修改目标状态（副作用逻辑从引擎迁移至此）
        targetStats.activeBuffs = [];

        return {
            bonusDamage: bonus,
            log: `[技能效果] ${skill.name} 净化了 ${count} 种状态，额外造成 ${bonus} 点伤害`
        };
    }
});
