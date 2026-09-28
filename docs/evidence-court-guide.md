# EvidenceCourt v1 — 可复用证据裁决合约 / Reusable evidence adjudicator

[中文](#中文) · [English](#english)

## 中文

### 这份合约解决什么

EvidenceCourt 将“读取证据、核验事实、执行公开规则、保存裁决”拆成可复用的流程。游戏是它的第一个使用者。其他开发者可以在同一个合约里登记自己的案件，不需要复制整套游戏，也不需要每局或每位玩家部署合约。

它适合有明确案卷和有限规则的取证游戏、教学练习与模拟评审。当前不是任意现实争议的通用真相判定器。所有五关材料都是虚构内容。

### 裁决过程

1. 发布者登记案件，键为 `发布者小写地址:案件ID:版本号`。旧版不能覆盖；修改案卷发布新版本。
2. 玩家选择证据、反驳方式，以及该案需要的时间顺序、图像区域或能源分配。
3. 合约先检查席位、预算、重复证据、选项及图片哈希。不合法的输入在调用模型前被拒绝。
4. 领头节点读取登记的材料。网页必须与固定 SHA-256 一致；图片由玩家提交字节并核对哈希。模型只回答各证据对应的有限事实问题。
5. 验证节点独立重新读取材料、提取事实，并比较规范化结果。不是只检查结果格式，也不是只比较 AI 说“赢”还是“输”。
6. 在一致事实之上，确定性代码核对策略规则，写入 `PROVED`、`NOT_PROVED` 或 `INCONCLUSIVE`、证据观察、规则哈希、选择哈希和玩家记录。

没有有效的模型输出会使执行失败。材料缺失或哈希变化返回 `INCONCLUSIVE`，不会把无法读取的证据当作有效证明。

### 可扩展的边界

现有规则支持：有限证据预算、证据席位、相关独立来源数、反驳方式、目标路线、图像区域、事件顺序、整数资源配额、多条获胜路线。

在这些规则内增加第六关或新主题，只需增加案卷、调用 `publish_cases` 并更新前端案卷列表；旧合约和旧战报可以继续使用。增加新的规则类型、秘密证据、实时多人状态或付费奖励，需要新的引擎设计和对应测试，不能仅靠加一条案卷配置实现。

### 接口

| 方法 | 参数 | 用途 |
|---|---|---|
| 构造函数 | `initial_cases_json: str` | 首次部署登记 0–8 个案卷 |
| `publish_cases` | `manifests_json: str` | 在调用者自己的命名空间发布新案卷/版本 |
| `get_engine` | 无 | 引擎标识、版本、初始发布者和案件总数 |
| `get_catalog` | `publisher: str` | 指定发布者的所有案件键 |
| `get_case` | `case_key: str` | 原始案卷、哈希及发布者 |
| `submit_round` | `round_id, case_key, selection_json, image_data` | 提交一局，返回局号 |
| `get_round` | `player: str, round_id: str` | 读取该玩家的本局裁决 |
| `get_score` | `player: str, case_key: str` | 尝试数、成立数、无法核验数 |

读写方法返回 JSON 字符串，`submit_round` 返回局号。局号为 32 个小写十六进制字符，同一玩家不能重复使用。选择格式：

```json
{"evidence":["s1-power","s1-order"],"tactic":"uncrewed","target":"overturn","focus":"","sequence":[],"allocation":{},"argument":""}
```

`argument` 是可选的公开存档备注，上限 300 字符，不影响胜负，也不参与模型事实提取。当前界面省去了这个非必要输入。

图片按所选图像证据 ID 的字典序传入 `image_data`，最多两张，每张 120,000 字节以内。网页响应上限 16,000 字节。一个案件最多 12 份证据、16 个事实问题、8 条获胜路线；最多选择 6 份证据。每位发布者最多登记 64 个案件版本。

### 如何新增一关

1. 参考 `examples/standalone-case.json`，或五关的 `public/campaign/manifests.json`。给新案卷分配 `id` 和 `version`。
2. 写清事实问题，并为每份证据设置 `checks`。图片说明保持中性，答案必须能从像素读出。一个证据的模型判断只可以支持它自己对应的事实。
3. 为材料声明 `group`。同一通报的转载必须属于同一组；独立来源数只统计为该获胜路线提供相关事实的材料。
4. 设置至少一条能实现的 `routes`。每条都必须填写 `facts/tactic/target/min_groups/focus/sequence/allocation`；无适用机制时用空字符串、空数组或空对象。
5. 网页/图片放在稳定公开 HTTPS 地址，计算原始字节的 SHA-256，写进案卷。修改图片或文字后必须发布新的案卷版本。
6. 用发布者钱包调用 `publish_cases(JSON数组字符串)`。其他发布者即使用相同案号也不会覆盖你的案件。
7. 前端增加双语标题、说明和控件，使用登记后的案卷哈希。`scripts/build-campaign.py` 展示了怎样从一份内容定义生成前端数据与链上清单。
8. 验证成功、失败、材料不可读和事实不一致等路径，然后做真实网络测试。

内容文件保留的 `truth` 标注只供开发测试；它不进入链上案卷，也不参与网页裁决。每局真实游玩都由链上模型从材料提取事实。需要通过真实对局评估题目是否清晰、模型是否稳定。

### 已部署的共享赛场与 Studio 验证

Studionet（链 ID 61999）已有一份成功部署的共享合约，无需为五关重复部署：[合约 `0x4CB540105c519Ce23912e2Edad5f4c34f25A9D2A`](https://explorer-studio.genlayer.com/address/0x4CB540105c519Ce23912e2Edad5f4c34f25A9D2A)、[部署交易 `0x4f60c1832bf82a84be02dd78bcd4726d421cd49cfada9b07421218f41ad65208`](https://explorer-studio.genlayer.com/tx/0x4f60c1832bf82a84be02dd78bcd4726d421cd49cfada9b07421218f41ad65208)，发布者 `0x22Acaa233b7b985b36ef168F2DE9295334065B15`。交易在 Normal (Full Consensus) 模式下 FINALIZED，GenVM SUCCESS。已经读回 `get_engine`（版本 1、案件数 5）、`get_catalog` 及五份 `get_case`；全部案卷哈希与项目资料逐一相符。

如要在 [GenLayer Studio](https://studio.genlayer.com/) 里继续按剧情守门人的流程验证，可使用“按地址加载已部署合约”，输入上述合约地址，在 Studionet 选择 Normal (Full Consensus)，先读 `get_engine`、`get_catalog(发布者)`、`get_case(案卷键)`；真实测试局调用 `submit_round`，再用 `get_round` / `get_score` 查看状态。这份合约已经成功部署，不要为了导入 Studio 再点击 Deploy。

玩家网页已从 `public/evidence-protocol.json` 读取这一共享合约。五关均已实际签署两局，共十笔交易全部 FINALIZED / SUCCESS；逐局 `get_round` 读回 6 次 `PROVED`、4 次 `NOT_PROVED`，并与五关 `get_score` 相符。[真实交易凭据与逐关结果](verification.md)。网页材料异常和节点分歧路径仍只有本地测试，不冒充真实交易。

```json
{
  "version":1,
  "active":"studionet",
  "networks":{
  "studionet":{"address":"0x4CB540105c519Ce23912e2Edad5f4c34f25A9D2A","publisher":"0x22Acaa233b7b985b36ef168F2DE9295334065B15"},
    "bradbury":{"address":"","publisher":""}
  }
}
```

后续换到 Bradbury 时需要在目标网络单独部署并登记案件，原网络交易不会迁移。当前游戏只开放 Studionet 61999，Bradbury 尚无共享地址。

所有网页裁决都是正式测试网交易，需要钱包签名及网络要求的测试币，不能承诺零费用或固定裁决时长。无需其他玩家，也无需自行部署合约。不要把 `ACCEPTED` 当最终结果：前端会标记暂定裁决，成功 `FINALIZED` 后才记入战绩。发生重裁时会清除旧的暂定事实展示。

### 信任模型与当前验证范围

- 案件发布者决定事实问题和规则，可能设计有偏的案件。界面必须选择可信发布者并核对案卷哈希。
- `group` 是发布者对来源关系的声明，不是自动验证的现实机构身份。
- 哈希保证材料字节一致，不能证明现实世界里的材料真实。
- 验证节点独立推断能发现分歧，但不保证模型永不犯错。严格比较支持事实集合可能产生共识分歧。
- 案件与策略公开，可查阅答案或重复游玩。成绩不是反作弊竞技排名，也不关联资产、奖金或贡献积分发放。
- 本版完成 26 项 GenVM 直接执行测试，模型及网页由测试替身提供；浏览器验证全部五关、9 条路线、失败纠错、双语与窄屏。真实网络部署及 10 次玩家对局已验证；其他路线、材料不可用、验证节点分歧的真实网络稳定性仍未全面验证，不承诺固定延迟。

### 可复现检查

```bash
pnpm exec tsc --noEmit
node scripts/verify-campaign.mjs
python -m pip install -r requirements-contract-tests.txt
python -m pytest -q tests/test_evidence_court.py
```

若测试框架自动下载旧 GenVM 归档遇到 404，可使用相同版本的备用下载器：

```bash
genvm-lint download -v v0.3.0-rc7
mkdir -p ~/.cache/gltest-direct
cp ~/.cache/genvm-linter/genvm-universal-v0.3.0-rc7.tar.xz ~/.cache/gltest-direct/genvm-universal-v0.3.0-rc7.tar.xz
```

以上为本次 Linux 测试环境的恢复方式，不需要玩家执行。

## English

### Purpose and workflow

EvidenceCourt is a reusable registry and adjudicator for bounded, curated evidence cases. Greybox Arena is its first client. Other publishers can register cases in the same deployed engine without copying the game or deploying a contract for every player/round. The five supplied cases are fictional; this is not an unrestricted real-world truth oracle.

Cases use keys `<lowercase publisher address>:<case id>:<version>`. Registered versions are immutable. Players submit evidence and structured actions. The contract checks budgets, slots, identifiers, options and image hashes before any model call. Web sources must match their pinned byte hashes. The leader extracts supported facts from each source; validators independently retrieve the sources, repeat the extraction and compare normalized observations. Deterministic rules then derive `PROVED`, `NOT_PROVED` or `INCONCLUSIVE` and store the result with provenance.

Invalid model output cannot settle a successful case. Missing or changed source bytes yield `INCONCLUSIVE`. Model wording is not compared; the supported fact sets are.

### Reuse and extension

Supported primitives are evidence cost/slots, relevant source-group thresholds, tactics, targets, focus regions, event ordering, integer resource allocation and alternative winning routes. Add new content using these primitives with `publish_cases`, then update the client catalog. New gameplay primitives, secret evidence, multiplayer state or economic rewards require additional engine design and tests.

The standalone example in `examples/standalone-case.json` is independent of the game's interface. Full manifests are in `public/campaign/manifests.json`. The constructor accepts a JSON string containing zero to eight manifests. Any caller can publish within their own namespace; another publisher cannot replace your case. Each publisher can register up to 64 versions.

### API and input

| Method | Arguments | Result |
|---|---|---|
| constructor | `initial_cases_json: str` | Registers initial cases |
| `publish_cases` | `manifests_json: str` | JSON list of new case keys |
| `get_engine` | none | Engine/version/publisher/count JSON |
| `get_catalog` | `publisher: str` | JSON list of case keys |
| `get_case` | `case_key: str` | Manifest, publisher and hash JSON |
| `submit_round` | `round_id: str, case_key: str, selection_json: str, image_data: list[bytes]` | Round ID |
| `get_round` | `player: str, round_id: str` | Recorded round JSON |
| `get_score` | `player: str, case_key: str` | Attempts, wins and inconclusive count JSON |

Use a fresh 32-character lowercase hexadecimal round ID per player. The selection example in the Chinese section is language-independent. `argument` is an optional public archival note of at most 300 characters; it does not affect scoring or fact extraction. The current interface omits it.

Pass image bytes in lexicographic order of selected image exhibit IDs: at most two images, each at most 120,000 bytes. Web responses are limited to 16,000 bytes. A case has at most 12 exhibits, 16 facts, eight routes and six submitted exhibits.

Each route must include `facts`, `tactic`, `target`, `min_groups`, `focus`, `sequence` and `allocation`; use empty values for unused mechanics. Only evidence that supports a route's required facts contributes to its source-group count.

### Publishing new content

1. Assign the case ID/version and write bounded fact questions.
2. Define each exhibit's `checks`, cost and declared source group. Image captions should not reveal the answer; facts must be visible in the pixels.
3. Define realizable winning routes and failure examples.
4. Host web/image bytes at stable public HTTPS locations and pin SHA-256 hashes. Changed bytes require a new case version.
5. Publish a JSON array string using the publisher's wallet and `publish_cases`.
6. Add bilingual client presentation; verify the registered manifest hash before submission. The client reads the version from the manifest.
7. Test successful/failed strategies, unavailable sources and validator disagreement, then perform real network trials.

The content file's `truth` annotations are used only in development tests. They never enter the contract manifest or adjudicate web gameplay. Each live case extracts facts from the sources; evaluate clarity and model agreement on real transactions.

### Shared deployment and Studio verification

The shared [Studionet contract](https://explorer-studio.genlayer.com/address/0x4CB540105c519Ce23912e2Edad5f4c34f25A9D2A) was deployed by `0x22Acaa233b7b985b36ef168F2DE9295334065B15`. Its [transaction](https://explorer-studio.genlayer.com/tx/0x4f60c1832bf82a84be02dd78bcd4726d421cd49cfada9b07421218f41ad65208) is FINALIZED with GenVM SUCCESS in Normal (Full Consensus) mode. `get_engine` reports version 1 and five cases; `get_catalog` and all five `get_case` hashes match the local manifests.

In [GenLayer Studio](https://studio.genlayer.com/), load this already deployed address on Studionet and read `get_engine`, `get_catalog(publisher)` and each `get_case(key)`. To test live adjudication, sign a `submit_round` write, then read `get_round` and `get_score`. Do not redeploy this same five-case contract just to open it in Studio. The website reads its shared address from `public/evidence-protocol.json`; players never deploy per round or per person.

Ten signed player rounds are now FINALIZED / SUCCESS on Studionet: each of the five cases has two attempts, with six `PROVED` and four `NOT_PROVED` verdicts read through `get_round` and cross-checked with `get_score`. The [verification record](verification.md) links all ten transactions, including an image success and losing strategies. Unavailable sources and validator disagreement have no signed live receipt yet. Bradbury (4221) needs a separate deployment and is not enabled on the game. Every web adjudication needs a wallet signature and any required test tokens. No fixed latency is promised. `ACCEPTED` and `READY_TO_FINALIZE` are provisional; only a successful `FINALIZED` result counts. Stale provisional observations are cleared if a round re-enters processing.

### Trust and validation limits

The publisher defines facts and rules and can create biased cases. Source groups are declarations, not automatically verified institutional identities. Hashes establish byte consistency, not real-world truth. Independent model extraction can disagree or be wrong. Exact fact-set comparison may prevent agreement. The cases and strategies are public and replayable; these counts are not an anti-cheat leaderboard or a token/prize/community-points mechanism.

This release passed 26 direct GenVM tests with mocked model/web responses. Prior browser QA covered all five cases, all nine locally annotated routes, losing strategies, bilingual controls and narrow layouts. A real signed deployment and ten finalized player rounds across five cases were verified; additional live routes and unavailable-source behavior remain open. The linked successful image transaction's public consensus view shows three `agree` votes and two `idle` validators; this is a transaction-specific observation, not a universal promise. Reproduction commands and the Linux GenVM cache recovery procedure appear above; players do not need to run them.
