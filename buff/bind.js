BuffSystem.register('bind', {
    displayName: 'buff_bind_name',
    icon: '🕸️',
    description: 'buff_bind_desc',
    effectTiming: 'continuous',
    durationTiming: 'turnEnd',
    effect: {
        canMove: false // 束缚：完全禁止移动逻辑
    }
});