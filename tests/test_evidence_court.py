import copy
import hashlib
import json
import re
from pathlib import Path
import pytest

CASES = json.loads(Path("data/campaign.json").read_text())
MANIFESTS = [case["manifest"] for case in CASES]


def deploy_game(direct_deploy):
    return direct_deploy("contracts/EvidenceCourt.py", json.dumps(MANIFESTS))


def key(game, case):
    owner = json.loads(game.get_engine())["publisher"]
    return owner + ":" + case["id"] + ":1"


def mocks(vm, case, selection, override=None):
    vm.clear_mocks()
    selected = sorted(selection["evidence"])
    rows = {}
    images = []
    for eid in selected:
        e = next(e for e in case["evidence"] if e["id"] == eid)
        rows[eid] = e["truth"]
        if e["kind"] == "web":
            vm.mock_web(re.escape(case["manifest"]["evidence"][case["evidence"].index(e)]["url"]), {"status": 200, "body": Path("public"+e["url"]).read_text()})
        if e["kind"] == "image":
            images.append(Path("public"+e["url"]).read_bytes())
    if override is not None:
        rows = override
    vm.mock_llm(r".*", json.dumps({"evidence":rows}))
    return images


@pytest.mark.parametrize("index", range(5))
def test_all_five_cases_have_a_realizable_strategy_and_pinned_rules(index, direct_vm, direct_deploy):
    game = deploy_game(direct_deploy)
    c = CASES[index]
    case_key = key(game,c)
    registered = json.loads(game.get_case(case_key))
    assert registered["manifest_hash"] == c["manifest_hash"]
    images = mocks(direct_vm,c,c["example"])
    game.submit_round("a"*32, case_key, json.dumps(c["example"]), images)
    owner = json.loads(game.get_engine())["publisher"]
    row = json.loads(game.get_round(owner,"a"*32))
    assert row["verdict"] == "PROVED"
    assert row["observations"]
    assert direct_vm.run_validator() is True


def test_validator_rejects_changed_facts_even_when_leader_shape_is_valid(direct_vm,direct_deploy):
    game=deploy_game(direct_deploy);c=CASES[0];s=c["example"]
    images=mocks(direct_vm,c,s)
    game.submit_round("b"*32,key(game,c),json.dumps(s),images)
    mocks(direct_vm,c,s,{eid:[] for eid in s["evidence"]})
    assert direct_vm.run_validator() is False


def test_no_facts_means_no_win_even_for_the_same_chosen_cards(direct_vm,direct_deploy):
    game=deploy_game(direct_deploy);c=CASES[0];s=c["example"]
    images=mocks(direct_vm,c,s,{eid:[] for eid in s["evidence"]})
    game.submit_round("c"*32,key(game,c),json.dumps(s),images)
    owner=json.loads(game.get_engine())["publisher"]
    assert json.loads(game.get_round(owner,"c"*32))["verdict"] == "NOT_PROVED"


def test_extra_copied_sources_cannot_fake_independence(direct_vm,direct_deploy):
    custom=copy.deepcopy(CASES[0])
    custom["manifest"]["evidence"][1]["group"] = custom["manifest"]["evidence"][0]["group"]
    game=direct_deploy("contracts/EvidenceCourt.py",json.dumps([custom["manifest"]]))
    images=mocks(direct_vm,custom,custom["example"])
    game.submit_round("d"*32,key(game,custom),json.dumps(custom["example"]),images)
    owner=json.loads(game.get_engine())["publisher"]
    assert json.loads(game.get_round(owner,"d"*32))["verdict"] == "NOT_PROVED"


@pytest.mark.parametrize("index,change", [(1,{"sequence":["filed","departed","docked"]}),(2,{"focus":"shell"}),(4,{"allocation":{"shield":0,"engine":3,"guidance":2}})])
def test_good_evidence_still_requires_the_level_strategy(index,change,direct_vm,direct_deploy):
    game=deploy_game(direct_deploy);c=CASES[index];s={**c["example"],**change}
    images=mocks(direct_vm,c,s)
    game.submit_round("e"*32,key(game,c),json.dumps(s),images)
    owner=json.loads(game.get_engine())["publisher"]
    assert json.loads(game.get_round(owner,"e"*32))["verdict"] == "NOT_PROVED"


def test_source_tampering_returns_inconclusive(direct_vm,direct_deploy):
    game=deploy_game(direct_deploy);c=CASES[0];s=c["example"]
    direct_vm.mock_web(r"s1-power",{"status":200,"body":"Changed source with the same URL"})
    game.submit_round("f"*32,key(game,c),json.dumps(s),[])
    owner=json.loads(game.get_engine())["publisher"]
    row=json.loads(game.get_round(owner,"f"*32))
    assert row["verdict"] == "INCONCLUSIVE"
    assert row["unavailable"] == ["s1-power"]


def test_budget_duplicate_image_and_immutable_version_checks(direct_vm,direct_deploy):
    game=deploy_game(direct_deploy);c=CASES[4];s=copy.deepcopy(c["example"])
    with direct_vm.expect_revert("immutable"):
        game.publish_cases(json.dumps([c["manifest"]]))
    s["allocation"]={"shield":3,"engine":3,"guidance":2}
    with direct_vm.expect_revert("Resource budget"):
        game.submit_round("1"*32,key(game,c),json.dumps(s),[])
    s=copy.deepcopy(c["example"])
    with direct_vm.expect_revert("Image does not match"):
        game.submit_round("1"*32,key(game,c),json.dumps(s),[b"not-an-image"])
    images=mocks(direct_vm,c,s)
    game.submit_round("1"*32,key(game,c),json.dumps(s),images)
    with direct_vm.expect_revert("already used"):
        game.submit_round("1"*32,key(game,c),json.dumps(s),images)


def test_new_publisher_can_register_an_independent_case_and_version(direct_vm,direct_deploy,direct_alice):
    game=deploy_game(direct_deploy)
    direct_vm.sender=direct_alice
    m=copy.deepcopy(MANIFESTS[0]);m["id"]="community-case";m["version"]=2
    keys=json.loads(game.publish_cases(json.dumps([m])))
    assert len(keys)==1 and keys[0].endswith(":community-case:2")
    assert json.loads(game.get_case(keys[0]))["manifest"]["id"] == "community-case"


def test_malformed_ai_output_cannot_become_a_success(direct_vm,direct_deploy):
    game=deploy_game(direct_deploy);c=CASES[0];s=c["example"]
    images=mocks(direct_vm,c,s,{"s1-power":["invented-fact"],"s1-order":["maintained"]})
    with direct_vm.expect_revert("No valid fact extraction"):
        game.submit_round("2"*32,key(game,c),json.dumps(s),images)


@pytest.mark.parametrize("index,patch,route", [
    (0,{"evidence":["s1-power","s1-thermal"],"tactic":"residual"},"thermal"),
    (2,{"tactic":"freshness","focus":"timestamp"},"wrong-date"),
    (3,{"evidence":["s4-sensor","s4-correction"]},"withdrawn-source"),
    (4,{"evidence":["s5-scan","s5-manifest","s5-south"],"target":"south","tactic":"engine-plan","allocation":{"shield":0,"engine":3,"guidance":2}},"south-plan"),
])
def test_alternative_routes_are_reachable(index,patch,route,direct_vm,direct_deploy):
    game=deploy_game(direct_deploy);c=CASES[index];s={**c["example"],**patch}
    images=mocks(direct_vm,c,s)
    game.submit_round("3"*32,key(game,c),json.dumps(s),images)
    owner=json.loads(game.get_engine())["publisher"]
    result=json.loads(game.get_round(owner,"3"*32))
    assert result["verdict"]=="PROVED" and route in result["routes"]
    assert direct_vm.run_validator() is True


@pytest.mark.parametrize("selection,message",[(None,"Selection must be"),([],"Selection must be"),({"evidence":[{}]},"Invalid or duplicate"),({"evidence":[["nested"]]},"Invalid or duplicate")])
def test_malformed_selections_fail_before_external_calls(selection,message,direct_vm,direct_deploy):
    game=deploy_game(direct_deploy)
    with direct_vm.expect_revert(message):
        game.submit_round("4"*32,key(game,CASES[0]),json.dumps(selection),[])


def test_missing_focus_rule_rejected_when_publishing(direct_vm,direct_deploy):
    game=deploy_game(direct_deploy);m=copy.deepcopy(MANIFESTS[0]);m["version"]=2
    del m["routes"][0]["focus"]
    with direct_vm.expect_revert("Invalid route action"):
        game.publish_cases(json.dumps([m]))


def test_same_case_name_from_another_publisher_cannot_replace_original(direct_vm,direct_deploy,direct_alice):
    game=deploy_game(direct_deploy);original_key=key(game,CASES[0]);original=game.get_case(original_key)
    direct_vm.sender=direct_alice
    published=json.loads(game.publish_cases(json.dumps([MANIFESTS[0]])))
    assert published[0]!=original_key
    assert game.get_case(original_key)==original


def test_standalone_library_case_works_without_the_game_frontend(direct_vm,direct_deploy):
    game=direct_deploy("contracts/EvidenceCourt.py",Path("examples/standalone-case.json").read_text())
    publisher=json.loads(game.get_engine())["publisher"]
    case_key=json.loads(game.get_catalog(publisher))[0]
    direct_vm.mock_llm(r".*",json.dumps({"evidence":{"door-log":["access"],"desk-log":["service"]}}))
    selection={"evidence":["door-log","desk-log"],"tactic":"corroborate","target":"open","focus":"","sequence":[],"allocation":{},"argument":""}
    game.submit_round("5"*32,case_key,json.dumps(selection),[])
    assert json.loads(game.get_round(publisher,"5"*32))["verdict"]=="PROVED"
    assert direct_vm.run_validator() is True
