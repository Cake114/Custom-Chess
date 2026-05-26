const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const statusDiv = document.getElementById('status');
const myIdDisplay = document.getElementById('my-id');
const peerIdInput = document.getElementById('peer-id-input');
const connectBtn = document.getElementById('connect-btn');
const copyBtn = document.getElementById('copy-btn');
const mainMenu = document.getElementById('main-menu');
const gameScreen = document.getElementById('game-screen');
const selectionScreen = document.getElementById('selection-screen');
const returnBtn = document.getElementById('return-btn');
const claimFirstBtn = document.getElementById('claim-first-btn');
const readyBtn = document.getElementById('ready-btn');
const firstPlayerHint = document.getElementById('first-player-hint');
const readyStatusText = document.getElementById('ready-status');
const gameInfoText = document.getElementById('game-info-text');
const endTurnBtn = document.getElementById('end-turn-btn');
const atkModeBtn = document.getElementById('atk-mode-btn');
const roundInfo = document.getElementById('round-info');
const charGroup = document.getElementById('char-group');
const confirmSkillBtn = document.getElementById('confirm-skill-btn');
const debugModeBtn = document.getElementById('debug-mode-btn');

// 战斗日志系统 (移动到顶部确保全局可用)
function addLog(msg, color = '#333', broadcast = true) {
    const logBox = document.getElementById('game-log');
    if (!logBox) return;
    const entry = document.createElement('div');
    entry.className = 'log-entry';
    entry.style.color = color;
    
    const timeTag = `<span class="log-tag" style="color:#888">[轮${currentRound || 0}]</span>`;
    entry.innerHTML = `${timeTag}${msg}`;
    
    logBox.appendChild(entry);
    logBox.scrollTop = logBox.scrollHeight; // 自动滚动到底部

    // 如果是主机且需要广播，则将信息同步给客户端
    if (isHost && broadcast && conn && conn.open) {
        /**
         * 逻辑翻译：
         * 主机看到的“我方” -> 客户端看到的应该是“敌方”
         * 主机看到的“敌方” -> 客户端看到的应该是“我方”
         */
        let clientMsg = msg
            .replace(/我方/g, "TEMP_PLACEHOLDER")
            .replace(/敌方/g, "我方")
            .replace(/TEMP_PLACEHOLDER/g, "敌方");
            
        conn.send({ type: 'log_msg', msg: clientMsg, color: color });
    }
}

// 角色配置：识别子文件夹 characters/ 下以 char_ 开头的文件
// 路径配置
const CHAR_PATH = 'characters/';
const MAP_PATH = 'maps/';
const BUFF_PATH = 'buff/';
const AREA_PATH = 'area/';
const SKILL_PATH = 'skill/';
let AVAILABLE_CHARS = []; // 改为 let，由程序自动识别填充
let AVAILABLE_MAPS = [];
let mapNames = {};

// 游戏配置
const GRID_SIZE = 15;
const PADDING = 40;
const CELL_SIZE = (canvas.width - PADDING * 2) / (GRID_SIZE - 1);

// 游戏状态
let myPos = { r: 0, c: 0 };
let oppPos = { r: 0, c: 0 };
let myStats = { hp: 0, overflow: 0, atkRange: 1 };
let oppStats = { hp: 0, overflow: 0, atkRange: 1 };
let myActionPoints = 0;
let myOverflowPoints = 0;
let oppActionPoints = 0;
let oppOverflowPoints = 0;
let currentRound = 0;
let myColor = null; // 'black' 或 'white'
let currentTurn = 'black'; // 黑棋先行
let mapGrid = []; // 地形数据
let mapBgColor = '#e3c08d';
let isRoundDecDone = false; // 防止单轮内重复结算的标志位
let myMovePoints = 0; // 移动点
let oppMovePoints = 0;

// Buff 系统全局注册表
let mapEffects = []; // 新增：地图区域效果
const buffRegistry = {};
window.BuffSystem = {
    register: (name, config) => { buffRegistry[name] = config; }
};
// 区域系统全局注册表
const areaRegistry = {};
window.AreaSystem = {
    register: (name, config) => { areaRegistry[name] = config; }
};
// 技能逻辑系统全局注册表
const skillRegistry = {};
window.SkillSystem = {
    register: (name, config) => { skillRegistry[name] = config; }
};

let gameActive = false;
let isAtkMode = false; // 是否处于攻击模式
let isDebugMode = false; // 调试模式开关
let selectedSkillIndex = null; // 当前选中的技能索引
let selectedTargetPos = null; // 当前技能预选的目标位置

let peer = null;
let conn = null;
let isHost = false; // 标记当前玩家是否为主机

// 选人相关状态
let mySelectedChar = null; // 默认不选择任何角色
let selectedMapId = 'farmland'; // 默认地图
let firstMoveColor = 'black'; // 当前确定的先手颜色
let amIReady = false;
let isOpponentReady = false;
let opponentChar = null;
let charNames = {}; // 缓存角色 ID 到名称的映射

// 界面切换函数
function showMenu() {
    mainMenu.style.display = 'block';
    gameScreen.style.display = 'none';
    selectionScreen.style.display = 'none';
}

function showGame() {
    mainMenu.style.display = 'none';
    selectionScreen.style.display = 'none';
    gameScreen.style.display = 'flex';
}

function showSelection() {
    mainMenu.style.display = 'none';
    selectionScreen.style.display = 'flex'; // 修正：将 display 设置为 'flex' 以正确应用 Flexbox 布局
    gameScreen.style.display = 'none';
    renderCharButtons();
    renderMapButtons();
}

function renderMapButtons() {
    const mapGroup = document.getElementById('map-group');
    mapGroup.innerHTML = '';
    AVAILABLE_MAPS.forEach(id => {
        const btn = document.createElement('button');
        btn.className = 'map-btn';
        if (selectedMapId === id) btn.classList.add('active');
        btn.innerText = mapNames[id] || id;
        btn.onclick = () => {
            if (amIReady) return; // 准备后禁止更换地图
            selectedMapId = id;
            renderMapButtons();
            if (conn && conn.open) conn.send({ type: 'select_map', mapId: id });
        };
        mapGroup.appendChild(btn);
    });
}

// 动态渲染角色按钮：识别所有在列表中的前缀文件
function renderCharButtons() {
    charGroup.innerHTML = '';
    AVAILABLE_CHARS.forEach(id => {
        const btn = document.createElement('button');
        btn.className = 'char-btn';
        btn.dataset.id = id; // 将英文 ID 存于 dataset 中，用于后续逻辑判断
        if (mySelectedChar === id) btn.classList.add('active');
        btn.innerText = charNames[id] || '读取中...';
        btn.onclick = () => selectChar(id);

        // 悬停请求属性
        btn.onmouseenter = () => {
            if (isHost) {
                displayCharPreview(id);
            } else if (conn && conn.open) { // 确保连接已建立
                conn.send({ type: 'request_char_info', charId: id });
            }
        };
        btn.onmouseleave = () => {
            document.getElementById('char-preview').innerText = '';
        };
        charGroup.appendChild(btn);
    });
}

// 1. 初始化 PeerJS
function initPeer() {
    // 创建 Peer 实例，不传 ID 则由服务器随机生成
    peer = new Peer();

    // 当成功获取到自己的 ID 时触发
    peer.on('open', (id) => {
        myIdDisplay.innerText = id;
    });

    // 监听他人的连接请求 (被动接受者)
    peer.on('connection', (connection) => {
        if (conn) return; // 简单处理：只允许一个连接
        conn = connection;
        isHost = false; // 接受连接者为客户端
        myColor = 'white'; // 被动连接者为白棋
        setupConnection();
    });

    peer.on('error', (err) => {
        console.error(err);
        alert("连接出错: " + err.type);
    });
}

// 2. 发起连接 (主动发起者)
connectBtn.addEventListener('click', () => {
    const peerId = peerIdInput.value.trim();
    if (!peerId) return;

    conn = peer.connect(peerId);
    isHost = true; // 发起连接者为主机
    myColor = 'black'; // 主动发起者为黑棋

    connectBtn.innerText = "正在连接...";
    connectBtn.disabled = true;

    conn.on('open', () => {
        setupConnection();
        // 移除：此时 game-screen 是隐藏的，更新 statusDiv 没有意义。selection-screen 有自己的提示文本。
    });
});

// 3. 设置连接监听
function setupConnection() {
    showSelection();
    resetSelectionState();
    // 仅为主机显示调试模式按钮
    if (isHost) debugModeBtn.style.display = 'inline-block';
    // 如果是主机，在连接建立后向客户端发送同步信号
    if (isHost && conn) {
        conn.send({ type: 'connection_sync', hostId: peer.id });
        preloadGameScripts(); // 主机建立连接后立即预加载所有脚本
    }

    // 监听对方发送的数据
    conn.on('data', (data) => {
        if (data.type === 'action') {
            handleRemoteAction(data);
        } else if (data.type === 'connection_sync') {
            // 接收主机的身份确认
            if (!isHost) {
                console.log("已接收主机连接同步数据");
            }
        } else if (data.type === 'buff_load_request') {
            ensureBuffLoaded(data.buffName);
        } else if (data.type === 'area_load_request') {
            ensureAreaLoaded(data.areaName);
        } else if (data.type === 'claim_first') {
            updateFirstMovePlayer(data.color);
        } else if (data.type === 'log_msg') {
            // 客户端接收主机发来的权威日志
            addLog(data.msg, data.color, false); // false 表示客户端不再回传广播
        } else if (data.type === 'ready_start') {
            isOpponentReady = true;
            opponentChar = data.character;
            // 更新对方准备状态提示
            const hint = document.getElementById('opp-ready-hint');
            if (hint) {
                hint.innerText = "对方状态：已就绪";
                hint.style.color = "#4caf50";
            }
            checkBothReady();
        } else if (data.type === 'request_char_info') {
            // 主机收到查询请求
            getHostCharInfo(data.charId);
        } else if (data.type === 'char_info_res') {
            // 客户端收到查询结果
            const s = data.stats;
            document.getElementById('char-preview').innerText = formatStats(s, ' | ');
        } else if (data.type === 'sync_all_names') {
            charNames = data.names;
            AVAILABLE_CHARS = data.ids; // 同步角色 ID 列表
            renderCharButtons();
        } else if (data.type === 'sync_all_maps') {
            mapNames = data.names;
            AVAILABLE_MAPS = data.ids;
            renderMapButtons();
        } else if (data.type === 'select_map') {
            selectedMapId = data.mapId;
            renderMapButtons();
        } else if (data.type === 'use_skill') {
            if (isHost) {
                // 主机权威处理客户端释放技能：判定伤害、扣除 CD 和 AP
                const skill = oppStats.skills && oppStats.skills[data.skillIndex];
                if (!skill) return;
                const oppColor = (myColor === 'black' ? 'white' : 'black');

                skill.cdCurrent = skill.cdMax;

                // 主机根据客户端选择的目标位置计算受影响区域
                const clientSelectedTargetPos = data.targetPos;
                // 如果是固定范围或自身技能，默认目标为施法者位置；否则使用客户端传来的目标
                const isFixed = skill.rangeType === 'round' || skill.rangeType === 'self';
                const targetR = isFixed ? oppPos.r : (clientSelectedTargetPos ? clientSelectedTargetPos.r : oppPos.r);
                const targetC = isFixed ? oppPos.c : (clientSelectedTargetPos ? clientSelectedTargetPos.c : oppPos.c);

                // 安全校验：检查客户端传来的目标点是否在技能射程内
                if (!isFixed && !checkSkillRange(oppPos.r, oppPos.c, targetR, targetC, skill.range, skill.rangeType)) return;

                // 确定实际影响半径：如果是区域放置，使用 areaRange (1) 生成 3x3；否则使用射程 range
                // 确定实际影响半径和类型：如果是区域放置，使用 areaEffect 定义的半径和类型 (默认 round)
                const isArea = (skill.rangeType === 'area_placement' && skill.areaEffect);
                const effectiveRange = isArea ? skill.areaEffect.areaRange : skill.range;
                const effectiveType = isArea ? (skill.areaEffect.rangeType || 'round') : skill.rangeType;

                const affectedTiles = getAffectedTiles(oppPos.r, oppPos.c, targetR, targetC, effectiveRange, effectiveType);

                // 检查是否命中：只要不是自身技能，且目标在影响范围内即可
                // 初始伤害现在由技能系统统一处理
                const hitHost = (skill.rangeType === 'self') ? false : affectedTiles.some(tile => tile.r === myPos.r && tile.c === myPos.c);

                // 只有精确打击类(line)需要额外的全路径阻挡校验，其他类型在 getAffectedTiles 中已处理障碍
                const losBlocked = (skill.rangeType === 'line') && isPathBlocked(oppPos.r, oppPos.c, targetR, targetC);

                // 处理区域效果同步
                if (isArea) {
                    const areaCfg = skill.areaEffect;
                    const newArea = {
                        name: areaCfg.name, displayName: skill.name, description: skill.effectDesc || skill.desc,
                        duration: areaCfg.duration, damage: areaCfg.damage, tiles: affectedTiles, sourcePlayer: (myColor === 'black' ? 'white' : 'black')
                    };
                    mapEffects.push(newArea);

                    // 日志：敌方放置坐标、范围大小、持续时间
                    const areaSizeDesc = getAreaSizeDescription(areaCfg.areaRange, areaCfg.rangeType);
                    addLog(`[区域] 敌方 施放 ${skill.name} [${targetR},${targetC}] (${areaSizeDesc}, ${areaCfg.duration}轮)`, '#d32f2f');
                    
                    // 调用区域 onStart 效果
                    const areaLogic = areaRegistry[areaCfg.name];
                    if (areaLogic && areaLogic.effect && typeof areaLogic.effect.onStart === 'function') {
                        areaLogic.effect.onStart(newArea, myStats, myPos);
                    }
                }

                if (!skill.isSecret) {
                    addLog(`[技能] 敌方 释放了技能 [${skill.name}]`, '#d32f2f');
                }

                // 修正：增加命中校验。如果目标处于“无法命中”状态，则不产生伤害和 Buff
                if (hitHost && !losBlocked) {
                    const isMiss = myStats.activeBuffs && myStats.activeBuffs.some(b => buffRegistry[b.name]?.effect?.isMiss);
                    if (!isMiss) {
                        const armor = calculateArmor(myStats);
                        let finalDmg = getSkillFinalDamage(skill, myStats);

                        // 灵活脚本逻辑：处理客户端（对手）释放的技能脚本
                        const logic = skillRegistry[skill.script];
                        if (logic && typeof logic.onHit === 'function') {
                            const result = logic.onHit(myStats, skill);
                            if (result && result.bonusDamage) finalDmg += result.bonusDamage;
                            if (result && result.log) addLog(result.log, '#9c27b0');
                        }

                        applyDamage(myStats, finalDmg, 'skill');
                        if (!skill.isSecret) {
                            addLog(`[命中] 技能命中！我方 受到 ${finalDmg} 点伤害 (护甲抵扣: ${armor})`);
                        }
                        applyBuffFromSkill(myStats, skill);
                    } else if (!skill.isSecret) {
                        addLog(`[闪避] 技能被 我方 闪避了！`, '#666');
                    }
                }
                // 核心修改：技能不对释放者生效（除非是明确的自身强化技能 rangeType: self）
                const hitClient = (skill.rangeType === 'self');
                if (hitClient) {
                    applyBuffFromSkill(oppStats, skill);
                }

                // 冲刺位移同步：主机更新客户端位置
                if (skill.rangeType === 'rush' && affectedTiles.length > 0) {
                    oppPos = affectedTiles[affectedTiles.length - 1];
                }

                if (skill.consumeTurn) {
                    oppActionPoints = 0;
                    oppMovePoints = 0; // 消耗回合技能应清空所有点数
                    settleMapEffects(oppColor);
                    currentTurn = myColor;
                    startMyTurn();
                } else {
                    oppActionPoints--;
                    if (oppActionPoints <= 0 && oppMovePoints <= 0) {
                        settleMapEffects(oppColor);
                        currentTurn = myColor;
                        startMyTurn();
                    } else {
                        sendState('state_sync');
                    }
                    drawCharacters(); // 确保主机屏幕也能实时刷新
                }
            } else {
                // 客户端同步主机的技能 CD
                oppStats.skills[data.skillIndex].cdCurrent = oppStats.skills[data.skillIndex].cdMax;
            }
            drawCharacters(); updateHPDisplay();
            selectedTargetPos = null; // 客户端收到同步后清除目标
        }
    });

    conn.on('close', () => {
        // 确保在断开连接时清理所有技能相关的选中状态
        selectedSkillIndex = null;
        selectedTargetPos = null;
        isAtkMode = false;
        conn = null;
        alert("对方已断开连接");
        showMenu();
    });

    conn.on('error', (err) => {
        // 确保在连接出错时清理所有技能相关的选中状态
        selectedSkillIndex = null;
        selectedTargetPos = null;
        isAtkMode = false;
        conn = null;
        alert("连接出错");
        showMenu();
    });

    refreshCharNames();
    refreshMapNames();
}

// 通用目录扫描函数：利用 Live Server 的索引页面自动获取文件列表
// GitHub API 基础路径
const GITHUB_API_BASE = 'https://api.github.com/repos/Cakemay/Custom-Chess/contents/';

/**
 * 替代你原有的 scanDirectory
 * @param {string} path - 文件夹名称，如 'buff/'
 */
async function scanDirectory(path, extension) {
    console.log(`正在从 GitHub 获取 ${path} 的文件列表...`);
    try {
        // 请求 GitHub API 获取目录内容
        const response = await fetch(GITHUB_API_BASE + path.replace(/\/$/, ''));
        const files = await response.json();

        // 过滤出指定后缀的文件名
        return files
            .filter(file => file.name.endsWith(extension))
            .map(file => file.name);
    } catch (error) {
        console.error(`获取 ${path} 失败:`, error);
        return []; // 出错时返回空数组，防止程序崩溃
    }
}

// 自动加载所有 Buff 和 区域效果脚本
async function preloadGameScripts() {
    if (!isHost) return;
    console.log("开始自动扫描并预加载所有游戏脚本...");
    
    const buffs = await scanDirectory(BUFF_PATH, '.js');
    buffs.forEach(name => ensureBuffLoaded(name));

    const areas = await scanDirectory(AREA_PATH, '.js');
    areas.forEach(name => ensureAreaLoaded(name));

    const skills = await scanDirectory(SKILL_PATH, '.js');
    skills.forEach(name => ensureSkillLoaded(name));
}

// 调试模式切换逻辑
debugModeBtn.addEventListener('click', () => {
    isDebugMode = !isDebugMode;
    debugModeBtn.innerText = `调试模式: ${isDebugMode ? '开' : '关'}`;
    debugModeBtn.style.backgroundColor = isDebugMode ? '#4caf50' : '#607d8b';
});

// 主机负责读取所有角色名称并同步给客户端
async function refreshCharNames() {
    if (!isHost) return;
    try {
        const ids = await scanDirectory(CHAR_PATH, '.json');

        // 3. 获取每个角色的真实名称
        AVAILABLE_CHARS = [];
        for (const id of ids) {
            try {
                const resp = await fetch(`${CHAR_PATH}${id}.json?t=${Date.now()}`);
                const data = await resp.json();
                charNames[id] = data.name || id;
                AVAILABLE_CHARS.push(id);
            } catch (e) { console.error(e); }
        }

        // 4. 按角色名称的拼音/字母首字母排序 (localeCompare 支持中文)
        AVAILABLE_CHARS.sort((a, b) => charNames[a].localeCompare(charNames[b], 'zh-Hans-CN'));

        renderCharButtons();

        // 5. 同步给客户端
        if (conn && conn.open) {
            conn.send({ type: 'sync_all_names', names: charNames, ids: AVAILABLE_CHARS });
        }
    } catch (e) {
        console.error("自动识别角色卡失败，请确保 Live Server 已开启目录浏览:", e);
    }
}

// 主机负责扫描地图文件夹
async function refreshMapNames() {
    if (!isHost) return;
    try {
        const ids = await scanDirectory(MAP_PATH, '.json');

        AVAILABLE_MAPS = [];
        for (const id of ids) {
            try {
                const resp = await fetch(`${MAP_PATH}${id}.json?t=${Date.now()}`);
                const data = await resp.json();
                mapNames[id] = data.name || id;
                AVAILABLE_MAPS.push(id);
            } catch (e) { console.error(e); }
        }
        renderMapButtons();
        if (conn && conn.open) {
            conn.send({ type: 'sync_all_maps', names: mapNames, ids: AVAILABLE_MAPS });
        }
    } catch (e) {
        console.error("识别地图失败:", e);
    }
}

// 主机查询本地 JSON 并发回
async function getHostCharInfo(charId) {
    try {
        const resp = await fetch(`${CHAR_PATH}${charId}.json?t=${Date.now()}`);
        const data = await resp.json();
        conn.send({ type: 'char_info_res', stats: { ...data, name: data.name || data.id } }); // 确保发送 name
    } catch (e) { }
}

async function displayCharPreview(charId) {
    try {
        const resp = await fetch(`${CHAR_PATH}${charId}.json?t=${Date.now()}`);
        const data = await resp.json();
        document.getElementById('char-preview').innerText = formatStats(data, ' | ');
    } catch (e) { }
}

// 通用的属性格式化函数，方便统一维护顺序
function formatStats(s, sep) {
    const max = parseInt(s.overflow) || 0;
    const overflowStr = max > 0 ? max : "0 (不可用)";
    let lines = [
        `名称: ${s.name || s.id}`,
        `生命: ${s.hp || 100}`,
        `溢出需求: ${overflowStr}`,
        `攻击: ${s.atkDmg || 20}`,
        `攻击距离: ${s.atkRange || 1}`
    ];

    if (s.skills && s.skills.length > 0) {
        s.skills.forEach((skill, index) => {
            const desc = skill.desc || "无描述";
            const cdInfo = `(CD: ${skill.cdCurrent !== undefined ? skill.cdCurrent : 0}/${skill.cdMax})`;
            const typeInfo = skill.consumeTurn ? "结束回合" : "消耗1点AP";
            lines.push(`\n技能${index + 1}: ${skill.name} ${cdInfo} [${typeInfo}]`);
            lines.push(`   - 描述: ${desc}`);
            lines.push(`   - 范围: ${skill.rangeDesc || "无"}`);
            lines.push(`   - 效果: ${skill.effectDesc || "无"}`);
        });
    }

    return lines.join(sep);
}

window.selectChar = function (char) {
    if (amIReady) return; // 准备后禁止更换角色

    if (mySelectedChar === char) {
        mySelectedChar = null; // 再次点击已选角色则取消选择
    } else {
        mySelectedChar = char;
        displayCharPreview(char); // 选中时显示预览
    }

    document.querySelectorAll('.char-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.id === mySelectedChar);
    });

    // 更新准备按钮状态
    if (!mySelectedChar) {
        readyBtn.disabled = true;
        readyBtn.innerText = "请选择角色";
        document.getElementById('char-preview').innerText = '';
    } else {
        readyBtn.disabled = false;
        readyBtn.innerText = "准备并开始";
    }
};

function resetSelectionState() {
    amIReady = false;
    isOpponentReady = false;
    firstMoveColor = 'black';
    isDebugMode = false; // 重置调试模式

    // 初始设为未选择状态
    mySelectedChar = null;
    readyBtn.disabled = true;
    readyBtn.innerText = "请选择角色";

    if (debugModeBtn) {
        debugModeBtn.innerText = "调试模式: 关";
        debugModeBtn.style.backgroundColor = "#607d8b";
        debugModeBtn.style.display = 'none';
    }
    readyStatusText.innerText = "等待双方点击开始...";

    // 重置对方状态提示
    const hint = document.getElementById('opp-ready-hint');
    if (hint) {
        hint.innerText = "对方状态：未准备";
        hint.style.color = "#f44336";
    }

    updateFirstMoveUI();
    document.querySelectorAll('.char-btn').forEach(btn => btn.classList.remove('active'));
}

claimFirstBtn.addEventListener('click', () => {
    if (amIReady) return; // 准备后禁止更换先后手
    updateFirstMovePlayer(myColor);
    if (conn) conn.send({ type: 'claim_first', color: myColor });
});

function updateFirstMovePlayer(color) {
    firstMoveColor = color;
    updateFirstMoveUI();
}

function updateFirstMoveUI() {
    const name = firstMoveColor === myColor ? "我方" : "敌方";
    firstPlayerHint.innerText = `当前先手：${name}`;
}

readyBtn.addEventListener('click', () => {
    amIReady = true;
    readyBtn.disabled = true;
    readyBtn.innerText = "已准备，等待对方...";
    if (conn) conn.send({ type: 'ready_start', character: mySelectedChar });
    checkBothReady();
});

function checkBothReady() {
    if (amIReady && isOpponentReady) {
        showGame();
        startGame();
    } else if (isOpponentReady) {
        readyStatusText.innerText = "对方已就绪！";
    }
}

async function startGame() {
    if (!isHost) return; // 客户端不读取角色卡，由主机读取后下发

    if (!mySelectedChar || !opponentChar) {
        alert("角色选择数据异常，请重新选择");
        return;
    }

    const loadChar = async (id) => {
        try {
            const resp = await fetch(`${CHAR_PATH}${id}.json?t=${Date.now()}`);
            if (!resp.ok) throw new Error(`文件不存在`);
            const data = await resp.json();
            return {
                ...data, // 包含角色卡中定义的所有属性
                name: data.name || data.id,
                id: String(data.id || id),
                hp: Number(data.hp) || 100,
                overflow: Number(data.overflow) || 0,
                armor: 0, // 初始化护甲为 0
                activeBuffs: [], // 初始化 Buff 列表
                atkRange: Number(data.atkRange) || 1,
                atkRangeType: data.atkRangeType || 'line', // 默认为直线(line)
                atkDmg: Number(data.atkDmg) || 20,
                skills: (data.skills || [
                    { name: "未命名技能1", cdMax: 3 },
                    { name: "未命名技能2", cdMax: 3 },
                    { name: "未命名技能3", cdMax: 3 }
                ]).map(s => ({ 
                    ...s, 
                    cdCurrent: 0,
                    cdMax: Number(s.cdMax) || 0,
                    damage: s.damage || 0
                }))
            };
        } catch (e) {
            console.error(`加载角色 ${id} 失败:`, e);
            return { id: id, hp: 100, overflow: 0, skills: [] };
        }
    };

    // 主机负责读取双方角色卡
    myStats = await loadChar(mySelectedChar);
    oppStats = await loadChar(opponentChar);

    // 主机读取地图文件
    try {
        const mResp = await fetch(`${MAP_PATH}${selectedMapId}.json?t=${Date.now()}`);
        if (!mResp.ok) throw new Error("地图文件读取失败");
        const mData = await mResp.json();
        mapGrid = mData.grid;
        mapBgColor = mData.bgColor || '#e3c08d';
    } catch (e) {
        console.error("读取地图失败:", e);
        mapGrid = Array(15).fill().map(() => Array(15).fill(0));
    }

    // 核心修复：先同步初始状态给客户端，再启动本地回合逻辑，防止客户端卡死
    sendState('init_sync', {
        charInfo: { host: mySelectedChar, client: opponentChar },
        firstMoveColor: firstMoveColor,
        mapData: { grid: mapGrid, bgColor: mapBgColor }
    });

    resetGame();
}

// 切换攻击/移动模式
atkModeBtn.addEventListener('click', () => {
    isAtkMode = !isAtkMode;

    // 切换任何模式都应取消当前的技能预选状态，确保逻辑清晰
    selectedSkillIndex = null;
    selectedTargetPos = null; // 切换模式时清除目标
    drawCharacters();
    updateHPDisplay(); // 更新按钮状态
});

function resetMode() {
    isAtkMode = false;
    atkModeBtn.innerText = "移动模式";
    atkModeBtn.style.backgroundColor = "#ff5722";
}

function renderSkillButtons() {
    const skillGroup = document.getElementById('skill-group');
    skillGroup.innerHTML = '';
    const isMyTurn = (gameActive && currentTurn === myColor);

    if (!myStats.skills) return;

    myStats.skills.forEach((skill, index) => {
        const btn = document.createElement('button');
        btn.style.height = '45px';
        let btnText = skill.name;
        if (skill.cdCurrent > 0) btnText += ` (${skill.cdCurrent})`;
        btn.innerText = btnText;

        const isSelected = selectedSkillIndex === index;

        if (!isMyTurn || (skill.cdCurrent > 0 && !isSelected)) {
            btn.disabled = true;
            btn.style.backgroundColor = '#ccc';
        } else {
            btn.style.backgroundColor = isSelected ? '#4caf50' : '#9c27b0';
            btn.onclick = () => useSkill(index);
        }
        skillGroup.appendChild(btn);
    });
}

function updateHPDisplay() {
    // 格式化显示：处理数值类型并显示进度
    const isMyTurn = (gameActive && currentTurn === myColor);

    const myMax = myStats.overflow;
    const oppMax = oppStats.overflow;

    const myOverflowText = myMax > 0 ? `${myOverflowPoints}/${myMax}` : "0 (不可用)";
    const oppOverflowText = oppMax > 0 ? `${oppOverflowPoints}/${oppMax}` : "0 (不可用)";
    const myMVText = myMovePoints > 0 ? ` + 🏃${myMovePoints}` : "";
    
    const myColorName = myColor === 'black' ? '蓝色' : '红色';
    const myText = `我方(${myColorName}): ${myStats.name || myStats.id} (HP:${myStats.hp} 溢出:${myOverflowText}${myMVText})`;
    const oppText = `敌方: ${oppStats.name || oppStats.id} (HP:${oppStats.hp} 溢出:${oppOverflowText})`;

    gameInfoText.innerText = `${myText} | ${oppText}`;
    roundInfo.innerText = `第 ${currentRound} 轮`;

    // 更新左侧下拉详情面板
    document.getElementById('my-details-content').innerText = formatStats(myStats, '\n');
    document.getElementById('opp-details-content').innerText = formatStats(oppStats, '\n');

    // 更新状态栏显示（包含当前护甲和 Buff 列表）
    const renderBuffs = (stats, isMe) => {
        const mp = isMe ? myMovePoints : oppMovePoints;
        let html = `
            <div class="status-stat">🛡️ 护甲: ${calculateArmor(stats)}</div>
            <div class="status-stat">🏃 移动点: ${mp}</div>
        `;
        if (stats.activeBuffs && stats.activeBuffs.length > 0) {
            stats.activeBuffs.forEach(b => {
                const buffConfig = buffRegistry[b.name];
                // 如果是隐藏 Buff 且当前渲染的是敌人状态，则跳过
                if (!isMe && buffConfig && buffConfig.hide) return;

                const displayName = buffConfig ? buffConfig.displayName : b.name;
                const icon = buffConfig ? buffConfig.icon : '✨';
                // 使用 displayName 和 icon，添加类名以便识别悬停
                html += `<div class="buff-item" data-buff-name="${b.name}" style="color: #d32f2f; font-size: 0.9em; margin-top:3px; cursor: help;">${icon} ${displayName} x${b.stacks} (${b.duration}轮)</div>`;
            });
        }
        return html;
    };
    document.querySelector('#my-status-col .status-list').innerHTML = renderBuffs(myStats, true);
    document.querySelector('#opp-status-col .status-list').innerHTML = renderBuffs(oppStats, false);

    // 处理 Buff 悬停描述逻辑
    const tip = document.getElementById('buff-desc-tip');
    document.querySelectorAll('.buff-item').forEach(el => {
        el.onmouseenter = () => {
            const name = el.dataset.buffName;
            const config = buffRegistry[name];
            if (config && config.description) {
                tip.innerText = `${config.displayName}: ${config.description}`;
                tip.style.display = 'block';
            }
        };
        el.onmouseleave = () => { tip.style.display = 'none'; };
    });

    // 更新按钮状态：非我方回合时禁用并暗色处理，保持布局稳定
    // 预检技能释放条件，用于控制确定按钮状态
    const selectedSkill = (selectedSkillIndex !== null) ? myStats.skills[selectedSkillIndex] : null;
    const isFixedRange = selectedSkill && (selectedSkill.rangeType === 'round' || selectedSkill.rangeType === 'self');
    const hasAP = selectedSkill && (selectedSkill.consumeTurn || myActionPoints >= 1); // 检查AP是否足够
    const hasTarget = selectedSkill && (isFixedRange || selectedTargetPos !== null); // 必须有目标位置（包含自动锁定的自身）

    endTurnBtn.disabled = !isMyTurn;
    endTurnBtn.style.backgroundColor = isMyTurn ? '#2196f3' : '#ccc';

    atkModeBtn.disabled = !isMyTurn;

    // 更新模式按钮的文字和颜色
    if (isMyTurn) {
        atkModeBtn.innerText = isAtkMode ? "攻击模式" : "移动模式";
        atkModeBtn.style.backgroundColor = isAtkMode ? "#f44336" : "#ff5722";
    } else {
        atkModeBtn.innerText = "移动模式";
        atkModeBtn.style.backgroundColor = '#ccc';
    }

    // 更新技能确定按钮状态
    if (isMyTurn && selectedSkillIndex !== null) {
        confirmSkillBtn.style.display = 'block';
        confirmSkillBtn.disabled = !(hasAP && hasTarget); // AP足够且已选择目标（指向性）或自动拥有目标（固定范围）
        confirmSkillBtn.style.backgroundColor = confirmSkillBtn.disabled ? '#ccc' : '#4caf50';
    } else {
        confirmSkillBtn.style.display = isMyTurn ? 'block' : 'none';
        confirmSkillBtn.disabled = true;
        confirmSkillBtn.style.backgroundColor = '#ccc';
    }

    renderSkillButtons();
}

function useSkill(index) {
    if (currentTurn !== myColor || !gameActive) return;

    if (selectedSkillIndex === index) {
        selectedSkillIndex = null; // 再次点击取消
        selectedTargetPos = null; // 清除目标
    } else {
        const skill = myStats.skills[index];
        if (skill.cdCurrent > 0) return;
        selectedSkillIndex = index; // 切换/选择技能
        isAtkMode = false; // 选择技能时关闭普攻模式

        // 如果是固定范围类型（周身范围或自身），自动选择当前位置为目标
        if (skill.rangeType === 'self') { // 只有 self 类型才自动选择自身
            selectedTargetPos = { r: myPos.r, c: myPos.c };
        } else {
            selectedTargetPos = null; // 否则清除目标等待玩家点击棋盘
        }
    }

    drawCharacters();
    updateHPDisplay();
}

// 正式释放技能的逻辑
confirmSkillBtn.addEventListener('click', () => {
    if (selectedSkillIndex === null || !gameActive) return;

    const index = selectedSkillIndex;
    const skill = myStats.skills[index];

    // 2. 设置 CD (只要技能被确认释放，就进入冷却)
    skill.cdCurrent = skill.cdMax;

    // 1. 本地预执行伤害判定：基于选定的目标位置 (支持空放)
    const targetR = selectedTargetPos ? selectedTargetPos.r : myPos.r;
    const targetC = selectedTargetPos ? selectedTargetPos.c : myPos.c;

    // 核心修改：计算影响范围时，如果是区域放置类，应使用效果半径 (areaRange) 而非选点射程 (range)
    const effectiveRange = (skill.rangeType === 'area_placement' && skill.areaEffect) 
        ? skill.areaEffect.areaRange 
        : skill.range;

    const affectedTiles = getAffectedTiles(myPos.r, myPos.c, targetR, targetC, effectiveRange, skill.rangeType);
    // 修正：初始伤害由技能系统统一处理，不再排除 area_placement
    const hitOpponent = (skill.rangeType === 'self') ? false : affectedTiles.some(tile => tile.r === oppPos.r && tile.c === oppPos.c);

    // 精确打击(line)若路径被挡则完全失效；冲刺和穿透在 getAffectedTiles 内部处理部分截断
    const losBlocked = (skill.rangeType === 'line') && isPathBlocked(myPos.r, myPos.c, targetR, targetC);

    if (isHost && !skill.isSecret) {
        addLog(`[技能] 我方 施放了 [${skill.name}]`, '#9c27b0');
    }

    // 处理区域效果 (如箭雨)
    if (skill.areaEffect) {
        const areaEffectConfig = skill.areaEffect;
        ensureAreaLoaded(areaEffectConfig.name);
        
        const newArea = {
            name: areaEffectConfig.name,
            displayName: skill.name,
            description: skill.effectDesc || skill.desc,
            duration: areaEffectConfig.duration,
            damage: areaEffectConfig.damage,
            tiles: affectedTiles,
            sourcePlayer: myColor // 标记是谁施放的区域效果
        };
        mapEffects.push(newArea);

        addLog(`[区域] 我方 施放了 ${skill.name}，持续 ${areaEffectConfig.duration} 轮`, '#9c27b0');

        // 调用区域 onStart 效果
        const areaLogic = areaRegistry[areaEffectConfig.name];
        if (areaLogic && areaLogic.effect && typeof areaLogic.effect.onStart === 'function') {
            areaLogic.effect.onStart(newArea, oppStats, oppPos);
        }
    }

    // 修正：命中校验。只有未处于隐蔽状态的目标才会受伤和染上 Buff
    if (hitOpponent && !losBlocked) {
        const isMiss = oppStats.activeBuffs && oppStats.activeBuffs.some(b => buffRegistry[b.name]?.effect?.isMiss);
        if (!isMiss) {
            const armor = calculateArmor(oppStats);
                        let finalDmg = getSkillFinalDamage(skill, oppStats);

                        // 灵活脚本逻辑：检查是否有对应的技能脚本处理特殊效果
                        const logic = skillRegistry[skill.script];
                        if (logic && typeof logic.onHit === 'function') {
                            const result = logic.onHit(oppStats, skill);
                            if (result && result.bonusDamage) finalDmg += result.bonusDamage;
                            if (result && result.log) addLog(result.log, '#9c27b0');
            }

            applyDamage(oppStats, finalDmg, 'skill');
            if (isHost && !skill.isSecret) {
                addLog(`[命中] 敌方 受到 ${finalDmg} 点有效伤害 (已扣除护甲值: ${armor})`);
            }
            applyBuffFromSkill(oppStats, skill);
        } else if (isHost && !skill.isSecret) {
            addLog(`[闪避] 目标身形变幻，成功避开了本次技能打击！`, '#666');
        }
    }
    
    // 核心修改：技能不对释放者生效（除非是明确的自身强化技能 rangeType: self）
    const hitMe = (skill.rangeType === 'self');
    if (hitMe) {
        applyBuffFromSkill(myStats, skill);
    }

    // 冲刺位移：更新我方位置到路径终点
    if (skill.rangeType === 'rush' && affectedTiles.length > 0) {
        myPos = affectedTiles[affectedTiles.length - 1];
    }

    const lastTarget = selectedTargetPos; // 记录目标以便同步
    selectedSkillIndex = null;
    selectedTargetPos = null; // 释放后清除目标

    // 3. 同步
    if (conn && conn.open) conn.send({ type: 'use_skill', skillIndex: index, targetPos: lastTarget });

    // 4. 消耗处理
    drawCharacters(); 
    updateHPDisplay();
    updateStatusText();
    sendState('state_sync');

    if (skill.consumeTurn) {
        myActionPoints = 0;
        myMovePoints = 0;
        endMyTurn();
    } else {
        myActionPoints--;
        if (myActionPoints <= 0 && myMovePoints <= 0) {
            endMyTurn();
        }
    }
});

// 处理“受伤”逻辑：带有关键词，可被 Buff 或技能钩子识别
function applyDamage(targetStats, amount, source) {
    if (amount <= 0) return;
    
    targetStats.hp -= amount;

    // 触发“受伤”相关的 Buff 钩子
    if (targetStats.activeBuffs) {
        targetStats.activeBuffs.forEach(b => {
            const cfg = buffRegistry[b.name];
            if (cfg && cfg.onDamageTaken) cfg.onDamageTaken(targetStats, amount, source);
        });
    }
}

// 计算技能最终伤害，支持 x*y 格式并将护甲应用到每一发伤害上
function getSkillFinalDamage(skill, targetStats) {
    // 检查目标是否有“免疫伤害”或“无法命中”Buff
    if (targetStats.activeBuffs) {
        for (let b of targetStats.activeBuffs) {
            const cfg = buffRegistry[b.name];
            if (cfg && cfg.effect && (cfg.effect.modifyIncomingDamage || cfg.effect.isMiss)) return 0;
        }
    }

    let armor = calculateArmor(targetStats);
    const dmg = skill.damage;
    let base = 0, hits = 1;

    // 允许 Buff 修改收到的最终伤害（例如：减伤 50% 或 易伤 +5）
    let finalBaseDmg = 0;
    if (typeof dmg === 'string' && String(dmg).includes('*')) {
        const parts = String(dmg).split('*');
        base = parseInt(parts[0]) || 0;
        hits = parseInt(parts[1]) || 0;
    } else {
        base = parseInt(dmg) || 0;
    }

    finalBaseDmg = base - armor;
    if (targetStats.activeBuffs) {
        // 按优先级排序：优先级高的（负面/覆盖类）后执行，确保最高优先级
        [...targetStats.activeBuffs]
            .sort((a, b) => (buffRegistry[a.name]?.priority || 0) - (buffRegistry[b.name]?.priority || 0))
            .forEach(b => {
                const cfg = buffRegistry[b.name];
                if (cfg && cfg.modifyDamageTaken) {
                    finalBaseDmg = cfg.modifyDamageTaken(finalBaseDmg, b.stacks);
                }
            });
    }
    return Math.max(0, finalBaseDmg) * hits;
    return Math.max(0, base - armor) * hits;
}

// 核心重构：支持多时机触发的复杂 Buff 引擎
function executeBuffEffects(stats, buffRecord, timing) {
    const cfg = buffRegistry[buffRecord.name];
    if (!cfg) return;

    const effect = cfg.effect;
    if (effect) {
        // 1. 处理特定的生命周期钩子 (支持一个 Buff 在多个不同时机触发不同逻辑)
        const hooks = {
            'onStart': 'onStart',
            'turnStart': 'onTurnStart',
            'turnEnd': 'onTurnEnd',
            'opponentTurnEnd': 'onOpponentTurnEnd'
        };
        const hookName = hooks[timing];
        if (typeof effect === 'object' && hookName && typeof effect[hookName] === 'function') {
            effect[hookName](stats, buffRecord.stacks);
        }

        // 2. 兼容传统的单时机触发配置 (主要用于处理简单的函数式 Buff 或定义了 effectTiming 的 Buff)
        if (cfg.effectTiming === timing) {
            if (typeof effect === 'function') {
                effect(stats, buffRecord.stacks);
            } else if (typeof effect.onTrigger === 'function') {
                effect.onTrigger(stats, buffRecord.stacks);
            }
        }
    }

    // 3. 持续时间结算逻辑 (根据 durationTiming 决定在哪个时机扣除轮数)
    if (cfg.durationTiming === timing) {
        buffRecord.duration--;
    }
}

// 通用 Buff 解析逻辑：寻找 "施加x回合y zzz" 格式
function applyBuffFromSkill(targetStats, skill) {
    let buffName, duration, stacks;
    let isStackable = true; // 默认 Buff 是可叠加的

    if (skill.buffEffect && skill.buffEffect.name) {
        // 优先从 skill.buffEffect 字段获取 Buff 信息
        buffName = skill.buffEffect.name;
        duration = skill.buffEffect.duration || 1;
        stacks = skill.buffEffect.stacks || 1;
        // 严格以技能配置为准
        isStackable = (skill.buffEffect.stackable !== false); 
    } else {
        // 如果没有 buffEffect 字段，则回退到解析 desc 字段 (兼容旧技能)
        const text = skill.desc || "";
        const match = text.match(/施加(\d+)回合(\d+)(\S+)/);
        if (!match) return; // 没有匹配到 Buff 描述
        duration = parseInt(match[1]);
        stacks = parseInt(match[2]);
        buffName = match[3];
    }

    if (!targetStats.activeBuffs) targetStats.activeBuffs = [];
    ensureBuffLoaded(buffName);

    const sourceSkillName = skill.name;
    if (isStackable === false) {
        const existing = targetStats.activeBuffs.find(b => b.name === buffName && b.sourceSkillName === sourceSkillName);
        if (existing) {
            existing.duration = duration;
            existing.stacks = stacks;
            return;
        }
    }

    const buffRecord = { name: buffName, duration, stacks, sourceSkillName };
    targetStats.activeBuffs.push(buffRecord);

    // 触发 Buff 的“开始”钩子 (onStart)
    executeBuffEffects(targetStats, buffRecord, 'onStart');

    // 只有主机可以生成 Buff 相关的日志，防止客户端本地重复记录
    if (isHost) {
        const cfg = buffRegistry[buffName];
        if (!skill.isSecret && !(cfg && cfg.hide)) {
            const targetName = (targetStats === myStats) ? '我方' : '敌方';
            const displayName = (cfg && cfg.displayName) ? cfg.displayName : buffName;
            addLog(`[状态] ${targetName} 成功加持效果 [${displayName}]，持续 ${duration} 轮`);
        }
    }
}

// 动态加载 Buff 脚本
function ensureBuffLoaded(name) {
    if (buffRegistry[name] || document.getElementById(`buff-js-${name}`)) return;
    const script = document.createElement('script');
    script.id = `buff-js-${name}`;
    script.src = `buff/${name}.js`;
    script.onload = () => {
        console.log(`Buff脚本加载成功: ${name}`);
        updateHPDisplay(); // 加载成功后立即刷新UI以显示中文名和图标
    };
    script.onerror = () => {
        console.error(`[加载失败] 找不到 Buff 脚本: ${script.src}。请检查文件是否存在于 buff/ 文件夹下，且文件名是否完全一致。`);
        // 加载失败时移除该标签，防止重复尝试
        script.remove();
    };
    document.head.appendChild(script);

    // 主机需要通知客户端也加载对应的 Buff 文件
    if (isHost && conn && conn.open) {
        conn.send({ type: 'buff_load_request', buffName: name });
    }
}

// 动态加载区域脚本
function ensureAreaLoaded(name) {
    if (areaRegistry[name] || document.getElementById(`area-js-${name}`)) return;
    const script = document.createElement('script');
    script.id = `area-js-${name}`;
    script.src = `area/${name}.js`;
    script.onload = () => { console.log(`区域脚本加载成功: ${name}`); drawCharacters(); };
    script.onerror = () => {
        console.error(`[加载失败] 找不到区域脚本: ${script.src}。请检查 area/ 文件夹。`);
        script.remove();
    };
    document.head.appendChild(script);

    if (isHost && conn && conn.open) {
        conn.send({ type: 'area_load_request', areaName: name });
    }
}

// 动态加载技能脚本
function ensureSkillLoaded(name) {
    if (skillRegistry[name] || document.getElementById(`skill-js-${name}`)) return;
    const script = document.createElement('script');
    script.id = `skill-js-${name}`;
    script.src = `skill/${name}.js`;
    script.onload = () => console.log(`技能脚本加载成功: ${name}`);
    script.onerror = () => script.remove();
    document.head.appendChild(script);

    if (isHost && conn && conn.open) {
        conn.send({ type: 'skill_load_request', skillName: name });
    }
}

// 核心逻辑：计算考虑 Buff 后的实际护甲值
function calculateArmor(stats) {
    let baseArmor = stats.armor || 0;
    if (stats.activeBuffs) {
        [...stats.activeBuffs]
            .sort((a, b) => (buffRegistry[a.name]?.priority || 0) - (buffRegistry[b.name]?.priority || 0))
            .forEach(buff => {
                const logic = buffRegistry[buff.name];
                // 仅针对持久型(continuous) Buff 进行属性修正
                if (logic && logic.effectTiming === 'continuous' && logic.effect) {
                    if (typeof logic.effect.modifyArmor === 'function') {
                        baseArmor = logic.effect.modifyArmor(baseArmor, buff.stacks);
                    }
                    if (logic.effect.armorBonus !== undefined) {
                        baseArmor += logic.effect.armorBonus * buff.stacks;
                    }
                }
            });
    }
    return baseArmor;
}

// 辅助函数：根据范围和类型获取区域大小描述
function getAreaSizeDescription(range, type) {
    if (type === 'round') {
        const size = range * 2 + 1;
        return `${size}x${size}`;
    }
    // 默认为矩形描述
    return `范围 ${range}`;
}

// 助手函数：向对方发送当前完整的实时资源状态
function sendState(actionType, extraData = {}) {
    if (isHost && conn && conn.open) {
        /**
         * 数据遮蔽处理
         * @param {Object} stats 角色数据
         * @param {Boolean} forOwner 是否是发给角色拥有者本人
         */
        const maskStats = (stats, forOwner) => {
            const copy = JSON.parse(JSON.stringify(stats));
            if (copy.skills) {
                // 暗置技能 CD 遮蔽
                copy.skills.forEach(s => { if (s.isSecret && !forOwner) s.cdCurrent = 0; });
            }
            if (copy.activeBuffs && !forOwner) {
                // 隐藏 Buff 遮蔽：从发给敌人的数据包中彻底移除隐藏 Buff
                copy.activeBuffs = copy.activeBuffs.filter(b => {
                    const cfg = buffRegistry[b.name];
                    return !(cfg && cfg.hide);
                });
            }
            return copy;
        };

        // 提取 Buff 注册表中的显示元数据（中文名和图标），同步给客户端
        const buffMeta = {};
        for (const key in buffRegistry) {
            if (buffRegistry[key]) {
                buffMeta[key] = {
                    displayName: buffRegistry[key].displayName,
                    icon: buffRegistry[key].icon,
                    description: buffRegistry[key].description
                };
            }
        }

        // 只有主机作为权威服务器广播游戏镜像
        conn.send({
            type: 'action',
            actionType: actionType,
            hostStats: maskStats(myStats, false),    // 发给客户端的主机数据（对他而言是敌人）
            clientStats: maskStats(oppStats, true),  // 发给客户端的客户端数据（对他而言是自己）
            hAP: (currentTurn === myColor ? myActionPoints : 1), // 遮蔽：非我方回合隐藏真实 AP
            hOF: myOverflowPoints,
            cAP: oppActionPoints,
            cOF: oppOverflowPoints,
            hMV: myMovePoints,
            cMV: oppMovePoints,
            hostPos: myPos,
            clientPos: oppPos,
            mapEffects: mapEffects, // 同步地图区域效果
            mapData: { grid: mapGrid, bgColor: mapBgColor }, // 实时同步地图数据
            round: currentRound,
            turn: currentTurn,
            buffMeta: buffMeta,
            ...extraData
        });
    }
}

returnBtn.addEventListener('click', () => {
    if (conn) {
        const tempConn = conn;
        conn = null; // 先设为 null 防止触发 handleDisconnect 的弹窗逻辑
        tempConn.close();
        showMenu(); // 确保主动点击返回的人也能立即回到主菜单
    }
});

function startMyTurn() {
    if (!isHost || !gameActive) return;

    // 1. 核心逻辑：只有当轮次循环回到先手玩家时，才判定为“大轮次结束/新轮次开始”
    if (currentTurn === firstMoveColor) {
        if (!isRoundDecDone) {
            isRoundDecDone = true; // 锁定，防止本轮内重复执行
            currentRound++;
            // 全场唯一的 CD、Buff 时长及 DOT 伤害（中毒等）结算入口
            [myStats, oppStats].forEach(stats => {
                if (stats.skills) {
                    stats.skills.forEach(s => { 
                        if (s.cdCurrent === 1) addLog(`[技能] ${stats.name === myStats.name ? '我方' : '敌方'} 的战技 [${s.name}] 冷却完毕`, '#4caf50');
                        if (s.cdCurrent > 0) s.cdCurrent--; 
                    });
                }
                // 每一轮结算（如中毒）后立即检查是否有角色死亡
                checkGameOver();
            });
        }
        // 修复：必须在 DOT（中毒）结算后立即检查游戏结束，否则中毒致死会延迟一轮判定
        if (checkGameOver()) return;
    } else {
        // 当进入非先手玩家回合时，重置标志位，确保下一轮回到先手时能再次触发结算
        isRoundDecDone = false;
    }

    // 2. 判定当前是谁的回合
    const isMyTurn = (currentTurn === myColor);
    const pos = isMyTurn ? myPos : oppPos;
    const stats = isMyTurn ? myStats : oppStats;
    const currentTile = (mapGrid && mapGrid[pos.r]) ? mapGrid[pos.r][pos.c] : 0;

    // 个人回合结算逻辑
    let bonusMP = 0;
    let canGainOverflow = true; // 默认允许获得溢出点
    if (stats.activeBuffs) {
        // 1. 处理持续性/被动属性修正 (属性驱动)
        [...stats.activeBuffs]
            .sort((a, b) => (buffRegistry[a.name]?.priority || 0) - (buffRegistry[b.name]?.priority || 0))
            .forEach(b => {
                const cfg = buffRegistry[b.name];
                if (cfg && cfg.effect && (cfg.effectTiming === 'continuous' || cfg.effectTiming === 'turnStart')) {
                    // 处理移动相关修正
                    if (cfg.effect.mpBonus !== undefined) bonusMP += cfg.effect.mpBonus * b.stacks;
                    if (cfg.effect.mpOverride !== undefined) bonusMP = cfg.effect.mpOverride;
                    if (typeof cfg.effect.onCheckOverflow === 'function') {
                        canGainOverflow = cfg.effect.onCheckOverflow(canGainOverflow, b.stacks);
                    }
                }
                // 统一执行回合开始时机检查
                executeBuffEffects(stats, b, 'turnStart');
            });
        stats.activeBuffs = stats.activeBuffs.filter(b => b.duration > 0);
        if (checkGameOver()) return;
    }

    if (isMyTurn) {
        myActionPoints = 1; // 核心修改：每回合开始 AP 重置为 1，不储存
        myMovePoints = bonusMP; // 应用 Buff 计算出的移动点
        if (bonusMP > 0) addLog(`[行动] 回合开始，我方 获得 ${bonusMP} 点移动点`, '#607d8b');

        const threshold = parseInt(myStats.overflow) || 0;

        if (threshold > 0 && !canGainOverflow) {
            addLog(`[状态] 我方 无法获得溢出点`, '#607d8b');
        } else if (threshold > 0 && currentTile !== 3) { // 泥泞地块检查
            myOverflowPoints++;
            if (myOverflowPoints >= threshold) { 
                myOverflowPoints = 0; // 溢出满，设为 0
                myActionPoints++; 
                addLog(`[行动] 我方 溢出满，额外获得 1 点行动点`, '#4caf50', true);
            } else {
                addLog(`[行动] 我方 溢出点数增加 (${myOverflowPoints}/${threshold})`, '#333', true); 
            }
        }
    } else {
        oppActionPoints = 1; // 核心修改：每回合开始 AP 重置为 1，不储存
        oppMovePoints = bonusMP;

        const threshold = parseInt(oppStats.overflow) || 0;

        if (threshold > 0 && !canGainOverflow) {
            addLog(`[状态] 敌方 无法获得溢出点`, '#607d8b');
        } else if (threshold > 0 && currentTile !== 3) { // 泥泞地块检查
            oppOverflowPoints++;
            if (oppOverflowPoints >= threshold) { 
                oppOverflowPoints = 0; // 溢出满，设为 0
                oppActionPoints++;
                addLog(`[行动] 敌方 溢出满，额外获得 1 点行动点`, '#e65100', true);
            } else {
                addLog(`[行动] 敌方 溢出点数增加 (${oppOverflowPoints}/${threshold})`, '#333', true);
            }
        }
    }

    sendState('state_sync');
    drawCharacters(); updateHPDisplay(); updateStatusText();
}

function settleMapEffects(ownerColor) {
    if (!isHost) return;
    mapEffects.forEach(effect => {
        const config = areaRegistry[effect.name];
        if (!config || !config.effect) return;

        const isCaster = (effect.sourcePlayer === ownerColor);
        const currentTiming = isCaster ? 'casterTurnEnd' : 'opponentTurnEnd';

        // 1. 触发效果 (默认在对方回合结束时触发，如箭雨伤害)
        const eTiming = config.effectTiming || 'opponentTurnEnd';
        if (eTiming === currentTiming) {
            const stats = (ownerColor === myColor) ? myStats : oppStats;
            const pos = (ownerColor === myColor) ? myPos : oppPos;
            
            let res = null;
            if (typeof config.effect === 'function') res = config.effect(effect, stats, pos);
            else if (typeof config.effect.onTrigger === 'function') res = config.effect.onTrigger(effect, stats, pos);

            if (res && res.hit && res.damage > 0) {
                // 修复：检查目标是否拥有“无法命中/隐蔽”效果
                const isInvincible = stats.activeBuffs && stats.activeBuffs.some(b => buffRegistry[b.name]?.effect?.isMiss);
                if (isInvincible) {
                    addLog(`[闪避] ${(stats === myStats ? '我方' : '敌方')} 处于隐蔽状态，避开了 ${effect.displayName} 的区域伤害`, '#666');
                } else {
                    const armor = calculateArmor(stats);
                    const finalDmg = Math.max(0, res.damage - armor);
                    applyDamage(stats, finalDmg, 'area_recurring');
                    addLog(`[区域] ${(stats === myStats ? '我方' : '敌方')} 受到 ${effect.displayName}伤害 ${finalDmg} (护甲抵扣: ${armor})`, '#d32f2f');
                }
            }
        }

        // 2. 持续时间结算 (默认在施法者回合结束时减少)
        const dTiming = config.durationTiming || 'casterTurnEnd';
        if (dTiming === currentTiming) {
            effect.duration--;
            if (effect.duration > 0) addLog(`[区域] ${effect.displayName} 剩余 ${effect.duration} 轮`, '#666');
            else addLog(`[区域] ${effect.displayName} 效力耗尽消失`, '#666');
        }
    });
    mapEffects = mapEffects.filter(e => e.duration > 0);

    // 核心修改：在拥有者回合结束时结算其身上的 Buff
    const stats = (ownerColor === myColor) ? myStats : oppStats;
    if (stats.activeBuffs) {
        stats.activeBuffs.forEach(b => {
            const cfg = buffRegistry[b.name];
            if (!cfg) {
                b.duration--; // 默认回退逻辑
                return;
            }

            // 使用引擎处理回合结束逻辑
            executeBuffEffects(stats, b, 'turnEnd');
        });
        stats.activeBuffs = stats.activeBuffs.filter(b => b.duration > 0);
    }

    // 处理“在对手回合结束时结算”的特殊 Buff (如：隐蔽)
    const otherStats = (ownerColor === myColor) ? oppStats : myStats;
    if (otherStats.activeBuffs) {
        otherStats.activeBuffs.forEach(b => {
            const cfg = buffRegistry[b.name];
            // 仅处理对手回合结束时的时长结算
            if (cfg && cfg.durationTiming === 'opponentTurnEnd') executeBuffEffects(otherStats, b, 'opponentTurnEnd');
        });
        otherStats.activeBuffs = otherStats.activeBuffs.filter(b => b.duration > 0);
    }
    checkGameOver();
}

function endMyTurn() {
    if (currentTurn !== myColor) return;

    if (isHost) {
        settleMapEffects(myColor); // 主机结束回合时结算自己施放的区域
        // 主机直接操作
        myActionPoints = 0;
        currentTurn = (myColor === 'black' ? 'white' : 'black');
        resetMode();
        startMyTurn();
    } else {
        // 客户端请求主机结束
        conn.send({ type: 'action', actionType: 'client_request_end' });
    }
}

endTurnBtn.addEventListener('click', endMyTurn);

// 4. 绘制棋盘
function drawBoard() {
    // 绘制地图背景
    ctx.fillStyle = mapBgColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 绘制特殊地块
    if (mapGrid && mapGrid.length >= GRID_SIZE) {
        for (let r = 0; r < GRID_SIZE; r++) {
            for (let c = 0; c < GRID_SIZE; c++) {
                const tile = mapGrid[r] ? mapGrid[r][c] : 0; // 防御性校验
                const x = PADDING + c * CELL_SIZE - CELL_SIZE / 2;
                const y = PADDING + r * CELL_SIZE - CELL_SIZE / 2;

                if (tile === 1) { // 水地块
                    ctx.fillStyle = '#4FC3F7';
                    ctx.fillRect(x, y, CELL_SIZE, CELL_SIZE);
                } else if (tile === 2) { // 墙地块
                    ctx.fillStyle = '#757575';
                    ctx.fillRect(x, y, CELL_SIZE, CELL_SIZE);
                } else if (tile === 3) { // 泥泞地块
                    ctx.fillStyle = '#8D6E63';
                    ctx.fillRect(x, y, CELL_SIZE, CELL_SIZE);
                }
            }
        }
    }

    ctx.beginPath();
    ctx.strokeStyle = '#333';

    for (let i = 0; i < GRID_SIZE; i++) {
        // 横线
        ctx.moveTo(PADDING, PADDING + i * CELL_SIZE);
        ctx.lineTo(canvas.width - PADDING, PADDING + i * CELL_SIZE);
        // 纵线
        ctx.moveTo(PADDING + i * CELL_SIZE, PADDING);
        ctx.lineTo(PADDING + i * CELL_SIZE, canvas.height - PADDING);
    }
    ctx.stroke();
}

// 5. 绘制棋子
function drawCharacters() {
    drawBoard();

    // 如果选中了技能，绘制技能范围提示
    if (gameActive && currentTurn === myColor && selectedSkillIndex !== null) {
        const skill = myStats.skills[selectedSkillIndex];
        // 修正：self 类型技能不要在棋盘展示范围
        if (skill.rangeType !== 'self') {
            drawRangeHints(myPos.r, myPos.c, skill.range, 'rgba(156, 39, 176, 0.1)', skill.rangeType);
        }

        // 2. 如果已预选目标，根据技能/普攻类型高亮受影响的完整范围
        if (selectedTargetPos) {
            ctx.save();
            ctx.fillStyle = 'rgba(255, 255, 255, 0.5)'; // 使用半透明白色高亮路径
            
            // 判定是否需要整行高亮
            const type = skill ? skill.rangeType : (myStats.atkRangeType || 'line');
            const range = skill ? skill.range : myStats.atkRange;
            
            let highlightTiles = [];
            const isAreaPreview = (type === 'area_placement' && skill?.areaEffect);
            if (isAreaPreview) {
                const areaRange = skill.areaEffect.areaRange;
                const areaType = skill.areaEffect.rangeType || 'round';
                // 预览效果区域
                highlightTiles = getAffectedTiles(myPos.r, myPos.c, selectedTargetPos.r, selectedTargetPos.c, areaRange, areaType);
            } else {
                const isPathType = ['projectile', 'rush', 'pierce'].includes(type);
            
                highlightTiles = isPathType 
                    ? getAffectedTiles(myPos.r, myPos.c, selectedTargetPos.r, selectedTargetPos.c, range, type)
                    : [{ r: selectedTargetPos.r, c: selectedTargetPos.c }];
            }
            highlightTiles.forEach(tile => {
                const x = PADDING + tile.c * CELL_SIZE - CELL_SIZE / 2;
                const y = PADDING + tile.r * CELL_SIZE - CELL_SIZE / 2;
                ctx.fillRect(x, y, CELL_SIZE, CELL_SIZE);
            });
            ctx.restore();
        }
    }
    // 新增：如果处于攻击模式且没有选中技能，绘制普攻范围
    else if (gameActive && currentTurn === myColor && isAtkMode && selectedSkillIndex === null) {
        // 使用角色卡定义的普攻类型
        const atkType = myStats.atkRangeType || 'line';
        drawRangeHints(myPos.r, myPos.c, myStats.atkRange, 'rgba(255, 0, 0, 0.1)', atkType);

        // 普攻模式下的方向预览高亮
        if (selectedTargetPos) {
            ctx.save();
            ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
            const highlightTiles = (atkType === 'projectile') 
                ? getAffectedTiles(myPos.r, myPos.c, selectedTargetPos.r, selectedTargetPos.c, myStats.atkRange, atkType)
                : [{ r: selectedTargetPos.r, c: selectedTargetPos.c }];

            highlightTiles.forEach(tile => {
                const x = PADDING + tile.c * CELL_SIZE - CELL_SIZE / 2;
                const y = PADDING + tile.r * CELL_SIZE - CELL_SIZE / 2;
                ctx.fillRect(x, y, CELL_SIZE, CELL_SIZE);
            });
            ctx.restore();
        }
    }

    // 绘制地图区域效果 (如箭雨区域)
    mapEffects.forEach(effect => {
        const config = areaRegistry[effect.name];
        ctx.save();
        ctx.fillStyle = config ? config.color : 'rgba(200, 200, 200, 0.3)';
        effect.tiles.forEach(tile => {
            const x = PADDING + tile.c * CELL_SIZE - CELL_SIZE / 2;
            const y = PADDING + tile.r * CELL_SIZE - CELL_SIZE / 2;
            ctx.fillRect(x, y, CELL_SIZE, CELL_SIZE);
            ctx.strokeStyle = config ? config.borderColor : 'rgba(255,255,255,0.2)';
            ctx.strokeRect(x, y, CELL_SIZE, CELL_SIZE);
        });
        ctx.restore();
    });

    // 绘制我方
    const isOverlap = (myPos.r === oppPos.r && myPos.c === oppPos.c);
    const oppColor = myColor === 'black' ? 'white' : 'black';

    // 先画敌方，再画我方（确保层级正确）
    drawToken(oppPos.r, oppPos.c, oppColor, isOverlap, false);
    drawToken(myPos.r, myPos.c, myColor, isOverlap, true);
}

// 获取受技能影响的所有地块
function getAffectedTiles(originR, originC, targetR, targetC, range, type) {
    const tiles = [];

    // 移除内部 checkSkillRange 校验逻辑。
    // 因为 getAffectedTiles 应该只负责“根据给定的中心点和半径生成格子坐标”。
    // 射程合法性（选点是否在 5x5 内）已经在 mousedown 或主机逻辑入口处通过 skill.range 校验过了。
    // 如果在这里保留校验，当生成 3x3 区域时传入的 range 为 1，若目标点在距离 2 处，会被误判为非法。

    switch (type) {
        case 'round': // 以目标点 (targetR, targetC) 为中心的 AOE (切比雪夫距离)
            for (let r = 0; r < GRID_SIZE; r++) {
                for (let c = 0; c < GRID_SIZE; c++) {
                    const distR = Math.abs(targetR - r);
                    const distC = Math.abs(targetC - c);
                    if (distR <= range && distC <= range) {
                        tiles.push({ r, c });
                    }
                }
            }
            break;
        case 'self': // 仅影响施法者自身
            tiles.push({ r: originR, c: originC });
            break;
        case 'line': // 影响玩家明确选择的目标格子 (targetR, targetC)
            // 对于 range 为 1 的 line 技能，通常只影响目标格子本身。
            // 如果是穿透型 line 技能，则需要影响路径上的所有格子。
            // 考虑到“破甲一击” range 为 1，这里只影响目标格子。
            tiles.push({ r: targetR, c: targetC });
            break;
        case 'pierce': // 影响从施法者到目标点路径上的所有格子，最远不超过 range
            if (originR === targetR) { // 水平直线
                const unit = targetC > originC ? 1 : -1;
                const dist = Math.min(Math.abs(targetC - originC), range);
                for (let i = 1; i <= dist; i++) {
                    let nextC = originC + unit * i;
                    if (mapGrid[originR][nextC] === 2) break; // 墙体阻断穿透
                    tiles.push({ r: originR, c: nextC });
                }
            } else if (originC === targetC) { // 垂直直线
                const unit = targetR > originR ? 1 : -1;
                const dist = Math.min(Math.abs(targetR - originR), range);
                for (let i = 1; i <= dist; i++) {
                    let nextR = originR + unit * i;
                    if (mapGrid[nextR][originC] === 2) break; // 墙体阻断穿透
                    tiles.push({ r: nextR, c: originC });
                }
            }
            break;
        case 'rush': // 冲刺：可以穿过水，但不能停在水上（若终点是水则停在水前）
            let drRush = targetR - originR;
            let dcRush = targetC - originC;
            const stepsRush = Math.max(Math.abs(drRush), Math.abs(dcRush));
            const unitRRush = drRush === 0 ? 0 : drRush / Math.abs(drRush);
            const unitCRush = dcRush === 0 ? 0 : dcRush / Math.abs(dcRush);

            // 从 0 开始循环以包含起点，i 代表步数
            for (let i = 0; i <= stepsRush; i++) {
                let nextR = originR + unitRRush * i;
                let nextC = originC + unitCRush * i;
                // 越界检查
                if (nextR < 0 || nextR >= GRID_SIZE || nextC < 0 || nextC >= GRID_SIZE) break;
                const tile = mapGrid[nextR][nextC];

                // 墙体(2)绝对阻断路径
                if (i > 0 && tile === 2) break;
                // 注意：这里不再在循环中拦截水(1)，允许路径穿过水
                tiles.push({ r: nextR, c: nextC });
            }

            // 停靠点回退逻辑：从路径末尾往前找，直到最后一个格子不是水
            while (tiles.length > 1) {
                const lastTile = tiles[tiles.length - 1];
                if (mapGrid[lastTile.r][lastTile.c] === 1) {
                    tiles.pop(); // 如果末尾是水，将其从路径（包括伤害判定范围）中移除
                } else {
                    break; // 找到了合法的停靠点（陆地或泥泞）
                }
            }
            break;
        case 'area_placement': // 箭雨：选择一个中心点，影响以该中心点为半径的区域
            // range 参数在这里是 areaEffect.areaRange (3x3 区域的半径 1)
            for (let r = 0; r < GRID_SIZE; r++) {
                for (let c = 0; c < GRID_SIZE; c++) {
                    const distR = Math.abs(targetR - r);
                    const distC = Math.abs(targetC - c);
                    if (distR <= range && distC <= range) { // range here is areaRange (e.g., 1 for 3x3)
                        tiles.push({ r, c });
                    }
                }
            }
            break;
        case 'projectile': {
            tiles.push({ r: originR, c: originC }); // 自己所在的格子总是范围

            const dr = targetR - originR;
            const dc = targetC - originC;
            const steps = Math.max(Math.abs(dr), Math.abs(dc));
            if (steps === 0) break;

            const unitR = dr / steps;
            const unitC = dc / steps;
            // 确定谁是敌方，以便在重叠时准确判定
            const enemyPos = (originR === myPos.r && originC === myPos.c) ? oppPos : myPos;

            for (let i = 1; i <= range; i++) {
                const r = originR + Math.round(unitR * i);
                const c = originC + Math.round(unitC * i);
                if (r < 0 || r >= GRID_SIZE || c < 0 || c >= GRID_SIZE) break;

                tiles.push({ r, c });

                const isWall = (mapGrid[r] && mapGrid[r][c] === 2);
                const isEnemy = (enemyPos.r === r && enemyPos.c === c);
                if (isWall || isEnemy) {
                    break;
                }
            }
            break;
        }
        default: // 默认情况下，如果目标合法，则只影响目标格子
            tiles.push({ r: targetR, c: targetC });
            break;
    }
    return tiles;
}

// 统一的范围判定逻辑
function checkSkillRange(r1, c1, r2, c2, range, type) {
    const distR = Math.abs(r1 - r2);
    const distC = Math.abs(c1 - c2);

    switch (type) {
        case 'round': // 自身中心范围 (切比雪夫距离)
            return distR <= range && distC <= range;
        case 'self': // 仅自身
            return distR === 0 && distC === 0;
        case 'area_placement': // 区域放置类技能，检查目标点是否在选择范围内
            // 对于箭雨，range 是 5x5 的选择范围
            // 这里的 checkSkillRange 是用于判断鼠标点击的 (r2, c2) 是否在技能的有效选择范围内
            // 所以这里用切比雪夫距离判断 5x5 范围
            return distR <= range && distC <= range;
        case 'projectile':
        case 'line':
        case 'rush':
        case 'linear': // 经典十字直线
        default:
            return (r1 === r2 || c1 === c2) && (distR + distC <= range);
    }
}

// 通用的范围提示绘制函数，可供攻击范围或未来技能范围使用
function drawRangeHints(originR, originC, range, color, rangeType = 'cross') {
    ctx.save();
    ctx.fillStyle = color;

    const drawCell = (r, c) => {
        const x = PADDING + c * CELL_SIZE - CELL_SIZE / 2;
        const y = PADDING + r * CELL_SIZE - CELL_SIZE / 2;
        ctx.fillRect(x, y, CELL_SIZE, CELL_SIZE);
    };

    // 判定是否属于弹道类或冲刺类（直线延伸，遇墙即止）
    const isProjectileType = ['line', 'linear', 'pierce', 'rush', 'projectile'].includes(rangeType);

    if (isProjectileType) {
        // 从四个方向进行射线检测
        const directions = [[0, 1], [0, -1], [1, 0], [-1, 0]]; // 右, 左, 下, 上
        directions.forEach(([dr, dc]) => {
            for (let i = 1; i <= range; i++) {
                const r = originR + dr * i;
                const c = originC + dc * i;

                // 边界检查
                if (r < 0 || r >= GRID_SIZE || c < 0 || c >= GRID_SIZE) break;
                
                drawCell(r, c); // 先绘制当前格子（包含墙体本身）

                // 如果当前格子是墙体(2) 或者是敌方单位(仅限弹道类)，则停止向后延伸
                const isWall = (mapGrid[r] && mapGrid[r][c] === 2);
                const isEnemy = (rangeType === 'projectile' && oppPos.r === r && oppPos.c === c);
                if (isWall || isEnemy) break;
            }
        });
    } else {
        // AOE 或 周身范围 (如旋风斩)，沿用全量检测逻辑
        for (let r = 0; r < GRID_SIZE; r++) {
            for (let c = 0; c < GRID_SIZE; c++) {
                if (r === originR && c === originC) continue;
                if (checkSkillRange(originR, originC, r, c, range, rangeType)) {
                    // 仅对非直线技能进行 LOS (视线) 阻挡检查
                    if (!isPathBlocked(originR, originC, r, c)) {
                        drawCell(r, c);
                    }
                }
            }
        }
    }
    ctx.restore();
}

function drawToken(row, col, color, isOverlap, isMe) {
    let x = PADDING + col * CELL_SIZE;
    let y = PADDING + row * CELL_SIZE;

    // 处理重叠渲染：如果坐标重叠，则左右偏移 5 像素显示
    if (isOverlap) {
        x += isMe ? -5 : 5;
    }

    ctx.beginPath();
    ctx.arc(x, y, CELL_SIZE * 0.4, 0, Math.PI * 2);
    const gradient = ctx.createRadialGradient(x - 2, y - 2, 2, x, y, CELL_SIZE * 0.4);

    if (color === 'black') {
        // 蓝棋配色
        gradient.addColorStop(0, '#2196F3');
        gradient.addColorStop(1, '#0D47A1');
    } else {
        // 红棋配色
        gradient.addColorStop(0, '#F44336');
        gradient.addColorStop(1, '#B71C1C');
    }

    ctx.fillStyle = gradient;
    ctx.fill();
    ctx.closePath();
}

// 6. 游戏交互逻辑
function handleRemoteAction(data) {
    if (isHost) {
        // 主机模式：验证客户端传来的请求
        if (data.actionType === 'client_request_action') {
            const oppColor = (myColor === 'black' ? 'white' : 'black');
            if (currentTurn !== oppColor) return;

            if (currentTurn !== oppColor || oppActionPoints <= 0) return;
            const { row, col, intent } = data;
            const distR = Math.abs(row - oppPos.r);
            const distC = Math.abs(col - oppPos.c);
            const isNotSameTileAndDiagonal = (distR > 0 && distC > 0);
            let validAction = false;

            if (intent === 'attack') {
                if (oppActionPoints <= 0) return; // 攻击必须有 AP
                
                const atkType = oppStats.atkRangeType || 'line';
                const affected = getAffectedTiles(oppPos.r, oppPos.c, row, col, oppStats.atkRange, atkType);
                const hitMe = affected.some(t => t.r === myPos.r && t.c === myPos.c);

                if (hitMe && (atkType === 'projectile' || !isPathBlocked(oppPos.r, oppPos.c, row, col))) {
                    const isMiss = myStats.activeBuffs && myStats.activeBuffs.some(b => buffRegistry[b.name]?.isMiss);
                    if (!isMiss) {
                        const armor = calculateArmor(myStats);
                        let finalDmg = (oppStats.atkDmg || 20) - armor;
                        applyDamage(myStats, finalDmg, 'attack');
                        addLog(`[命中] 敌方 发起普攻，命中 我方 造成 ${finalDmg} 伤害 (抵扣护甲: ${armor})`);
                    } else {
                        addLog(`[闪避] 敌方的进攻落空了，我方 未受损伤。`, '#666');
                    }
                    oppActionPoints--;
                    validAction = true;
                }
            } else {
                if (oppActionPoints <= 0 && oppMovePoints <= 0) return; // 移动必须有 AP 或 MP
                // 移动判定：距离为 1，且不能是墙体(2)或水(1)
                if (distR + distC === 1) {
                    const targetTile = mapGrid[row][col];
                    if (targetTile !== 1 && targetTile !== 2) {
                        oppPos = { r: row, c: col };
                        addLog(`[行动] 敌方 移动至坐标 [${row}, ${col}]`, '#607d8b');
                        // 修复：主机在代扣客户端行动时，也应优先扣除移动点
                        if (oppMovePoints > 0) oppMovePoints--; else oppActionPoints--;
                        validAction = true;
                    }
                }
            }

            if (validAction) {
                // 确保在自动结束回合前，先同步操作后的实时状态
                drawCharacters(); 
                updateHPDisplay(); 
                updateStatusText();
                sendState('state_sync');

                // 修正：敌方移动点未耗尽时，不自动结束回合
                if (oppActionPoints <= 0 && oppMovePoints <= 0) {
                    settleMapEffects(oppColor);
                    currentTurn = myColor;
                    startMyTurn();
                }
            }
        } else if (data.actionType === 'client_request_end') {
            const oppColor = (myColor === 'black' ? 'white' : 'black');
            settleMapEffects(oppColor); // 主机处理客户端结束回合时的区域结算
            oppActionPoints = 0;
            oppMovePoints = 0;
            currentTurn = myColor;
            startMyTurn();
        }
    } else {
        // 客户端模式：无条件服从主机发来的镜像数据
        if (data.actionType === 'init_sync' || data.actionType === 'state_sync' || data.actionType === 'turn_start' || data.actionType === 'game_over') {
            if (data.actionType === 'init_sync') {
                firstMoveColor = data.firstMoveColor;
                opponentChar = data.charInfo.host;
                mapGrid = data.mapData.grid;
                mapBgColor = data.mapData.bgColor;
                gameActive = true;
            }

            // 同步 Buff 元数据：确保客户端在脚本加载完成前也能显示正确的中文名和图标
            if (data.buffMeta) {
                for (const key in data.buffMeta) {
                    if (!buffRegistry[key]) {
                        buffRegistry[key] = { ...data.buffMeta[key] };
                    } else {
                        buffRegistry[key].displayName = data.buffMeta[key].displayName;
                        buffRegistry[key].icon = data.buffMeta[key].icon;
                        buffRegistry[key].description = data.buffMeta[key].description;
                    }
                }
            }

            // 客户端直接使用主机发来的 Stats (包含从主机本地读取的角色属性)
            myStats = data.clientStats;
            oppStats = data.hostStats;
            myActionPoints = data.cAP; myOverflowPoints = data.cOF;
            oppActionPoints = data.hAP; oppOverflowPoints = data.hOF;
            myMovePoints = data.cMV || 0;
            oppMovePoints = data.hMV || 0;
            mapGrid = data.mapData.grid;
            mapEffects = data.mapEffects || []; // 同步地图效果
            mapBgColor = data.mapData.bgColor;
            myPos = data.clientPos; oppPos = data.hostPos;
            currentRound = data.round; currentTurn = data.turn;

            if (data.actionType === 'game_over') checkGameOver();

            // 客户端自动补全：检查同步过来的 Stats 中是否有未加载的 Buff
            if (myStats.activeBuffs) myStats.activeBuffs.forEach(b => ensureBuffLoaded(b.name));
            if (oppStats.activeBuffs) oppStats.activeBuffs.forEach(b => ensureBuffLoaded(b.name));
        }
    }
    drawCharacters(); updateHPDisplay(); updateStatusText();
}

// 检查攻击路径是否被墙体阻挡
function isPathBlocked(r1, c1, r2, c2) {
    const dr = Math.abs(r2 - r1);
    const dc = Math.abs(c2 - c1);
    const steps = Math.max(dr, dc); // 取行列差值的最大值作为步数
    if (steps === 0) return false;

    // 核心修改：循环条件改为 i < steps，只检查路径中间的障碍
    // 这样如果终点 (steps) 是墙体，它本身不会导致路径被判定为“阻挡”
    for (let i = 1; i < steps; i++) {
        const t = i / steps;
        // 使用四舍五入获取路径上最接近的网格点
        const r = Math.round(r1 + (r2 - r1) * t);
        const c = Math.round(c1 + (c2 - c1) * t);

        // 如果路径中间有墙体(2)，则判定为阻塞
        if (mapGrid[r] && mapGrid[r][c] === 2) return true;
    }
    return false;
}

function checkGameOver() {
    if (!gameActive) return false;
    const iDied = myStats.hp <= 0;
    const oppDied = oppStats.hp <= 0;

    if (iDied && oppDied) {
        // 平手判定：双方在同一轮结算点均死亡
        gameActive = false;
        statusDiv.innerText = "对局结束，双方同归于尽，平局！";
        statusDiv.style.backgroundColor = "#fff3e0";
        statusDiv.style.color = "#ef6c00";
        returnBtn.style.display = 'block';
        if (isHost) sendState('game_over');
        return true;
    } else if (iDied || oppDied) {
        // 胜负判定
        gameActive = false;
        const winner = oppDied ? "我方" : "敌方";
        statusDiv.innerText = `对局结束，${winner} 获胜！`;
        statusDiv.style.backgroundColor = "#ffebee";
        statusDiv.style.color = "#d32f2f";
        returnBtn.style.display = 'block';
        if (isHost) sendState('game_over');
        return true;
    }
    return false;
}

function updateStatusText() {
    if (!gameActive) return;
    const isMyTurn = (currentTurn === myColor);
    statusDiv.innerText = isMyTurn ? `轮到我方 (AP: ${myActionPoints})` : "敌方回合中...";
}

// 8. 鼠标点击事件
canvas.addEventListener('mousedown', (e) => {
    if (!gameActive || currentTurn !== myColor) return;

    const rect = canvas.getBoundingClientRect();
    // 修正坐标映射：考虑到 CSS 缩放
    const x = (e.clientX - rect.left) * (canvas.width / rect.width);
    const y = (e.clientY - rect.top) * (canvas.height / rect.height);

    // 计算最近的网格点
    const col = Math.round((x - PADDING) / CELL_SIZE);
    const row = Math.round((y - PADDING) / CELL_SIZE);

    // 如果处于技能预选模式，点击棋盘选择目标
    if (selectedSkillIndex !== null) {
        const skill = myStats.skills[selectedSkillIndex];

        // 如果是固定范围技能（round 或 self），不允许通过点击棋盘更改目标
        const isFixed = skill.rangeType === 'round' || skill.rangeType === 'self';
        if (isFixed) return;

        if (checkSkillRange(myPos.r, myPos.c, row, col, skill.range, skill.rangeType)) {
            selectedTargetPos = { r: row, c: col };
            drawCharacters();
            updateHPDisplay();
        }
        return;
    }

    const distR = Math.abs(row - myPos.r);
    const distC = Math.abs(col - myPos.c);
    const atkType = myStats.atkRangeType || 'line';

    if (isHost) {
        if (isAtkMode) {
            if (myActionPoints <= 0) return; // 攻击模式必须有 AP
            
            // 普攻范围检查
            if (!checkSkillRange(myPos.r, myPos.c, row, col, myStats.atkRange, atkType)) return;

            const affected = getAffectedTiles(myPos.r, myPos.c, row, col, myStats.atkRange, atkType);
            const hitOpp = affected.some(t => t.r === oppPos.r && t.c === oppPos.c);

            if (hitOpp && (atkType === 'projectile' || !isPathBlocked(myPos.r, myPos.c, row, col))) {
                    // 命中校验
                    const isMiss = oppStats.activeBuffs && oppStats.activeBuffs.some(b => buffRegistry[b.name]?.effect?.isMiss);
                    if (!isMiss) {
                        const armor = calculateArmor(oppStats);
                        let finalDmg = (myStats.atkDmg || 20) - armor;
                        applyDamage(oppStats, finalDmg, 'attack');
                        addLog(`[命中] 我方 发起普攻，命中 敌方 造成 ${finalDmg} 伤害 (抵扣护甲: ${armor})`);
                    } else {
                        addLog(`[闪避] 我方的进攻落空了，敌方 未受损伤。`, '#666');
                    }
                    myActionPoints--;
                    selectedTargetPos = null; // 攻击后清除预览
            }
        } else if (distR + distC === 1) { // 移动逻辑
            if (myActionPoints <= 0 && myMovePoints <= 0) return; // 移动模式必须有 AP 或 MP
            const targetTile = mapGrid[row][col];
            if (targetTile !== 1 && targetTile !== 2) {
                myPos = { r: row, c: col }; 
                addLog(`[行动] 我方 移动至坐标 [${row}, ${col}]`, '#607d8b');
                if (myMovePoints > 0) myMovePoints--; else myActionPoints--;
            }
        }

        // 确保在自动结束回合前，渲染最后一次操作的结果
        drawCharacters(); 
        updateHPDisplay(); 
        updateStatusText();
        sendState('state_sync');

        // 修正：我方移动点未耗尽时，不自动结束回合
        if (myActionPoints <= 0 && myMovePoints <= 0) {
            settleMapEffects(myColor);
            currentTurn = (myColor === 'black' ? 'white' : 'black'); // 自动切换到对方颜色
            startMyTurn();
        }
    } else {
        // 客户端本地预检：防止发送穿墙或跨格移动的非法请求
        if (isAtkMode) {
            if (!checkSkillRange(myPos.r, myPos.c, row, col, myStats.atkRange, atkType)) return;
        } else {
            const targetTile = mapGrid[row][col];
            if (distR + distC !== 1 || targetTile === 1 || targetTile === 2) return;
        }
        conn.send({ type: 'action', actionType: 'client_request_action', row, col, intent: isAtkMode ? 'attack' : 'move' });
    }
});

// 辅助：复制 ID
copyBtn.addEventListener('click', () => {
    const id = myIdDisplay.innerText;
    navigator.clipboard.writeText(id).then(() => {
        alert("ID 已复制到剪贴板");
    });
});

// 辅助：重置游戏
function resetGame() {
    // 清空战斗记录
    const logBox = document.getElementById('game-log');
    if (logBox) logBox.innerHTML = '<div style="color: #999; text-align: center;">--- 战斗记录 ---</div>';
    addLog("对局初始化成功", "#2196f3");

    currentRound = 0; // 显式重置轮次，确保从0开始计算
    // 重置所有行动点和溢出点，防止上一局数据残留
    myActionPoints = 0;
    myOverflowPoints = 0;
    oppActionPoints = 0;
    oppOverflowPoints = 0;

    currentTurn = firstMoveColor;
    isRoundDecDone = false; // 重置结算标志
    gameActive = true;

    if (isHost) {
        if (isDebugMode) {
            myPos = { r: 7, c: 7 };
            oppPos = { r: 7, c: 8 };
        } else {
            myPos = (firstMoveColor === 'black') ? { r: 0, c: 0 } : { r: 14, c: 14 };
            oppPos = (firstMoveColor === 'black') ? { r: 14, c: 14 } : { r: 0, c: 0 };
        }
        // 主机必须启动回合逻辑，以初始化第一位玩家的 AP、轮次(1)以及处理CD结算
        startMyTurn();
    }

    drawCharacters(); updateHPDisplay(); updateStatusText();
}

// 鼠标悬停展示地图区域效果详情
canvas.addEventListener('mousemove', (e) => {
    if (!gameActive) return;
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (canvas.width / rect.width);
    const y = (e.clientY - rect.top) * (canvas.height / rect.height);
    const col = Math.round((x - PADDING) / CELL_SIZE);
    const row = Math.round((y - PADDING) / CELL_SIZE);

    // 查找当前格子所有的地图效果
    const matchingEffects = mapEffects.filter(eff => eff.tiles.some(t => t.r === row && t.c === col));
    const tip = document.getElementById('buff-desc-tip');
    
    if (matchingEffects.length > 0) {
        // 拼接所有重叠区域详情
        tip.innerHTML = matchingEffects.map(effect => 
            `<div style="margin-bottom:5px; padding-bottom:5px; border-bottom:1px solid #eee;">
                <strong style="color:#e65100">区域效果: ${effect.displayName}</strong> (剩余 ${effect.duration} 轮)<br>${effect.description}
            </div>`
        ).join('');
        tip.style.display = 'block';
    } else {
        // 如果当前提示框显示的是区域效果且鼠标移出了，则隐藏
        if (tip.style.display === 'block' && tip.innerHTML.includes('区域效果')) {
            tip.style.display = 'none';
        }
    }
});

// 启动
drawBoard();
initPeer();
