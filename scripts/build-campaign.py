"""Author the five cases once; export UI data and independent contract manifests."""
from pathlib import Path
import hashlib
import json
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "public/campaign"
ORIGIN = "https://greybox-arena.zsf197176.chatgpt.site"
OUT.mkdir(parents=True, exist_ok=True)

def L(zh, en): return {"zh": zh, "en": en}
def digest(raw): return hashlib.sha256(raw).hexdigest()
def canonical(obj): return json.dumps(obj, ensure_ascii=False, sort_keys=True, separators=(",", ":"))

def plate(name, title, rows, footer):
    im = Image.new("RGB", (1100, 620), "#0b1521")
    draw = ImageDraw.Draw(im)
    font_path = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
    big = ImageFont.truetype(font_path, 32)
    normal = ImageFont.truetype(font_path, 23)
    small = ImageFont.truetype(font_path, 17)
    draw.rectangle((26, 26, 1074, 594), outline="#466077", width=2)
    draw.text((55, 49), "GREYBOX / FICTIONAL EVIDENCE", font=small, fill="#8dabc4")
    draw.text((55, 92), title, font=big, fill="#e8edf3")
    for i, (label, value) in enumerate(rows):
        y = 168 + i * 80
        draw.rectangle((55, y, 1045, y+62), fill="#122536", outline="#365267")
        draw.text((76, y+17), label, font=normal, fill="#9db4c7")
        draw.text((570, y+17), value, font=normal, fill="#efbf73")
    draw.text((55, 557), footer, font=small, fill="#8dabc4")
    path = OUT / (name + ".png")
    im.save(path, optimize=True)
    return "/campaign/" + path.name, digest(path.read_bytes())

thermal = plate("thermal", "STATION 17 / THERMAL OBSERVATION", [("Captured", "2026-09-27 21:11"), ("Radiator A", "38.2 C / WARM"), ("Radiator B", "36.7 C / WARM"), ("Interpretation", "Heat may persist after stop")], "All times UTC+8. Synthetic scan for the game; not real telemetry.")
scan = plate("cargo-scan", "INSPECTION CAMERA / FRAME 077", [("Visible serial", "R17"), ("Shipment under dispute", "R71"), ("Frame timestamp", "2024-06-03 14:20"), ("Dispute date", "2026-09-27")], "A precise evidence scan. Its serial and date are visible in the pixels.")
rescue = plate("rescue-map", "CORRIDOR SCAN / RESCUE WINDOW", [("NORTH", "Debris: shield >= 3"), ("SOUTH", "Current: engine >= 3"), ("Both corridors", "Guidance >= 2"), ("Scan validity", "Until 22:10 / today")], "Safety thresholds are fictional game rules. Total available power: 5.")

def E(id, title, summary, body, facts, cost=2, group="independent", kind="record", image=None, candidates=None):
    item={"id":id,"title":title,"summary":summary,"body":body,"cost":cost,"group":group,"kind":kind,"truth":facts,"checks":candidates or facts}
    if kind == "web":
        raw=("GREYBOX / FICTIONAL CASE EXHIBIT\n"+body["en"]+"\n").encode()
        path=OUT/(id+".txt");path.write_bytes(raw)
        item.update(url="/campaign/"+path.name,sha256=digest(raw))
    if kind == "image": item.update(url=image[0],sha256=image[1])
    return item

def R(id, title, facts, tactic, target="overturn", groups=2, focus="", sequence=None, allocation=None):
    return {"id":id,"title":title,"facts":facts,"tactic":tactic,"target":target,"min_groups":groups,"focus":focus,"sequence":sequence or [],"allocation":allocation or {}}

def option(id, zh, en, dz="", de=""): return {"id":id,"label":L(zh,en),"detail":L(dz,de)}

cases=[]
def C(**kwargs): cases.append(kwargs)

C(id="silent-orbit",title=L("失联空间站","Silent Orbit"),subtitle=L("无人值守，不代表已经停机。","An empty station can still be alive."),chapter="01",difficulty=1,mechanic="corroborate",accent="#e6b86d",budget=4,slots=2,
  briefing=L("空间站失去语音联系，调查局据此宣布它已停用。找到两份相互印证的材料，推翻初判。","The bureau declared Station 17 offline after losing voice contact. Find two corroborating exhibits to overturn the finding."),
  objective=L("证明 9 月 27 日 20:00 后核心系统仍在运行。","Establish essential system activity after 20:00 on September 27."),
  defense=L("人员已经撤离。即使有热量，也可能只是停机后的余温。","The crew left. Any warmth may be residual heat after shutdown."),
  innovation=L("学会互证","Corroboration"),hint=L("近期设备日志是起点，再找另一种来源；让反驳对应你的第二份证据。","Start with recent machine data, add another source, and match the rebuttal to that source."),
  facts={"power":"Do the readings show repeated active air circulation after 20:00 on September 27, 2026?","maintained":"Does a completed maintenance record explicitly say air circulation returned to active service that evening?","warm":"Does the image show warm radiator readings captured at 21:11 on September 27, 2026?"},
  evidence=[
    E("s1-power",L("电力遥测","Power telemetry"),L("每十分钟回传一次的设备日志。","Machine readings repeated every ten minutes."),L("9 月 27 日 20:56、21:06、21:16，功率分别为 4.8、4.8、4.7 kW，空气循环连续标记为运行。","On September 27, 2026 at 20:56, 21:06 and 21:16 UTC+8, draw was 4.8, 4.8 and 4.7 kW; air circulation remained active."),["power"],group="station-sensor",kind="web"),
    E("s1-order",L("维护工单","Maintenance ticket"),L("一张在失联之后关闭的工单。","A ticket closed after contact was lost."),L("9 月 27 日 21:08，无人值守的空气循环维护完成，系统恢复运行。工单 ST17-MNT-0927。","At 21:08 UTC+8 on September 27, 2026, uncrewed air-circulation maintenance was completed and the system returned to active service. ST17-MNT-0927."),["maintained"],group="engineering"),
    E("s1-thermal",L("轨道热像","Orbital thermal scan"),L("两个散热区仍呈暖色。","Two radiator zones still register warmth."),L("扫描显示 21:11 的散热区温度；热量本身不能区分运行和余温。","Inspect the image's timestamp and radiator temperatures. Warmth alone cannot distinguish operation from residual heat."),["warm"],group="orbital-scan",kind="image",image=thermal),
    E("s1-crew",L("离站登记","Crew departure"),L("人员撤离记录有正式盖章。","An official record of the crew leaving."),L("人员在 9 月 22 日离站。此记录没有设备停机指令。","The crew left on September 22. This record contains no equipment shutdown order."),[],cost=1,group="crew-office",candidates=["power"]),
    E("s1-poster",L("旧宣传档案","Old publicity file"),L("照片上的空间站灯火通明。","A brilliantly lit station in the archive."),L("宣传照拍摄于 2024 年，不能证明当前运行状态。","This publicity image was captured in 2024 and says nothing about current operation."),[],cost=1,group="publicity",candidates=["warm"])
  ],tactics=[option("uncrewed","无人也能运行","Uncrewed can be active","回应人员撤离的质疑。","Answer the crew objection."),option("residual","用供电排除余温","Test the residual-heat claim","让供电记录与热像互证。","Corroborate the scan with repeated power readings."),option("appearance","强调空间站的外观","Rely on appearance","外观看起来仍然完好。","The station still looks intact.")],
  targets=[option("overturn","推翻停用初判","Overturn the offline finding")],focus=[],sequence=[],resources=[],resource_budget=0,
  routes=[R("maintenance",L("无人运行","Uncrewed operation"),["power","maintained"],"uncrewed"),R("thermal",L("热像互证","Thermal corroboration"),["power","warm"],"residual")],
  example={"evidence":["s1-power","s1-order"],"tactic":"uncrewed","target":"overturn","focus":"","sequence":[],"allocation":{},"argument":""})

C(id="midnight-cargo",title=L("零点货运","Midnight Cargo"),subtitle=L("迟到的是货物，还是记录？","Was the cargo late—or just its paperwork?"),chapter="02",difficulty=2,mechanic="timeline",accent="#80bbdf",budget=5,slots=3,
  briefing=L("一艘运输艇被指控错过午夜截止时间。航拍、登记和船钟采用了不同的时间口径。还原经过，再提交申诉。","A cargo shuttle allegedly missed a midnight deadline. The camera, registry and ship clock use different time references. Reconstruct the events."),
  objective=L("证明货物在当地时间 00:00 前抵港，并排好事件顺序。","Show arrival before local midnight and put the events in order."),
  defense=L("入库单写着 00:12，所以这批货至少迟到了十二分钟。","The warehouse receipt says 00:12. The cargo was at least twelve minutes late."),innovation=L("重排时间线","Reorder the timeline"),hint=L("航拍使用 UTC，港口使用 UTC+8；到港和入库不是同一个事件。","The camera uses UTC; the port uses UTC+8. Docking and filing are different events."),
  facts={"arrival":"Does the source record physical arrival on September 27 at 15:50 UTC or 23:50 UTC+8?","offset":"Does the source establish that local port time is UTC+8?","filing":"Does the source distinguish filing at 00:12 on September 28 from physical docking earlier?","dispatch":"Does the source record departure at 23:40 local time on September 27?"},
  evidence=[
    E("s2-camera",L("泊位航拍日志","Dock camera log"),L("相机时间：15:50 UTC。","Camera time: 15:50 UTC."),L("9 月 27 日 15:50 UTC，运输艇实体靠上泊位；此前的镜头为空泊位。","At 15:50 UTC on September 27, 2026, the cargo shuttle physically docked. The earlier frame shows an empty berth."),["arrival"],group="camera",kind="web"),
    E("s2-clock",L("港口校时单","Port clock standard"),L("船钟和港口钟的换算口径。","The offset between ship and port clocks."),L("港口时间采用 UTC+8；相机采用 UTC。相机 15:50 对应港口同日 23:50。","The port uses UTC+8; the camera uses UTC. Camera time 15:50 equals 23:50 at the port on the same date."),["offset"],cost=1,group="time-service"),
    E("s2-receipt",L("入库回执","Warehouse receipt"),L("一个很醒目的 00:12 印章。","A conspicuous 00:12 stamp."),L("9 月 28 日 00:12 是入库文书录入时间。附注：实体靠泊已于上一日 23:50 完成。","00:12 on September 28 is the administrative filing time. Note: physical docking completed at 23:50 on the preceding day."),["filing","arrival"],cost=1,group="warehouse"),
    E("s2-launch",L("起飞记录","Departure log"),L("起飞事件是时间线的锚点。","Departure anchors the event sequence."),L("9 月 27 日当地时间 23:40 离开出发站。","The shuttle departed at 23:40 local time on September 27, 2026."),["dispatch"],cost=1,group="launch-control"),
    E("s2-audit",L("泊位独立审计","Independent berth audit"),L("审计记录同时说明时区与到港。","The auditor records both time base and arrival."),L("审计采用 UTC+8。实际靠泊时间为 9 月 27 日 23:50。00:12 只是入库文书的录入时间。","This audit uses UTC+8. Physical docking occurred at 23:50 on September 27; 00:12 on September 28 was paperwork filing only."),["arrival","offset","filing"],cost=3,group="port-auditor"),
    E("s2-rumor",L("目击者转述","Witness retelling"),L("“我记得肯定过了十二点”。","I remember it was definitely after midnight."),L("转述者没有说明是在看货物到港还是文书登记，也没有可靠时间记录。","The witness does not distinguish docking from filing and has no reliable timestamp."),[],cost=1,group="social",candidates=["arrival","filing"])
  ],tactics=[option("timebase","统一时区，区分事件","Normalize clocks and events"),option("stamp","把盖章当作到港","Treat filing as arrival"),option("memory","以目击者记忆为准","Trust the witness memory")],targets=[option("overturn","推翻迟到指控","Overturn the late-arrival claim")],focus=[],
  sequence=[option("filed","入库登记 00:12","Paperwork filed 00:12"),option("departed","起飞 23:40（港口）","Departed 23:40 (port)"),option("docked","靠泊 15:50（UTC）","Docked 15:50 (UTC)")],resources=[],resource_budget=0,
  routes=[R("camera-route",L("校时申诉","Clock-normalized appeal"),["arrival","offset","filing"],"timebase",sequence=["departed","docked","filed"])],
  example={"evidence":["s2-camera","s2-clock","s2-receipt"],"tactic":"timebase","target":"overturn","focus":"","sequence":["departed","docked","filed"],"allocation":{},"argument":""})

C(id="borrowed-frame",title=L("借来的现场","The Borrowed Frame"),subtitle=L("画面是真的，指控就成立吗？","A real image can support the wrong claim."),chapter="03",difficulty=3,mechanic="focus",accent="#bca3e6",budget=5,slots=3,
  briefing=L("一张检验截图被用来指控本批货物损坏。你需要指出图像里决定性的细节，并找到与之相符的档案。","An inspection frame is offered as proof that today's cargo was damaged. Pinpoint the decisive visual detail and corroborate it with a record."),objective=L("证明该图像不能作为当前 R71 货物的有效证据。","Show that the frame is not valid evidence about the current R71 shipment."),defense=L("图像来自正式检验相机，外观也相似，因此足以证明这批货存在问题。","The image came from an official inspection camera and the cargo looks similar. That should be enough."),innovation=L("标记决定性细节","Pinpoint the visual clue"),hint=L("真图也可能指错对象或引用错日期；序列号和时间戳都能成为路线。","A genuine image can depict the wrong item or date. Inspect both the serial and timestamp."),
  facts={"serial17":"Do the image pixels show the inspected object's serial as R17?","old_date":"Do the image pixels show capture date June 3, 2024?","target71":"Does the registry identify the disputed cargo as R71?","current_date":"Does the current case record identify the disputed shipment date as September 27, 2026?"},
  evidence=[
    E("s3-frame",L("检验截图 077","Inspection frame 077"),L("相似的货物，角落里有小字。","A familiar object. Small details in its corners."),L("请查看图像中的序列号和拍摄日期，区分被拍摄物体与当前争议货物。","Read the visible serial and capture date in the image. Distinguish the photographed item from the disputed cargo."),["serial17","old_date"],group="inspection-camera",kind="image",image=scan),
    E("s3-manifest",L("本批装箱清单","Current packing list"),L("这一批货的唯一身份。","The identity of the shipment under dispute."),L("当前争议货物序列号 R71，运输日期 2026 年 9 月 27 日。","The disputed shipment is serial R71, shipped on September 27, 2026."),["target71","current_date"],group="shipping",kind="web"),
    E("s3-archive",L("影像归档索引","Frame archive index"),L("旧检验图像的归档日期。","The archive date of older inspection frames."),L("编号 077 属于 2024 年 6 月 3 日检验批次。当前索赔属于 2026 年 9 月 27 日货运批次。","Frame 077 belongs to the June 3, 2024 inspection batch. The current claim concerns the September 27, 2026 shipment."),["current_date"],cost=1,group="archive",candidates=["current_date","target71"]),
    E("s3-style",L("包装外观说明","Packaging description"),L("两批货物都使用灰色标准箱。","Both batches used standard gray cases."),L("标准包装外观相同，外观不能唯一识别货物。","Standard packaging looks the same and cannot identify a unique shipment."),[],cost=1,group="manufacturer",candidates=["target71"]),
    E("s3-seal",L("相机认证书","Camera certificate"),L("认证书能证明相机正常工作。","The certificate says the camera worked."),L("相机于 2024 年通过校准；此证书没有说明图像中的货物是 R71。","The camera was calibrated in 2024. The certificate does not identify the photographed cargo as R71."),[],cost=1,group="inspection-camera",candidates=["target71"])
  ],tactics=[option("identity","追问证据对象","Challenge the object's identity"),option("freshness","追问证据时效","Challenge the evidence date"),option("looks","外观相似就足够","Similarity is enough")],targets=[option("overturn","排除这张证物","Exclude the offered frame")],focus=[option("serial","序列号区域","Serial region"),option("timestamp","拍摄日期区域","Timestamp region"),option("shell","外壳颜色区域","Shell color")],sequence=[],resources=[],resource_budget=0,
  routes=[R("wrong-item",L("对象不符","Wrong object"),["serial17","target71"],"identity",focus="serial"),R("wrong-date",L("时效不符","Wrong date"),["old_date","current_date"],"freshness",focus="timestamp")],
  example={"evidence":["s3-frame","s3-manifest"],"tactic":"identity","target":"overturn","focus":"serial","sequence":[],"allocation":{},"argument":""})

C(id="echo-chamber",title=L("回声警报","The Echo Alarm"),subtitle=L("三个声音，可能只有一个来源。","Three voices may have only one source."),chapter="04",difficulty=4,mechanic="provenance",accent="#80c9b9",budget=6,slots=3,
  briefing=L("三家媒体同时报道燃料泄漏，港口即将封锁。追溯转载关系，找到真正独立的证据。","Three outlets report a fuel leak and the port is about to close. Trace the copied reports and find independent evidence."),objective=L("判断泄漏指控是否得到独立证据支持，推翻缺乏依据的封锁。","Challenge the closure by checking whether independent evidence supports a leak."),defense=L("已经有三家媒体确认泄漏。报道数量本身就是相互印证。","Three outlets have confirmed the leak. The number of reports itself is corroboration."),innovation=L("追溯来源关系","Trace source independence"),hint=L("看文章引用的原始通报。传感器和维修部门才是不同来源。","Follow the reports back to the original bulletin. Sensors and maintenance are separate sources."),
  facts={"normal":"Does a direct gas sensor reading show 0.02 units, below the leak threshold of 0.10, in the disputed window?","vent":"Does a maintenance record identify the plume as a scheduled inert-gas vent rather than leaking fuel?","retracted":"Does the original bulletin explicitly retract the fuel-leak claim?","copied":"Does this report explicitly cite Bulletin B-19 rather than offer an independent observation?"},
  evidence=[
    E("s4-news-a",L("轨道日报","Orbital Daily"),L("头条：燃料泄漏已确认。","Headline: fuel leak confirmed."),L("报道引用通讯台通报 B-19；记者没有到现场，也没有独立观测。","This article cites communications bulletin B-19. Its reporter made no independent observation."),["copied"],cost=1,group="bulletin-b19"),
    E("s4-news-b",L("港口速报","Port Flash"),L("第二家媒体也报道了同一警报。","A second outlet repeats the alarm."),L("本文转载轨道日报，原始来源仍为 B-19，没有新增观测。","This article copies Orbital Daily, whose original source is B-19. It adds no independent observation."),["copied"],cost=1,group="bulletin-b19"),
    E("s4-news-c",L("航线新闻","Route News"),L("第三份报道让指控看起来更强。","A third report makes the claim seem stronger."),L("航线新闻基于 B-19 整理消息，没有派驻记者。","Route News compiled this story from B-19 without an on-site reporter."),["copied"],cost=1,group="bulletin-b19"),
    E("s4-sensor",L("现场气体传感器","On-site gas sensor"),L("原始读数有明确阈值。","Raw readings include a published threshold."),L("争议时段现场读数 0.02，泄漏阈值 0.10。传感器未触发燃料泄漏。","During the disputed window, the direct gas sensor read 0.02 units against a fuel-leak threshold of 0.10. It did not detect a leak."),["normal"],group="onsite-sensor",kind="web"),
    E("s4-service",L("排气维护排程","Vent maintenance schedule"),L("白色气团可能另有来由。","There may be another explanation for the plume."),L("当时正在进行已登记的惰性气体排放，并非燃料泄漏。维护部门独立于通讯台。","The plume came from a scheduled inert-gas vent, not leaking fuel. Maintenance is independent of the communications desk."),["vent"],group="maintenance"),
    E("s4-correction",L("原始通报更正","Original bulletin correction"),L("B-19 的编辑记录已更新。","The edit history of B-19 has changed."),L("通讯台撤回 B-19 中的燃料泄漏指控；最初误将计划排气当成泄漏。","The communications desk retracts the fuel-leak claim in B-19. A scheduled vent was initially mistaken for a leak."),["retracted"],group="bulletin-b19",kind="web")
  ],tactics=[option("independence","按独立来源计证据","Count independent sources"),option("majority","按报道数量投票","Count headlines"),option("silence","删除不利报道","Discard unfavorable reports")],targets=[option("overturn","撤销无依据封锁","Overturn the unsupported closure")],focus=[option("bulletin-b19","B-19 通讯台","B-19 communications desk"),option("onsite-sensor","现场传感器","On-site sensor"),option("maintenance","维修部门","Maintenance")],sequence=[],resources=[],resource_budget=0,
  routes=[R("independent-records",L("独立观测","Independent observations"),["normal","vent"],"independence",focus="bulletin-b19"),R("withdrawn-source",L("原始来源撤回","Retracted original"),["normal","retracted"],"independence",focus="bulletin-b19")],
  example={"evidence":["s4-sensor","s4-service"],"tactic":"independence","target":"overturn","focus":"bulletin-b19","sequence":[],"allocation":{},"argument":""})

C(id="last-shuttle",title=L("最后一艘救援艇","The Last Shuttle"),subtitle=L("找到可行路线，也要付得起代价。","A route needs proof—and enough power."),chapter="05",difficulty=5,mechanic="allocation",accent="#e39376",budget=7,slots=3,
  briefing=L("六名旅客等待转移，救援艇只剩五格可分配能源。北侧有碎片，南侧有逆流。用证据选择路线，再把能源分配到真正需要的位置。","Six travelers await transfer. The shuttle has five power cells: debris threatens the north route, currents slow the south. Prove a route works and power it correctly."),objective=L("以两种可行方案之一完成六人的撤离；总能源不能超过五格。","Build either valid evacuation plan for all six travelers using at most five power cells."),defense=L("两侧通道都有风险。最安全的选择就是继续等待。","Both corridors are risky. Waiting must be the safest choice."),innovation=L("双路线与资源取舍","Two routes, one power budget"),hint=L("北线需要护盾 3＋引导 2；南线需要引擎 3＋引导 2。路线和反驳都要与所选证据一致。","North needs shield 3 + guidance 2. South needs engine 3 + guidance 2. Match the evidence and argument to the chosen plan."),
  facts={"north_safe":"Does the visual corridor scan say NORTH can be traversed with shield at least 3 and guidance at least 2?","south_safe":"Does the visual corridor scan say SOUTH can be traversed with engine at least 3 and guidance at least 2?","capacity":"Does the manifest establish six travelers and a shuttle capacity of six, so everyone fits?","north_window":"Does current navigation data say the north route arrives at 22:06, before the 22:10 deadline?","south_window":"Does current navigation data say the south route arrives at 22:08 with engine 3, before the 22:10 deadline?"},
  evidence=[
    E("s5-scan",L("通道扫描图","Corridor scan"),L("不同通道要求不同设备配额。","Each corridor requires a different power allocation."),L("查看北、南通道的最低能源要求；当前扫描有效至 22:10。","Read the minimum power requirements for north and south. The current scan is valid until 22:10."),["north_safe","south_safe"],cost=3,group="scan-array",kind="image",image=rescue),
    E("s5-manifest",L("乘员与座位清单","Passenger and seat manifest"),L("不要遗漏救援艇的承载上限。","Check the shuttle's capacity."),L("等待撤离旅客六人，救援艇核定座位六个。所有人可一次登艇。","Six travelers await evacuation and the shuttle has six certified seats. Everyone can board on one trip."),["capacity"],cost=1,group="passenger-control"),
    E("s5-north",L("北线导航解算","North navigation solution"),L("北线较快，但穿过碎片区。","Faster, through a debris field."),L("当前导航解算：北线在护盾 3、引导 2 的配置下于 22:06 到达，早于 22:10 截止时间。","Current north navigation: with shield 3 and guidance 2, arrival is 22:06, before the 22:10 deadline."),["north_window"],group="navigation",kind="web"),
    E("s5-south",L("南线导航解算","South navigation solution"),L("逆流需要增加引擎输出。","The current requires extra engine power."),L("当前导航解算：南线在引擎 3、引导 2 的配置下于 22:08 到达，早于 22:10 截止时间。","Current south navigation: with engine 3 and guidance 2, arrival is 22:08, before the 22:10 deadline."),["south_window"],group="navigation",kind="web"),
    E("s5-old",L("上周安全图","Last week's safety map"),L("旧地图显示两条通道都畅通。","An older map shows both corridors clear."),L("地图绘于上周，未包含本次碎片带和逆流。不能说明当前通道安全。","The map was drawn last week and omits the present debris and current. It does not establish current safety."),[],cost=1,group="old-chart",candidates=["north_safe","south_safe"]),
    E("s5-ad",L("救援艇宣传资料","Shuttle brochure"),L("宣传语写着“全天候救援”。","The brochure promises all-weather rescue."),L("宣传资料没有提供当前设备配额、时间窗或核定座位。","The brochure gives no current power allocation, arrival window or certified seat count."),[],cost=1,group="marketing",candidates=["capacity"])
  ],tactics=[option("shield-plan","用防护化解北线风险","Mitigate north with shielding"),option("engine-plan","用动力化解南线风险","Beat the south current with power"),option("wait","等待所有风险消失","Wait for all risk to disappear")],targets=[option("north","北侧通道","North corridor"),option("south","南侧通道","South corridor")],focus=[],sequence=[],resources=[option("shield","护盾","Shield"),option("engine","引擎","Engine"),option("guidance","引导","Guidance")],resource_budget=5,
  routes=[R("north-plan",L("北线护盾方案","Shielded north route"),["north_safe","capacity","north_window"],"shield-plan",target="north",groups=3,allocation={"shield":3,"guidance":2}),R("south-plan",L("南线动力方案","Powered south route"),["south_safe","capacity","south_window"],"engine-plan",target="south",groups=3,allocation={"engine":3,"guidance":2})],
  example={"evidence":["s5-scan","s5-manifest","s5-north"],"tactic":"shield-plan","target":"north","focus":"","sequence":[],"allocation":{"shield":3,"engine":0,"guidance":2},"argument":""})

manifests=[]
for c in cases:
    manifest={"schema":1,"id":c["id"],"version":1,"title":c["title"]["en"],"objective":c["objective"]["en"],"budget":c["budget"],"slots":c["slots"],"facts":c["facts"],"tactics":[x["id"] for x in c["tactics"]],"targets":[x["id"] for x in c["targets"]],"focus":[x["id"] for x in c["focus"]],"sequence":[x["id"] for x in c["sequence"]],"resources":[x["id"] for x in c["resources"]],"resource_budget":c["resource_budget"],"routes":[{k:v for k,v in r.items() if k!="title"} for r in c["routes"]],"evidence":[]}
    for e in c["evidence"]:
        item={"id":e["id"],"kind":e["kind"],"cost":e["cost"],"group":e["group"],"content":e["body"]["en"],"checks":e["checks"]}
        if "url" in e:item["url"]=ORIGIN+e["url"];item["sha256"]=e["sha256"]
        manifest["evidence"].append(item)
    c["manifest_hash"]=digest(canonical(manifest).encode());c["manifest"]=manifest
    manifests.append(manifest)

(ROOT/"data/campaign.json").write_text(json.dumps(cases,ensure_ascii=False,indent=2))
(OUT/"manifests.json").write_text(canonical(manifests))
print(f"Built {len(cases)} cases, {sum(len(c['evidence']) for c in cases)} exhibits and {sum(len(c['routes']) for c in cases)} strategy routes.")
