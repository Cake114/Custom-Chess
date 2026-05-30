/**
 * 盾兵：死守不退脚本
 * 效果：在消耗所有点数后，重新获得 1 点 AP 供后续操作
 */
SkillSystem.register('standGround', {
    onHit: (targetStats) => {
        if (targetStats === myStats) {
            myActionPoints++;
        } else {
            oppActionPoints++;
        }
        // 返回 null，因为所有状态通过 defender.json 的 buffEffects 施加
        return null;
    }
});