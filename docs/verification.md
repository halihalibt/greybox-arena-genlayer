# Verification record / 验收记录

Date / 日期：2026-09-28. Scope / 范围：EvidenceCourt v1 + five-case campaign.

## Confirmed / 已确认

| Area / 范围 | Result / 结果 |
|---|---|
| GenVM contract execution / 合约执行 | 25 tests passed in 19.67s + 1 standalone reuse test in 0.04s (26 total); mocked model and web responses / 模型与网页使用测试替身 |
| Prior local route QA / 此前本地路线测试 | All five cases and all nine annotated routes completed in pre-onchain build; these are not live model wins / 五关九路线仅验证本地内容，不是链上模型胜场 |
| Losing strategies / 失败策略 | Wrong rebuttal, timeline, image focus, copied reports, mismatched rescue power all fail; correction succeeds / 五类错误均失败，修正后成功 |
| Boundaries / 边界 | Empty selection, evidence slots and power cap enforced in prior UI QA; levels are now all selectable / 空选择、席位及能源上限此前已测，现可直接选择全部关卡 |
| Persistence / 保存 | Previous QA confirmed locale/reload; current wins come from finalized onchain `get_score` / 语言刷新此前已测，当前胜场从链上最终 `get_score` 读取 |
| Languages / 双语 | Chinese main flow; English controls, route and verdict tested / 中文主流程、英文控件及结果已验证 |
| Responsive layout / 尺寸 | Actual browser document widths 345, 375, 753, 1009, 1265 px: no horizontal overflow / 上述实际宽度无横向溢出 |
| Image interaction / 图像 | Zoom, close, focus choice and visible region outline work / 放大、关闭、选择与区域标记正常 |
| Sound / 音乐 | Opt-in toggle and 0.22→0.20 volume control work; no autoplay / 开关和音量生效，默认不自动播放 |
| Motion / 动效 | Scene drift, sweep and case transitions implemented; reduced-motion override verified in source / 场景及换案动效已实现，减少动态效果规则已检查 |
| Contract deployment / 合约部署 | Studionet tx `0x4f60c183…1ad65208` FINALIZED, GenVM SUCCESS, Normal; engine v1, publisher, five catalogs and five matching hashes read onchain / 链上部署及五案哈希已验证 |
| Real player rounds / 真实玩家对局 | 10 `submit_round` transactions in Normal mode, all FINALIZED / GenVM SUCCESS; `get_round` independently checked for each; `get_score` totals 10 attempts, 6 wins, 0 inconclusive / 五关每关两局，六次成立、四次不成立 |
| Artifacts and finality / 文件与状态 | `node scripts/verify-campaign.mjs`: 5 cases, 28 exhibits, 9 routes, 10 pinned assets, identical public contract, 7 lifecycle checks / 均通过 |

## Live Studionet receipts / Studionet 真实交易

All ten transactions target the same [shared EvidenceCourt contract](https://explorer-studio.genlayer.com/address/0x4CB540105c519Ce23912e2Edad5f4c34f25A9D2A), were sent by `0x22Acaa233b7b985b36ef168F2DE9295334065B15` in Normal mode, and show FINALIZED / GenVM SUCCESS. Each verdict below was read through `get_round(player, round_id)` and checked against the decoded transaction input. `get_score(player, case_key)` was read separately for all five cases. The transaction's `Accepted` consensus result and the gameplay verdict (`PROVED` / `NOT_PROVED`) are different fields.

以下 10 笔交易都调用同一份共享合约，均在 Normal 模式下 FINALIZED、GenVM SUCCESS。逐局 `get_round` 读取的胜负与交易输入对应；五关 `get_score` 独立读回。交易层的 `Accepted` 不等于游戏判决 `PROVED`。

| Case / 案件 | PROVED receipt / 成立交易 | NOT_PROVED receipt / 不成立交易 | Onchain score / 链上成绩 |
|---|---|---|---|
| Silent Orbit / 失联空间站 | [maintenance `0x965713…`](https://explorer-studio.genlayer.com/tx/0x965713c25809d5b0f99dc677982b0ed0a1d26704ef952665c035877fd99e806a); [thermal `0xa71fc4…`](https://explorer-studio.genlayer.com/tx/0xa71fc47bebd2efc420949730e3c61086e3ac166f1e0ecff103da040ee7058de8) | — | 2 attempts, 2 wins, 0 inconclusive |
| Midnight Cargo / 零点货运 | [timebase `0x81f97f…`](https://explorer-studio.genlayer.com/tx/0x81f97f1b921ec0da350f764eeed98193c5edb829c6f4ca6f6f9b8d3f86a96aea) | [memory `0xfe5d54…`](https://explorer-studio.genlayer.com/tx/0xfe5d546c9429521e087f5bb9c26bc2b9c6ca4b922bbe146a7fd6de6ec647cd39) | 2 attempts, 1 win, 0 inconclusive |
| The Borrowed Frame / 借来的现场 | [image date `0x959a9f…`](https://explorer-studio.genlayer.com/tx/0x959a9fdc6c985b230be2dc3590df79c2c5ad6bda3f318d478ce93022338c1352) | [wrong image focus `0x84036d…`](https://explorer-studio.genlayer.com/tx/0x84036db3ee62177b71f266314202454370814afae15d22ef70df3a956cffe64a) | 2 attempts, 1 win, 0 inconclusive |
| The Echo Alarm / 回声警报 | [independent sources `0xff093b…`](https://explorer-studio.genlayer.com/tx/0xff093b647d58afb71068bb9c53fc5d70a689992dbfe8604deb13cc6140bf9b9f) | [copied reports `0x1531b8…`](https://explorer-studio.genlayer.com/tx/0x1531b8dfdc94b4c0c4098838552a14fc48c36bcff9bd329d6d1214f60e7c2fee) | 2 attempts, 1 win, 0 inconclusive |
| The Last Shuttle / 最后一艘救援艇 | [shield plan `0x3b3e31…`](https://explorer-studio.genlayer.com/tx/0x3b3e31b851139824b31fd4ce2526f4beb7633603289c0f07baa43a636315f74e) | [wait `0x5d30d9…`](https://explorer-studio.genlayer.com/tx/0x5d30d9fb6da58d22e3564b59be0d9fd8734221442f2840b82d6d3f16788c0adb) | 2 attempts, 1 win, 0 inconclusive |

The successful image round stored `old_date` and `serial17` from the submitted image plus `current_date` from an independent archive, then matched route `wrong-date`. The losing copied-reports round observed `copied` in all three articles but matched no winning route. The image transaction's public consensus view shows three `agree` and two `idle` validator votes; that observation is specific to this transaction. These results prove live consensus and onchain state for the shown routes, not a guarantee that future model runs will always reach the same result.

图像成功局从上传图片读出旧日期及序号，从独立档案读出当前日期，命中 `wrong-date` 路线；三个转载报道的失败局均读出 `copied`，没有命中任何获胜路线。图像交易的公开共识页面显示 3 个 `agree`、2 个 `idle`，仅描述该笔交易。真实对局验证了这些路线，不能保证未来每次模型判断一致。

## Fixes from acceptance / 验收中修复

- Strict configuration typing and address validation / 配置类型及地址校验。
- Readable game text, compact mobile briefing, accessible result check labels and mobile log label / 字号、手机首屏及辅助阅读标签。
- Distinct image zoom labels, visible region outline, correctly named source graph / 图像按钮命名、区域框及来源名称。
- Case version is read from the manifest; engine identity and case hash are checked before signing / 提交使用案卷版本，签署前校验引擎和案卷。
- Fixed false deployment failure when stable Studionet SDK omits `txExecutionResultName`; readable finalized engine/round state is authoritative / 修复 Studionet 未返回 SDK 执行名导致的误报。
- Malformed input and missing rule-field handling; publisher namespace isolation / 异常输入、缺失规则字段及发布者隔离。

## Remaining validation limits / 尚待验证的范围

The ten signed rounds verify both model-derived facts and finalized strategy outcomes across all five cases. The unavailable-web-source path and adversarial validator disagreement have local test coverage but no signed live receipt. No physical-device audio/listening check is claimed. Responsive checks used browser rendering in size-controlled frames, not physical phones; no fixed future consensus time is promised.

五关真实对局已验证模型提取事实和最终策略胜负。**材料不可用以及验证节点产生分歧的路径只有本地测试，没有真实签名交易凭据。**没有实体手机听感检查；此前操作过音乐开关和音量，但未录音验证。受控浏览器宽度不能替代实体手机测试，也不承诺未来固定的共识耗时。

Future live trials may add unavailable-source and validator-disagreement receipts. Keep the existing ten finalized receipts as the submission's verified scope; do not present mocked paths as live runs.

后续可以补测网页材料不可用及节点分歧；当前提交证据以这 10 笔最终确认的真实交易为准，不把测试替身路径写成上链结果。
