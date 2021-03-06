const MASTERSERVER_IP = "master.aceattorneyonline.com:27014";
import { version } from '../package.json';

import Fingerprint2 from 'fingerprintjs2';
import { unescapeChat } from './encoding.js';
import { safe_tags } from './encoding.js';

let masterserver;

let hdid;
const options = { fonts: { extendedJsFonts: true, userDefinedFonts: ["Ace Attorney", "8bitoperator", "DINEngschrift"] }, excludes: { userAgent: true, enumerateDevices: true } };

let lowMemory = false;

let selectedServer = -1;

let servers = [];
servers[-2] = { name: "Singleplayer", description: "Build cases, try out new things", ip: "127.0.0.1", port: 50001, assets: "", online: "" };
servers[-1] = { name: "Localhost", description: "This is your computer on port 50001", ip: "127.0.0.1", port: 50001, assets: "", online: "Online: ?/?" };

if (window.requestIdleCallback) {
	requestIdleCallback(function () {
		Fingerprint2.get(options, function (components) {
			hdid = Fingerprint2.x64hash128(components.reduce((a, b) => `${a.value || a}, ${b.value}`), 31);

			if (/webOS|iPod|BlackBerry|BB|PlayBook|IEMobile|Windows Phone|Kindle|Silk|PlayStation|Opera Mini/i.test(navigator.userAgent)) {
				lowMemory = true;
			}

			check_https();

			masterserver = new WebSocket("ws://" + MASTERSERVER_IP);
			masterserver.onopen = (evt) => onOpen(evt);
			masterserver.onerror = (evt) => onError(evt);
			masterserver.onmessage = (evt) => onMessage(evt);

			// i don't need the ms to play alone
			setTimeout(() => checkOnline(-1, "127.0.0.1:50001"), 0);
		});
	});
} else {
	setTimeout(function () {
		Fingerprint2.get(options, function (components) {
			hdid = Fingerprint2.x64hash128(components.reduce((a, b) => `${a.value || a}, ${b.value}`), 31);

			if (/webOS|iPod|BlackBerry|BB|PlayBook|IEMobile|Windows Phone|Kindle|Silk|PlayStation|Opera Mini/i.test(navigator.userAgent)) {
				lowMemory = true;
			}

			check_https();

			masterserver = new WebSocket("ws://" + MASTERSERVER_IP);
			masterserver.onopen = (evt) => onOpen(evt);
			masterserver.onerror = (evt) => onError(evt);
			masterserver.onmessage = (evt) => onMessage(evt);

			// i don't need the ms to play alone
			setTimeout(() => checkOnline(-1, "127.0.0.1:50001"), 0);
		});
	}, 500);
}

export function check_https() {
	if (document.location.protocol === "https:") {
		document.getElementById("https_error").style.display = "";
	}
}

export function setServ(ID) {
	selectedServer = ID;

	if (!lowMemory && document.getElementById(`server${ID}`).className === "")
		checkOnline(ID, servers[ID].ip + ":" + servers[ID].port);

	if (servers[ID].description !== undefined) {
		document.getElementById("serverdescription_content").innerHTML = "<b>" + servers[ID].online + "</b><br>" + safe_tags(servers[ID].description);
	}
	else {
		document.getElementById("serverdescription_content").innerHTML = "";
	}
}
window.setServ = setServ;

function onOpen(_e) {
	console.log(`Your emulated HDID is ${hdid}`);
	masterserver.send(`ID#webAO#webAO#%`);

	masterserver.send("ALL#%");
	masterserver.send("VC#%");
}

/**
 * Triggered when an network error occurs.
 * @param {ErrorEvent} e 
 */
function onError(evt) {
	document.getElementById("ms_error").style.display = "block";
	document.getElementById("ms_error_code").innerText = `A network error occurred: ${evt.reason} (${evt.code})`;
	return;
}

function checkOnline(serverID, coIP) {
	let oserv;
	if (serverID !== -2) {
		try {
			oserv = new WebSocket("ws://" + coIP);
		} catch (SecurityError) {
			document.getElementById(`server${serverID}`).className = "unavailable";
			return;
		}
		
	}

	// define what the callbacks do
	function onCOOpen(_e) {
		document.getElementById(`server${serverID}`).className = "available";
		oserv.send(`HI#${hdid}#%`);
		oserv.send(`ID#webAO#webAO#%`);
	}

	function onCOMessage(e) {
		const comsg = e.data;
		const coheader = comsg.split("#", 2)[0];
		const coarguments = comsg.split("#").slice(1);
		if (coheader === "PN") {
			servers[serverID].online = `Online: ${Number(coarguments[0])}/${Number(coarguments[1])}`;
			oserv.close();
			return;
		}
		else if (coheader === "BD") {
			servers[serverID].online = "Banned";
			servers[serverID].description = coarguments[0];
			oserv.close();
			return;
		}
		if (serverID === selectedServer)
			document.getElementById("serverdescription_content").innerHTML = "<b>" + servers[serverID].online + "</b><br>" + safe_tags(servers[serverID].description);
	}

	// assign the callbacks
	oserv.onopen = function (evt) {
		onCOOpen(evt);
	};

	oserv.onmessage = function (evt) {
		onCOMessage(evt);
	};

	oserv.onerror = function (_evt) {
		console.warn(coIP + " threw an error.");
		document.getElementById(`server${serverID}`).className = "unavailable";
		return;
	};

}

function onMessage(e) {
	const msg = e.data;
	const header = msg.split("#", 2)[0];
	console.debug(msg);

	if (header === "ALL") {
		const allservers = msg.split("#").slice(1);
		for (let i = 0; i < allservers.length - 1; i++) {
			const serverEntry = allservers[i];
			const args = serverEntry.split("&");

			let thisserver = { name: args[0], description: args[1], ip: args[2], port: Number(args[3]), assets: args[4], online: "Online: ?/?" };
			servers[i] = thisserver;

			const ipport = args[2] + ":" + args[3];
			const asset = args[4] ? `&asset=${args[4]}` : "";

			document.getElementById("masterlist").innerHTML +=
				`<li id="server${i}" onmouseover="setServ(${i})"><p>${safe_tags(servers[i].name)}</p>`
				+ `<a class="button" href="client.html?mode=watch&ip=${ipport}${asset}">Watch</a>`
				+ `<a class="button" href="client.html?mode=join&ip=${ipport}${asset}">Join</a></li>`;			
		}
		masterserver.close();
		return;
	}
	else if (header === "servercheok") {
		const args = msg.split("#").slice(1);
		document.getElementById("clientinfo").innerHTML = `Client version: ${version} expected: ${args[0]}`;
	}
	else if (header === "SV") {
		const args = msg.split("#").slice(1);
		document.getElementById("serverinfo").innerHTML = `Master server version: ${args[0]}`;
	}
	else if (header === "CT") {
		const args = msg.split("#").slice(1);
		const msChat = document.getElementById("masterchat");
		msChat.innerHTML += `${unescapeChat(args[0])}: ${unescapeChat(args[1])}\r\n`;
		if (msChat.scrollTop > msChat.scrollHeight - 600) {
			msChat.scrollTop = msChat.scrollHeight;
		}
	}
}
