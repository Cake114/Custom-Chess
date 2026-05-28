BuffSystem.register('weakness', {
    displayName: 'buff_weakness_name',
    icon: '📉',
    description: 'buff_weakness_desc',
    effectTiming: 'continuous',
    durationTiming: 'turnEnd',
    effect: {
        // 注意：这需要 getSkillFinalDamage 的 attackerStats 逻辑支持，
        // 暂作为标准 Buff 挂载，伤害修正逻辑将在后续核心更新中应用
        damageDealtMod: -1 
    }
});