Custom Chess / 自定义棋

English | 简体中文

English

Introduction

Custom Chess is a web-based, turn-based strategy game played on a 15x15 grid. Players connect directly via a Peer-to-Peer (P2P) network, choose their unique characters, and battle using strategic positioning, terrain manipulation, and character-specific skills.

1. Getting Started & Connection

The game uses a direct P2P connection (Host and Client).

Player A (Client): Open the game, copy your generated "My ID", and share it with Player B.

Player B (Host): Paste Player A's ID into the input box and click Connect.

Setup: Once connected, both players select their characters and a map. The Host can claim the first move. Click Ready to start the match.

2. Core Mechanics

Resources

⚡ Action Points (AP): Resets to 1 at the start of your turn. Moving, basic attacking, and using most skills cost 1 AP.

🏃 Movement Points (MP): Provided by certain buffs. Moving consumes MP first. Once MP is depleted, moving will consume AP.

💥 Overflow (The Burst Mechanic): Each character has an "Overflow Threshold".

Every turn you start outside of Mud terrain, your Overflow increases by 1.

When Overflow reaches the threshold, it resets to 0 and grants you +1 extra AP for that turn (giving you 2 AP total for a burst combo).

🛡️ Armor: Flat damage reduction applied to each hit of an attack or skill.

Terrain / Tiles

Plain (Default): Normal tiles.

Water (Light Blue): Cannot be walked on or stopped at. Can only be crossed using "Rush" type skills.

Wall (Gray): Absolute obstacle. Blocks movement, basic attacks, and "Projectile" or "Pierce" skills.

Mud (Brown): Starting your turn on Mud prevents you from gaining an Overflow point for that turn.

3. Controls & Actions

Movement: By default, you are in Movement Mode. Click on an adjacent cross-directional tile (up, down, left, right) to move your character one step.

Basic Attack: Click the "Movement Mode" button to toggle it to the red Attack Mode. The attack range will be highlighted in pink. Click a target within range to attack.

Skills:

Click an available skill on the right panel (numbers in parentheses indicate Cooldown turns).

The skill range will highlight in purple.

Click a target tile, then click Confirm Skill (确定释放) to cast.

End Turn: Click the "End Turn" button when you are out of AP/MP. Note: Some powerful skills have a consumeTurn: true property, which instantly ends your turn upon casting, regardless of remaining AP.

4. Advanced Mechanics (Example: Swordsman)

Understanding character stats and buffs is the key to victory. Let's look at the standard melee character, the Swordsman:

Stats: HP: 100 | Overflow: 3 | Basic Attack: 12 DMG | Range: 1

Whirlwind (Skill): Deals 8*3 damage in a 3x3 area around the caster. Since it hits 3 times, enemy armor will reduce the damage 3 times!

Armor Pierce (Skill): Deals 20 DMG and applies 4 stacks of armorShred for 3 turns.

Buff Synergy: Each stack of armorShred reduces enemy armor by 1. Hitting an enemy with Armor Pierce strips 4 Armor, making your next Whirlwind devastating!

Dash (Skill): Rushes up to 3 tiles (can cross water). Ends your turn immediately. Great for closing the gap to set up a combo for the next turn.

简体中文

简介

《自定义棋》是一款基于网页的 15x15 网格回合制双人战棋游戏。玩家通过 P2P 点对点网络进行直连，选择具有专属技能的角色，利用地形与资源博弈来击败对手。

1. 连接与开局

游戏采用点对点直连（分为主机与客机）。

玩家 A（客机）：打开网页，复制界面上显示的“我的 ID”，将其发给玩家 B。

玩家 B（主机）：将玩家 A 的 ID 输入到“输入对方 ID”框中，点击连接。

准备：连接成功后，双方选择角色与地图。主机可点击“我要先手”抢夺优先行动权。双方点击准备并开始即可进入对局。

2. 核心机制

资源系统

⚡ 行动点 (AP)：每回合开始时重置为 1 点。移动、普攻和释放普通技能均需消耗 1 点 AP。

🏃 移动点 (MP)：部分 Buff 会提供 MP。移动时优先消耗 MP，MP 耗尽后再扣除 AP。

💥 溢出点 (Overflow)：爆发机制。每个角色有不同的“溢出需求”。

只要回合开始时你不在泥泞地形上，溢出点 +1。

达到上限时，溢出点清零，并为你本回合额外提供 1 点 AP（本回合将拥有 2 AP，可进行连招）。

🛡️ 护甲 (Armor)：按固定数值抵扣受到的伤害。对于多段伤害技能，护甲会对每一段伤害独立生效。

地形系统

平地 (默认)：无特殊影响。

水域 (浅蓝色)：无法跨步进入或停留，仅能使用“冲刺(Rush)”类技能越过。

墙体 (灰色)：绝对阻挡。角色无法通过，且阻挡“弹道”与“直线”类技能/普攻的判定。

泥泞 (棕色)：若回合开始时站在泥泞地上，本回合无法获得溢出点。

3. 操作指南

移动：默认处于移动模式。直接点击自身周围相邻的十字格子（上下左右）即可消耗点数移动一步。

攻击：点击右侧面板的模式按钮切换至红色的攻击模式。棋盘会以粉色高亮普攻范围，点击范围内敌人即可攻击。

释放技能：

点击右侧冷却完毕的技能（括号内为冷却轮数）。

棋盘会以紫色高亮射程，点击你想作为目标的格子。

点击新出现的确定释放按钮施展技能。

结束回合：点数耗尽时手动点击“结束回合”。注意：部分强力技能带有 consumeTurn: true 属性，释放后会无视剩余点数，强制结束当前回合。

4. 进阶机制解析（以【剑士】为例）

理解技能与状态（Buff）的联动是致胜关键。以标准近战角色【剑士】为例：

基础属性：HP 100 | 溢出需求 3 | 普攻伤害 12 | 普攻距离 1

技能：旋风斩：对周身 3x3 范围造成 8*3 的伤害。因为是 3 段伤害，如果目标有护甲，每段伤害都会被减免！

技能：破甲一击：造成 20 伤害，并施加 3 轮共 4 层的 armorShred (碎甲)。

状态联动：底层逻辑中，每层碎甲减少 1 点护甲。命中后瞬间剥夺目标 4 点护甲，能让剑士后续的“旋风斩”打出极其恐怖的真实伤害。

技能：冲刺：突进 3 格，可穿过水域。释放后强制结束回合。适合作为开局的切入手段，为下一回合的贴身爆发做准备。

5. 新手博弈技巧

算准爆发回合：时刻关注左侧的状态栏。如果你当前溢出点已经快满了，可以预先走位贴身，下一轮拿到 2AP 时直接打出 破甲一击 + 旋风斩 的终极连招。

利用泥泞地卡人：把敌人逼退到泥泞地块上，可以封锁他下一回合的 AP 溢出，打断对方的爆发节奏。

墙体规避：面对远程射手时，将自己藏在灰色墙体后方。墙体会阻挡一切弹道，迫使敌人主动走近你。
