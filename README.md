# Greybox Arena · 证据暗战

[中文](#中文) · [English](#english) · [Play / 开始调查](https://greybox-arena.zsf197176.chatgpt.site/)

## 中文

Greybox Arena 是一款使用 GenLayer 裁决的五关证据策略游戏。玩家单人调查虚构案件，选择有来源的证据和反驳策略。每局提交到同一份 [EvidenceCourt 合约](https://explorer-studio.genlayer.com/address/0x4CB540105c519Ce23912e2Edad5f4c34f25A9D2A)；合约读取材料、让验证节点复核事实，再按公开规则判定策略是否成立。前端无法自行宣布链上胜场。

五关共 28 份证据、9 条成立路线。关卡各有一种主要操作：互证、重排时间线、标记图像细节、追踪报道来源、分配救援能源。所有案卷均为虚构；网页材料、图像、规则和摘要按版本发布，带有固定哈希。这些记录是**游戏内的原始材料**，不代表现实世界的遥测或新闻。

| 关卡 | 玩家需要解决的问题 |
|---|---|
| 失联空间站 | 找到两份独立材料，证明关键设备仍在运转 |
| 零点货运 | 把不同计时方式还原成正确顺序 |
| 借来的现场 | 核对图像里的编号或拍摄日期 |
| 回声警报 | 区分独立报道与同源转载 |
| 最后一艘救援艇 | 在五格能源内选定安全路线 |

### 试玩与链上流程

1. [打开游戏](https://greybox-arena.zsf197176.chatgpt.site/)，任选一关，阅读证物，选择证据、反驳与本关需要的额外操作。
2. 点击“签署本局鉴证”。在 Studionet 连接浏览器钱包，确认交易；真实提交需要测试币。玩家不需要部署合约。
3. 在“我的战报”查看交易哈希和裁决阶段。`ACCEPTED` 只显示暂定结果；成功 `FINALIZED` 后从合约读取最终局面，链上胜场以 `get_score` 为准。等待时可以调查其他关卡。

前端在签名前核验合约引擎、案件版本与清单哈希，然后调用 `submit_round`。材料提取由模型执行，验证节点独立复核；规则根据已核实的事实判断 `PROVED`、`NOT_PROVED` 或 `INCONCLUSIVE`。交易执行成功与游戏证据成立是两件事：一次成功的链上交易可以得到 `NOT_PROVED`。

Studionet 合约由发布者在 Normal (Full Consensus) 模式下部署：[部署交易](https://explorer-studio.genlayer.com/tx/0x4f60c1832bf82a84be02dd78bcd4726d421cd49cfada9b07421218f41ad65208)。五关已有 10 笔玩家签名对局全部 `FINALIZED` / GenVM SUCCESS，其中 6 次 `PROVED`、4 次 `NOT_PROVED`。[验证记录](docs/verification.md)逐笔链接成功与失败路径，也区分真实链上结果和本地模拟测试。

### 源码与运行

| 路径 | 内容 |
|---|---|
| `app/campaign-game.tsx`, `app/campaign.css` | 完整中英双语游戏界面、五关交互和结果展示 |
| `app/campaign-chain.ts` | 钱包、链上清单核验、签名、交易状态、最终成绩 |
| `app/campaign-audio.ts` | 玩家主动开启的程序化环境音乐 |
| `data/campaign.json`, `public/campaign/` | 案卷、固定证据文件、图像与链上清单 |
| `contracts/EvidenceCourt.py` | 共用证据裁决合约；[接口说明](docs/evidence-court-guide.md) |
| `scripts/build-campaign.py` | 从内容定义生成游戏数据、哈希与清单 |
| `scripts/verify-campaign.mjs`, `tests/` | 清单、九条路线、交易生命周期和 GenVM 测试 |

需要 Node.js 22.13+、pnpm 11.25+。在仓库根目录运行：

```bash
corepack enable
pnpm install --frozen-lockfile
pnpm dev
```

浏览器打开终端显示的本地地址。这个本地副本默认读取**已部署**的 Studionet 合约及生产站点上的固定证物；只有在钱包里确认签名才会发起真实交易。检验源码和案卷：

线上站点使用托管平台的构建适配器；本仓库保留完整游戏逻辑、素材和合约，改用标准 Next.js 脚本供独立运行，不包含托管平台的项目 ID。

```bash
pnpm typecheck
pnpm verify
pnpm build
python -m pip install -r requirements-contract-tests.txt
python -m pytest -q tests/test_evidence_court.py
```

Python 测试用替身响应覆盖模型和网页分支；通过测试不等于新的链上结果。图片证物是针对虚构案件制作的扫描板，环境音乐由浏览器代码合成，场景图片随项目提供。页面支持中英切换、键盘焦点、窄屏和减少动态效果设置。

### 更新案卷

新内容使用新的案件 ID 或版本号，以发布者身份写入同一份 EvidenceCourt；已发布版本不能覆盖。维护者需要将材料放在稳定地址、固定字节哈希，生成新清单，重新验证路线，再让前端指向已注册的新版本。后续维护重点是确保旧材料仍可读取、随 SDK 更新复核交易状态处理，并按相同流程追加新的案件。旧版玩家记录仍可按原版本查询。[接口和边界说明](docs/evidence-court-guide.md)列出证据大小、席位和发布上限。

目前五关都是经过设计的虚构材料，不能用来证明对真实世界新闻的判断准确率。最终结果依赖网络共识，等待时间不固定；Bradbury 尚未部署。这一仓库展示完整可玩的产品和实际前端链上流程；同一 EvidenceCourt 合约也可作为独立组件复用。

## English

Greybox Arena is a five-case evidence strategy game settled by GenLayer. A player investigates fictional records, chooses evidence and a rebuttal, then signs a round against one [shared EvidenceCourt contract](https://explorer-studio.genlayer.com/address/0x4CB540105c519Ce23912e2Edad5f4c34f25A9D2A). Validators check model-derived facts; published rules determine whether the strategy is proved. The frontend cannot award an onchain win on its own.

The five cases cover corroboration, time reconstruction, image verification, source tracing and rescue resource allocation. They contain 28 exhibits and nine winning routes. The records are authored **fictional case materials**, with versioned manifests and pinned text/image bytes; they are not claims about actual news or telemetry.

Open the [live game](https://greybox-arena.zsf197176.chatgpt.site/), inspect a case and prepare a strategy. A browser wallet and Studionet test tokens are needed to sign a round. The app checks the engine identity and case hash before signing, submits `submit_round`, displays the transaction hash and provisional status, then reads the final onchain result and score. While consensus is pending, the player can inspect the other cases. Players share the existing deployment and never deploy their own copy.

[The deployment transaction](https://explorer-studio.genlayer.com/tx/0x4f60c1832bf82a84be02dd78bcd4726d421cd49cfada9b07421218f41ad65208) is FINALIZED in Normal (Full Consensus) mode on Studionet. Ten signed rounds across all five cases are FINALIZED / GenVM SUCCESS: six `PROVED`, four `NOT_PROVED`. [Verification](docs/verification.md) links each receipt and separates these live outcomes from mocked local tests. `ACCEPTED` is provisional; a successful contract transaction can legitimately return `NOT_PROVED` as the game verdict.

For a local copy, use Node.js 22.13+ and pnpm 11.25+, then run `corepack enable`, `pnpm install --frozen-lockfile`, and `pnpm dev`. Run `pnpm typecheck`, `pnpm verify`, and `pnpm build` for the frontend and campaign. The Python GenVM tests require `requirements-contract-tests.txt` and run with `python -m pytest -q tests/test_evidence_court.py`. The local site still points to the published Studionet engine and pinned production evidence; only a wallet signature submits a real transaction. The live site uses a hosting-specific build adapter; this standalone repository includes the full game logic and assets with standard Next.js scripts, omitting the host's project ID.

The app lives in `app/campaign-game.tsx` and `app/campaign-chain.ts`, authored cases in `data/campaign.json`, immutable artifacts in `public/campaign/`, the engine in `contracts/EvidenceCourt.py`, and the content builder in `scripts/build-campaign.py`. [The bilingual contract guide](docs/evidence-court-guide.md) explains the versioned publisher registry and extension limits. New cases or rule changes require a new version, stable source URLs and byte hashes, a registered onchain manifest, and route verification. Existing versions remain readable. Consensus timing varies; no Bradbury deployment is claimed.
