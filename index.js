const fetch = require("node-fetch");

let czone = null;
let isEnabled = true;
let boss = null;

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
    9044: 444, // Bahaar
    9981: 981, // VSH
    3047: 427, // MCHM
    3201: 3201 // Gossamer Vault (Hard)
}

/*
const BOSS = {    
    9044: 2000/3, // Bahaar P2
    9981: 3000/1, // Lakan
    3047: 2007/1 // Manaya
}
*/

module.exports = function(mod) {
    const { command } = mod;
    let myparty = []

    command.add('dp', {
        '$default'() {
            isEnabled = !isEnabled;
            command.message(' Dps Party ' + (isEnabled ? 'enabled' : 'disabled') + '.');
        }
    });

	//S_FIN_INTER_PARTY_MATCH def1

    mod.hook('S_BOSS_GAGE_INFO', 3, event => {        
        boss = `${event.templateId.toString()}/1`        
        if (czone == 9044) { boss = `${event.templateId.toString()}/3` }
        if (czone == 3201) { boss = `${event.templateId.toString()}/2` }
        if (czone != null && isEnabled){ im(czone); }; 
        //command.message(`id  ? ${boss}`)       
    })

    mod.hook('S_LOAD_TOPO', 3, event => {
        if (event.zone in ZONE );{ czone = event.zone ; }              
    })

    mod.hook('S_PARTY_MEMBER_LIST', 9, event => {
        //mod.log('S_PARTY_MEMBER_LIST');
        //mod.log(event);
        if (event.members.length != 5) return;
        myparty = event.members.map((v) => {return { id: v.playerId, name: v.name}} );
    })

    async function get(name, dun) {
        //mod.log(`get: ${name} ${dun}`);
        //command.message(`https://kabedon.moongourd.com/search/${ZONE[dun] || dun}/${boss || 1000/1}/${name}&sort=dps&server=Menma%27s%20TERA`);
        let link = `https://kabedon.moongourd.com/search/${ZONE[dun] || dun}/${boss || 1000/1}/${name}&sort=dps&server=Menma%27s%20TERA`
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
