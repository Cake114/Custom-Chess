/**
* 死守不退：瞬间回蓝
*/
SkillSystem.register('standGround', {
    onHit: (targetStats) => {
        // 只有主机权威增加 AP
        if (targetStats === myStats) myActionPoints++; else oppActionPoints++;
        return null;
    }
});