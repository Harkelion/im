const fetch = require("node-fetch");

const CLR = Object.freeze(
    {
        BLUE: '#55AAFF',
        RED: '#FF5555',
        GREEN: '#55FF55',
        YELLOW: '#FFDD55',
        PURPLE: '#AA22AA',
        TEAL: '#00FFFF',
    }
);

const ZONE = {
    9970: 970,
    9770: 770,
    9950: 950,
    9044: 444
}

const BOSS = {
    9970: 3000,
    9770: 3000,
    9950: 4000,
    3034: 4000,
    9044: 2000,
}

module.exports = function(mod) {
    let myparty = []

    command.add('dp', {
        '$default'() {
            isEnabled = !isEnabled;
            command.message(' Dps Party ' + (isEnabled ? 'enabled' : 'disabled') + '.');
        }
    });

	//S_FIN_INTER_PARTY_MATCH def1

    mod.hook('S_LOAD_TOPO', 3, event => {
        //mod.log('S_FIN_INTER_PARTY_MATCH');
        //mod.log(event);
	if (event.zone in ZONE && isEnabled);{ im(event.zone); }         
    })

    mod.hook('S_PARTY_MEMBER_LIST', 9, event => {
        //mod.log('S_PARTY_MEMBER_LIST');
        //mod.log(event);
        if (event.members.length != 5) return;
        myparty = event.members.map((v) => {return { id: v.playerId, name: v.name}} );
    })

    async function get(name, dun) {
        //mod.log(`get: ${name} ${dun}`);
        let link = `https://moongourd.com/api/mg/search.php?region=EU&zone=${ZONE[dun] || dun}&boss=${BOSS[dun] || 1000}&ver=1&name=${name}&sort=dps`
        const requestPayload = await fetch(encodeURI(link));
		if (!requestPayload.ok) return null;
		else {
			let res = null;
			try { res = await requestPayload.json(); }
			catch (e) { mod.log(e) }
			return res;
		}
    }

    async function im(zone) {
        let party = [...myparty];
        let bossHp = 0;
        let partyDps = 0;
        let players = 0;
        let calls = [];
        await Promise.all(party.map((v) => {
            return new Promise(async (res, rej) => {
                v.data = await get(v.name, zone);
                //mod.log(`${v.name} got`)
                res();
            });
        }));

        for (const v of party) {
            v.dps = 0;
            //mod.log(v.data);
            if (v.data != null && v.data[0].count > 0) {
                for (let i = 0; i < party.length; ++i) {
                    let d = v.data[1][i];
                    if (d.playerId === v.id) {
                        players++;
                        v.dps = d.playerDps;
                        partyDps += d.playerDps;
                        let calcBossHp = d.partyDps * d.fightDuration;
                        bossHp = Math.max(bossHp, calcBossHp);
                        break;
                    }
                }
            }
        }
        const partyString = party.sort((a, b) => { return (b.dps - a.dps)}).map((v) => {
            return `[${v.dps === 0 ? 'N/A' : `${Math.round(v.dps/partyDps*100)}%`.padStart(3, ' ')}] ${v.name}${v.dps === 0 ? '' : ` (${(v.dps / 1000000).toFixed(1)}m/s)`}`;
        }).join("\n");
        //mod.log(`partyDps: ${partyDps}`)
        if (partyDps <= 0) return;
        let fightTimeInS = Math.ceil(bossHp / partyDps);
        let min = Math.floor(fightTimeInS/60);
        let s = fightTimeInS % 60;
        let color = (fightTimeInS > 600) ? CLR.RED : ((fightTimeInS > 360) ? CLR.YELLOW : CLR.GREEN);
        mod.command.message(`Min fight time [${players}/${party.length}]: <font color="${color}">${min.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}</font>\n${partyString}`)
    }
}
