import * as AccessibilityActionCreators from '@app/actions/AccessibilityActionCreators';
import * as ModalActionCreators from '@app/actions/ModalActionCreators';
import * as ToastActionCreators from '@app/actions/ToastActionCreators';
import styles from '@app/components/modals/tabs/appearance_tab/CustomJsTab.module.css';
import {Textarea} from '@app/components/form/Input';
import {Button} from '@app/components/uikit/button/Button';
import * as Modal from '@app/components/modals/Modal';
import AccessibilityStore from '@app/stores/AccessibilityStore';
import {Trans, useLingui} from '@lingui/react/macro';
import {ShareNetworkIcon, CaretDownIcon, CaretRightIcon} from '@phosphor-icons/react';
import {observer} from 'mobx-react-lite';
import {scanCustomJs, type Permission} from '@app/lib/CustomJsSecurity';
import type React from 'react';
import {useCallback, useState} from 'react';

// ─── Share Modal ──────────────────────────────────────────────────────────────

const ShareJsModal = observer(function ShareJsModal({js}: {js: string}) {
	const {t} = useLingui();
	const encoded = btoa(unescape(encodeURIComponent(js)));
	const [copied, setCopied] = useState(false);
	const handleCopy = useCallback(async () => {
		await navigator.clipboard.writeText(encoded);
		setCopied(true);
		ToastActionCreators.success(t`Script code copied!`);
		setTimeout(() => setCopied(false), 2000);
		return true;
	}, [encoded]);
	return (
		<Modal.Root size="small" centered>
			<Modal.Header title={t`Share Your Script`} />
			<Modal.Content>
				<p style={{fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.75rem', marginTop: 0}}>
					<Trans>Copy this code and share it with others. They can paste it into the <strong>Import Script</strong> field at the top of the Custom JS tab to load it directly.</Trans>
				</p>
				<textarea
					readOnly
					value={encoded}
					onClick={e => (e.target as HTMLTextAreaElement).select()}
					style={{width: '100%', height: '80px', padding: '8px', background: 'var(--background-tertiary)', border: '1px solid var(--background-modifier-accent)', borderRadius: '4px', color: 'var(--text-secondary)', fontSize: '11px', fontFamily: 'monospace', resize: 'none', boxSizing: 'border-box'}}
				/>
			</Modal.Content>
			<Modal.Footer>
				<Button variant="primary" onClick={handleCopy} style={{width: '100%'}}>
					{copied ? <Trans>Copied!</Trans> : <Trans>Copy script code</Trans>}
				</Button>
			</Modal.Footer>
		</Modal.Root>
	);
});

// ─── Permission Summary UI ───────────────────────────────────────────────────

function PermissionSummary({permissions, warnings}: {permissions: Permission[]; warnings: string[]}) {
	if (permissions.length === 0 && warnings.length === 0) return null;
	return (
		<div style={{background: 'var(--background-tertiary)', border: '1px solid var(--background-modifier-accent)', borderRadius: '6px', padding: '10px 12px', marginBottom: '8px', fontSize: '0.8rem'}}>
			<div style={{fontWeight: 600, marginBottom: '6px', color: 'var(--text-secondary)'}}>This script can:</div>
			{permissions.map((p, i) => (
				<div key={i} style={{display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px', color: p.type === 'safe' ? 'var(--green-360)' : p.type === 'warn' ? 'var(--yellow-360)' : 'var(--red-400)'}}>
					<span>{p.type === 'safe' ? '✓' : '⚠'}</span>
					<span>{p.label}</span>
				</div>
			))}
			{warnings.map((w, i) => (
				<div key={`w-${i}`} style={{display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px', color: 'var(--yellow-360)'}}>
					<span>⚠</span><span>{w}</span>
				</div>
			))}
		</div>
	);
}

// ─── Presets ──────────────────────────────────────────────────────────────────

const PRESETS = [
	{
		label: 'Click Sound (Tick)',
		code: `// [fluxoid-preset:click]
(function() {
  const ctx = new AudioContext();
  document.addEventListener('mousedown', () => {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.connect(g); g.connect(ctx.destination);
    o.frequency.value = 1200;
    g.gain.setValueAtTime(0.15, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);
    o.start(); o.stop(ctx.currentTime + 0.05);
  });
})();`,
	},
	{
		label: 'Typewriter Key Sound',
		code: `// [fluxoid-preset:keypress]
(function() {
  const ctx = new AudioContext();
  document.addEventListener('keydown', (e) => {
    if (e.repeat) return;
    const buf = ctx.createBuffer(1, ctx.sampleRate * 0.05, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
    const src = ctx.createBufferSource();
    const g = ctx.createGain();
    src.buffer = buf; src.connect(g); g.connect(ctx.destination);
    g.gain.value = 0.12;
    src.start();
  });
})();`,
	},
	{
		label: 'Notification Ding',
		code: `// [fluxoid-preset:notification]
(function() {
  const ctx = new AudioContext();
  const orig = window.Notification;
  window.Notification = function(...args) {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.connect(g); g.connect(ctx.destination);
    o.type = 'sine'; o.frequency.value = 880;
    g.gain.setValueAtTime(0.2, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
    o.start(); o.stop(ctx.currentTime + 0.4);
    return new orig(...args);
  };
  Object.assign(window.Notification, orig);
})();`,
	},
	{
		label: 'Message Send Whoosh',
		code: `// [fluxoid-preset:send]
(function() {
  const ctx = new AudioContext();
  function playWhoosh() {
    const buf = ctx.createBuffer(1, ctx.sampleRate * 0.15, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length) * 0.3;
    const src = ctx.createBufferSource();
    const g = ctx.createGain();
    const filter = ctx.createBiquadFilter();
    filter.type = 'highpass'; filter.frequency.value = 800;
    src.buffer = buf; src.connect(filter); filter.connect(g); g.connect(ctx.destination);
    g.gain.setValueAtTime(0.4, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
    src.start();
  }
  const obs = new MutationObserver(() => {
    const btn = document.querySelector('[data-slate-send-button]');
    if (btn && !btn._fluxoidSend) { btn._fluxoidSend = true; btn.addEventListener('click', playWhoosh); }
  });
  obs.observe(document.body, {childList: true, subtree: true});
})();`,
	},
];

// ─── Sound Slots ──────────────────────────────────────────────────────────────

const SOUND_SLOTS = [
	{key: 'click', label: 'Click Sound', event: 'mousedown', description: 'Plays on every mouse click'},
	{key: 'keypress', label: 'Typing Sound', event: 'keydown', description: 'Plays on every keypress'},
	{key: 'notification', label: 'Notification Sound', event: 'notification', description: 'Plays on server/channel notifications'},
	{key: 'dm', label: 'DM Sound', event: 'dm', description: 'Plays on direct message notifications'},
	{key: 'send', label: 'Message Send Sound', event: 'send', description: 'Plays when sending a message'},
	{key: 'boot', label: 'Boot Sound', event: 'boot', description: 'Plays once when the app loads'},
	{key: 'joincall', label: 'Join Call / VC Sound', event: 'joincall', description: 'Plays when joining a voice channel or call'},
];

function isValidFluxerUrl(url: string): boolean {
	try {
		const u = new URL(url);
		return u.hostname === 'fluxerusercontent.com' || u.hostname.endsWith('.fluxerusercontent.com');
	} catch {
		return false;
	}
}

function buildSoundSnippet(key: string, url: string, volume = 1.0, masterVolume = 1.0): string {
	const slot = SOUND_SLOTS.find(s => s.key === key);
	if (!slot) return '';
	const vol = Math.round(Math.min(1, volume * masterVolume) * 100) / 100;
	const gain = `const g=ctx.createGain();g.gain.value=${vol};`;
	const connect = `s.connect(g);g.connect(ctx.destination);`;
	const play = `const s=ctx.createBufferSource();s.buffer=decoded;${gain}${connect}s.start();`;
	const lines: string[] = [
		`// [fluxoid-sound:${key}] ${slot.label}`,
		'(function() {',
		'  const ctx = new AudioContext();',
		`  fetch(${JSON.stringify(url)}).then(r=>r.arrayBuffer()).then(buf=>ctx.decodeAudioData(buf)).then(decoded=>{`,
	];
	if (slot.event === 'mousedown') {
		lines.push(`    document.addEventListener('mousedown',()=>{${play}});`);
	} else if (slot.event === 'keydown') {
		lines.push(`    document.addEventListener('keydown',(e)=>{if(e.repeat)return;${play}});`);
	} else if (slot.event === 'notification') {
		lines.push(`    const oN=window.Notification;window.Notification=function(...a){if(!a[0]?.tag?.startsWith('dm-')){${play}}return new oN(...a);};Object.assign(window.Notification,oN);`);
	} else if (slot.event === 'dm') {
		lines.push(`    const oD=window.Notification;window.Notification=function(...a){if(a[0]?.tag?.startsWith('dm-')){${play}}return new oD(...a);};Object.assign(window.Notification,oD);`);
	} else if (slot.event === 'send') {
		lines.push(`    new MutationObserver(()=>{const btn=document.querySelector('[data-slate-send-button]');if(btn&&!btn._snd_${key}){btn._snd_${key}=true;btn.addEventListener('click',()=>{${play}});}}).observe(document.body,{childList:true,subtree:true});`);
	} else if (slot.event === 'boot') {
		lines.push(`    ${play}`);
	} else if (slot.event === 'joincall') {
		lines.push(`    new MutationObserver(()=>{const el=document.querySelector('[data-voice-call-root="true"]');if(el&&!el._snd_joincall){el._snd_joincall=true;${play}}}).observe(document.body,{childList:true,subtree:true});`);
	}
	lines.push('  });', '})();');
	return lines.join('\n');
}

function replaceOrAppend(current: string, key: string, snippet: string): string {
	const soundRegex = new RegExp(`\/\/ \[fluxoid-sound:${key}\][^\n]*\n\(function\(\) \{[\s\S]*?\}\)\(\);`);
	const presetRegex = new RegExp(`\/\/ \[fluxoid-preset:${key}\][^\n]*\n\(function\(\) \{[\s\S]*?\}\)\(\);`);
	if (soundRegex.test(current)) return current.replace(soundRegex, snippet.trim());
	if (presetRegex.test(current)) return current.replace(presetRegex, snippet.trim());
	return current ? `${current}\n\n${snippet}` : snippet;
}

// ─── Sound Upload Section ─────────────────────────────────────────────────────

const SoundUploadSlots = observer(function SoundUploadSlots() {
	const {t} = useLingui();
	const [sounds, setSounds] = useState<Record<string, string>>({});
	const [errors, setErrors] = useState<Record<string, string>>({});
	const [volumes, setVolumes] = useState<Record<string, number>>(() => AccessibilityStore.soundVolumes ?? {});
	const [masterVolume, setMasterVolume] = useState(() => AccessibilityStore.masterVolume ?? 1.0);
	const [open, setOpen] = useState(false);

	const handleVolumeChange = useCallback((key: string, val: number) => {
		setVolumes(prev => ({...prev, [key]: val}));
		AccessibilityActionCreators.update({soundVolumes: {...AccessibilityStore.soundVolumes, [key]: val}});
	}, []);

	const handleMasterVolumeChange = useCallback((val: number) => {
		setMasterVolume(val);
		AccessibilityActionCreators.update({masterVolume: val});
	}, []);

	const handleUrlChange = useCallback((key: string, url: string) => {
		if (!url) {
			setSounds(prev => { const n = {...prev}; delete n[key]; return n; });
			setErrors(prev => { const n = {...prev}; delete n[key]; return n; });
			return;
		}
		if (!isValidFluxerUrl(url)) {
			setErrors(prev => ({...prev, [key]: 'Only fluxerusercontent.com links are supported.'}));
			setSounds(prev => { const n = {...prev}; delete n[key]; return n; });
			return;
		}
		setErrors(prev => { const n = {...prev}; delete n[key]; return n; });
		setSounds(prev => ({...prev, [key]: url}));
	}, []);

	const handleInsertAll = useCallback(() => {
		if (Object.keys(sounds).length === 0) {
			ToastActionCreators.error(t`Add at least one valid sound URL first.`);
			return;
		}
		let current = AccessibilityStore.customJs ?? '';
		const masterVol = AccessibilityStore.masterVolume;
		const slotVols = AccessibilityStore.soundVolumes;
		for (const [key, url] of Object.entries(sounds)) {
			current = replaceOrAppend(current, key, buildSoundSnippet(key, url, slotVols[key] ?? 1.0, masterVol));
		}
		AccessibilityActionCreators.update({customJs: current});
		ToastActionCreators.success(t`Sound script inserted.`);
	}, [sounds]);

	return (
		<div className={styles.section}>
			<button type="button" className={styles.sectionToggle} onClick={() => setOpen(o => !o)}>
				{open ? <CaretDownIcon size={14} /> : <CaretRightIcon size={14} />}
				<span>Sound Slots</span>
			</button>
			{open && (
				<div className={styles.sectionContent}>
					<p className={styles.sectionDesc}>
						Paste a <strong>fluxerusercontent.com</strong> link for each sound.
						To get a link: upload your MP3 to Personal Notes, right-click the file, and copy the link.
					</p>
					<div className={styles.soundSlot} style={{marginBottom: '10px'}}>
						<div className={styles.soundSlotInfo}>
							<span className={styles.soundSlotLabel}>Master Volume</span>
							<span className={styles.soundSlotDesc}>Controls overall volume for all sound slots</span>
						</div>
						<div style={{display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px'}}>
							<input type="range" min={0} max={1} step={0.01} value={masterVolume}
								onChange={e => handleMasterVolumeChange(parseFloat(e.target.value))}
								style={{flex: 1}} />
							<span style={{minWidth: '36px', fontSize: '0.8rem', color: 'var(--text-muted)'}}>{Math.round(masterVolume * 100)}%</span>
						</div>
					</div>
					{SOUND_SLOTS.map(slot => (
						<div key={slot.key} className={styles.soundSlot}>
							<div className={styles.soundSlotInfo}>
								<span className={styles.soundSlotLabel}>{slot.label}</span>
								<span className={styles.soundSlotDesc}>{slot.description}</span>
							</div>
							<div className={styles.soundUrlWrapper}>
								<input
									type="url"
									className={styles.soundUrlInput}
									placeholder="https://fluxerusercontent.com/..."
									onChange={e => handleUrlChange(slot.key, e.target.value.trim())}
								/>
								{errors[slot.key] && <span className={styles.soundError}>{errors[slot.key]}</span>}
								{sounds[slot.key] && <span className={styles.soundLoaded}>✓</span>}
							</div>
							<div style={{display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px'}}>
								<span style={{fontSize: '0.75rem', color: 'var(--text-muted)', minWidth: '50px'}}>Volume</span>
								<input type="range" min={0} max={1} step={0.01}
									value={volumes[slot.key] ?? 1.0}
									onChange={e => handleVolumeChange(slot.key, parseFloat(e.target.value))}
									style={{flex: 1}} />
								<span style={{minWidth: '36px', fontSize: '0.8rem', color: 'var(--text-muted)'}}>{Math.round((volumes[slot.key] ?? 1.0) * 100)}%</span>
							</div>
						</div>
					))}
					{Object.keys(sounds).length > 0 && (
						<Button variant="primary" fitContent onClick={handleInsertAll} style={{marginTop: '0.5rem'}}>
							Insert into JS
						</Button>
					)}
				</div>
			)}
		</div>
	);
});


// ─── Animation Presets Section ───────────────────────────────────────────────

const ANIMATION_PRESETS = [
	{key: 'slide-left',    label: 'Slide Left',    defaultDistance: 100, defaultDuration: 300},
	{key: 'slide-right',   label: 'Slide Right',   defaultDistance: 100, defaultDuration: 300},
	{key: 'slide-up',      label: 'Slide Up',      defaultDistance: 60,  defaultDuration: 300},
	{key: 'slide-down',    label: 'Slide Down',    defaultDistance: 60,  defaultDuration: 300},
	{key: 'checkerboard',  label: 'Checkerboard',  defaultDistance: 0,   defaultDuration: 600},
	{key: 'fade',          label: 'Fade',          defaultDistance: 0,   defaultDuration: 400},
	{key: 'zoom-in',       label: 'Zoom In',       defaultDistance: 0,   defaultDuration: 350},
	{key: 'glitch',        label: 'Glitch',        defaultDistance: 10,  defaultDuration: 400},
];

function buildAnimationSnippet(key: string, distance: number, duration: number): string {
	const ms = duration;
	const px = distance;
	switch (key) {
		case 'slide-left':
			return `// [fluxoid-anim:${key}] Slide Left transition\n(function(){\n  const style=document.createElement('style');\n  style.textContent='@keyframes fluxoid-slide-left{from{transform:translateX(${px}px);opacity:0}to{transform:translateX(0);opacity:1}}[data-fluxoid-anim]{animation:fluxoid-slide-left ${ms}ms ease forwards}';\n  document.head.appendChild(style);\n  const obs=new MutationObserver(()=>{const el=document.querySelector('[class*=chat]');if(el&&!el._anim_set){el._anim_set=true;obs.observe(el,{childList:true});el.addEventListener('click',()=>{el.setAttribute('data-fluxoid-anim','1');setTimeout(()=>el.removeAttribute('data-fluxoid-anim'),${ms});})}});\n  obs.observe(document.body,{childList:true,subtree:true});\n})();`;
		case 'slide-right':
			return `// [fluxoid-anim:${key}] Slide Right transition\n(function(){\n  const style=document.createElement('style');\n  style.textContent='@keyframes fluxoid-slide-right{from{transform:translateX(-${px}px);opacity:0}to{transform:translateX(0);opacity:1}}[data-fluxoid-anim]{animation:fluxoid-slide-right ${ms}ms ease forwards}';\n  document.head.appendChild(style);\n  const obs=new MutationObserver(()=>{const el=document.querySelector('[class*=chat]');if(el&&!el._anim_set){el._anim_set=true;obs.observe(el,{childList:true});el.addEventListener('click',()=>{el.setAttribute('data-fluxoid-anim','1');setTimeout(()=>el.removeAttribute('data-fluxoid-anim'),${ms});})}});\n  obs.observe(document.body,{childList:true,subtree:true});\n})();`;
		case 'slide-up':
			return `// [fluxoid-anim:${key}] Slide Up transition\n(function(){\n  const style=document.createElement('style');\n  style.textContent='@keyframes fluxoid-slide-up{from{transform:translateY(${px}px);opacity:0}to{transform:translateY(0);opacity:1}}[data-fluxoid-anim]{animation:fluxoid-slide-up ${ms}ms ease forwards}';\n  document.head.appendChild(style);\n  const obs=new MutationObserver(()=>{const el=document.querySelector('[class*=chat]');if(el&&!el._anim_set){el._anim_set=true;obs.observe(el,{childList:true});el.addEventListener('click',()=>{el.setAttribute('data-fluxoid-anim','1');setTimeout(()=>el.removeAttribute('data-fluxoid-anim'),${ms});})}});\n  obs.observe(document.body,{childList:true,subtree:true});\n})();`;
		case 'slide-down':
			return `// [fluxoid-anim:${key}] Slide Down transition\n(function(){\n  const style=document.createElement('style');\n  style.textContent='@keyframes fluxoid-slide-down{from{transform:translateY(-${px}px);opacity:0}to{transform:translateY(0);opacity:1}}[data-fluxoid-anim]{animation:fluxoid-slide-down ${ms}ms ease forwards}';\n  document.head.appendChild(style);\n  const obs=new MutationObserver(()=>{const el=document.querySelector('[class*=chat]');if(el&&!el._anim_set){el._anim_set=true;obs.observe(el,{childList:true});el.addEventListener('click',()=>{el.setAttribute('data-fluxoid-anim','1');setTimeout(()=>el.removeAttribute('data-fluxoid-anim'),${ms});})}});\n  obs.observe(document.body,{childList:true,subtree:true});\n})();`;
		case 'checkerboard':
			return `// [fluxoid-anim:${key}] Checkerboard transition\n(function(){\n  const style=document.createElement('style');\n  style.textContent='@keyframes fluxoid-checker{0%{clip-path:inset(0 100% 0 0)}100%{clip-path:inset(0 0% 0 0)}}[data-fluxoid-anim]{animation:fluxoid-checker ${ms}ms steps(8) forwards}';\n  document.head.appendChild(style);\n  const obs=new MutationObserver(()=>{const el=document.querySelector('[class*=chat]');if(el&&!el._anim_set){el._anim_set=true;obs.observe(el,{childList:true});el.addEventListener('click',()=>{el.setAttribute('data-fluxoid-anim','1');setTimeout(()=>el.removeAttribute('data-fluxoid-anim'),${ms});})}});\n  obs.observe(document.body,{childList:true,subtree:true});\n})();`;
		case 'fade':
			return `// [fluxoid-anim:${key}] Fade transition\n(function(){\n  const style=document.createElement('style');\n  style.textContent='@keyframes fluxoid-fade{from{opacity:0}to{opacity:1}}[data-fluxoid-anim]{animation:fluxoid-fade ${ms}ms ease forwards}';\n  document.head.appendChild(style);\n  const obs=new MutationObserver(()=>{const el=document.querySelector('[class*=chat]');if(el&&!el._anim_set){el._anim_set=true;obs.observe(el,{childList:true});el.addEventListener('click',()=>{el.setAttribute('data-fluxoid-anim','1');setTimeout(()=>el.removeAttribute('data-fluxoid-anim'),${ms});})}});\n  obs.observe(document.body,{childList:true,subtree:true});\n})();`;
		case 'zoom-in':
			return `// [fluxoid-anim:${key}] Zoom In transition\n(function(){\n  const style=document.createElement('style');\n  style.textContent='@keyframes fluxoid-zoom{from{transform:scale(0.95);opacity:0}to{transform:scale(1);opacity:1}}[data-fluxoid-anim]{animation:fluxoid-zoom ${ms}ms ease forwards}';\n  document.head.appendChild(style);\n  const obs=new MutationObserver(()=>{const el=document.querySelector('[class*=chat]');if(el&&!el._anim_set){el._anim_set=true;obs.observe(el,{childList:true});el.addEventListener('click',()=>{el.setAttribute('data-fluxoid-anim','1');setTimeout(()=>el.removeAttribute('data-fluxoid-anim'),${ms});})}});\n  obs.observe(document.body,{childList:true,subtree:true});\n})();`;
		case 'glitch':
			return `// [fluxoid-anim:${key}] Glitch transition\n(function(){\n  const style=document.createElement('style');\n  style.textContent='@keyframes fluxoid-glitch{0%{transform:translate(0);filter:none}20%{transform:translate(-${px}px,${px}px);filter:hue-rotate(90deg)}40%{transform:translate(${px}px,-${px}px);filter:hue-rotate(180deg)}60%{transform:translate(-${px}px,0);filter:hue-rotate(270deg)}80%{transform:translate(0,${px}px);filter:none}100%{transform:translate(0);filter:none}}[data-fluxoid-anim]{animation:fluxoid-glitch ${ms}ms steps(4) forwards}';\n  document.head.appendChild(style);\n  const obs=new MutationObserver(()=>{const el=document.querySelector('[class*=chat]');if(el&&!el._anim_set){el._anim_set=true;obs.observe(el,{childList:true});el.addEventListener('click',()=>{el.setAttribute('data-fluxoid-anim','1');setTimeout(()=>el.removeAttribute('data-fluxoid-anim'),${ms});})}});\n  obs.observe(document.body,{childList:true,subtree:true});\n})();`;
		default:
			return '';
	}
}

const AnimationPresetsSection = observer(function AnimationPresetsSection() {
	const [open, setOpen] = useState(false);
	const [selected, setSelected] = useState<string | null>(null);
	const [distance, setDistance] = useState(100);
	const [duration, setDuration] = useState(300);

	const handleSelect = useCallback((key: string) => {
		const preset = ANIMATION_PRESETS.find(p => p.key === key);
		if (!preset) return;
		setSelected(key);
		setDistance(preset.defaultDistance);
		setDuration(preset.defaultDuration);
	}, []);

	const handleInsert = useCallback(() => {
		if (!selected) return;
		const snippet = buildAnimationSnippet(selected, distance, duration);
		if (!snippet) return;
		const animRegex = new RegExp(`\/\/ \[fluxoid-anim:${selected}\][^\n]*\n\(function\(\) \{[\s\S]*?\}\)\(\);`);
		let current = AccessibilityStore.customJs ?? '';
		if (animRegex.test(current)) {
			current = current.replace(animRegex, snippet.trim());
		} else {
			current = current ? `${current}\n\n${snippet}` : snippet;
		}
		AccessibilityActionCreators.update({customJs: current});
		ToastActionCreators.success(`Animation preset inserted.`);
	}, [selected, distance, duration]);

	const selectedPreset = ANIMATION_PRESETS.find(p => p.key === selected);

	return (
		<div className={styles.section}>
			<button type="button" className={styles.sectionToggle} onClick={() => setOpen(o => !o)}>
				{open ? <CaretDownIcon size={14} /> : <CaretRightIcon size={14} />}
				<span>Channel Transition Animations</span>
			</button>
			{open && (
				<div className={styles.sectionContent}>
					<p className={styles.sectionDesc}>Choose an animation that plays when switching channels.</p>
					<div className={styles.presetGrid}>
						{ANIMATION_PRESETS.map(p => (
							<button key={p.key} type="button"
								className={styles.presetBtn}
								style={selected === p.key ? {border: '1px solid var(--brand-500)'} : {}}
								onClick={() => handleSelect(p.key)}>
								{p.label}
							</button>
						))}
					</div>
					{selectedPreset && (
						<div style={{marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '8px'}}>
							{selectedPreset.defaultDistance > 0 && (
								<div style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
									<span style={{fontSize: '0.8rem', color: 'var(--text-muted)', minWidth: '110px'}}>Distance (px)</span>
									<input type="range" min={10} max={300} step={5} value={distance}
										onChange={e => setDistance(parseInt(e.target.value))}
										style={{flex: 1}} />
									<span style={{minWidth: '36px', fontSize: '0.8rem', color: 'var(--text-muted)'}}>{distance}px</span>
								</div>
							)}
							<div style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
								<span style={{fontSize: '0.8rem', color: 'var(--text-muted)', minWidth: '110px'}}>Duration (ms)</span>
								<input type="range" min={100} max={1500} step={50} value={duration}
									onChange={e => setDuration(parseInt(e.target.value))}
									style={{flex: 1}} />
								<span style={{minWidth: '36px', fontSize: '0.8rem', color: 'var(--text-muted)'}}>{duration}ms</span>
							</div>
							<Button variant="primary" fitContent onClick={handleInsert} style={{marginTop: '4px'}}>
								Insert into JS
							</Button>
						</div>
					)}
				</div>
			)}
		</div>
	);
});

// ─── Video Background Section ─────────────────────────────────────────────────

const VideoBgSection = observer(function VideoBgSection() {
	const [open, setOpen] = useState(false);
	const [url, setUrl] = useState(AccessibilityStore.videoBgUrl ?? '');
	const [audio, setAudio] = useState(AccessibilityStore.videoBgAudio ?? false);
	const [error, setError] = useState('');

	const handleUrlChange = useCallback((val: string) => {
		setUrl(val);
		if (!val) {
			setError('');
			AccessibilityActionCreators.update({videoBgUrl: null});
			return;
		}
		if (!isValidFluxerUrl(val)) {
			setError('Only fluxerusercontent.com links are supported.');
			return;
		}
		setError('');
		AccessibilityActionCreators.update({videoBgUrl: val});
	}, []);

	const handleAudioToggle = useCallback((val: boolean) => {
		setAudio(val);
		AccessibilityActionCreators.update({videoBgAudio: val});
	}, []);

	const handleInsert = useCallback(() => {
		const storedUrl = AccessibilityStore.videoBgUrl;
		if (!storedUrl) {
			ToastActionCreators.error(`Add a valid fluxerusercontent.com video URL first.`);
			return;
		}
		const snippet = `// [fluxoid-videobg] Video Background\n(function(){\n  const existing=document.getElementById('fluxoid-videobg');if(existing)existing.remove();\n  const v=document.createElement('video');\n  v.id='fluxoid-videobg';\n  v.src=${JSON.stringify(storedUrl)};\n  v.autoplay=true;v.loop=true;${audio ? '' : 'v.muted=true;'}\n  v.style.cssText='position:fixed;top:0;left:0;width:100vw;height:100vh;object-fit:cover;z-index:-1;pointer-events:none;';\n  document.body.prepend(v);\n})();`;
		const bgRegex = /\/\/ \[fluxoid-videobg\][^\n]*\n\(function\(\) \{[\s\S]*?\}\)\(\);/;
		let current = AccessibilityStore.customJs ?? '';
		if (bgRegex.test(current)) {
			current = current.replace(bgRegex, snippet.trim());
		} else {
			current = current ? `${current}\n\n${snippet}` : snippet;
		}
		AccessibilityActionCreators.update({customJs: current});
		ToastActionCreators.success(`Video background inserted.`);
	}, [audio]);

	return (
		<div className={styles.section}>
			<button type="button" className={styles.sectionToggle} onClick={() => setOpen(o => !o)}>
				{open ? <CaretDownIcon size={14} /> : <CaretRightIcon size={14} />}
				<span>Video Background</span>
			</button>
			{open && (
				<div className={styles.sectionContent}>
					<p className={styles.sectionDesc}>
						Paste a <strong>fluxerusercontent.com</strong> link to an MP4, WebM, or MOV file to use as an animated background.
						This will override any CSS background.
					</p>
					<input
						type="url"
						className={styles.soundUrlInput}
						placeholder="https://fluxerusercontent.com/..."
						value={url}
						onChange={e => handleUrlChange(e.target.value.trim())}
						style={{width: '100%', marginBottom: '6px'}}
					/>
					{error && <span className={styles.soundError}>{error}</span>}
					<div style={{display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px'}}>
						<input type="checkbox" id="videobg-audio" checked={audio} onChange={e => handleAudioToggle(e.target.checked)} />
						<label htmlFor="videobg-audio" style={{fontSize: '0.85rem', color: 'var(--text-normal)', cursor: 'pointer'}}>
							Enable video audio
						</label>
					</div>
					{url && !error && (
						<Button variant="primary" fitContent onClick={handleInsert} style={{marginTop: '8px'}}>
							Insert into JS
						</Button>
					)}
				</div>
			)}
		</div>
	);
});

// ─── Presets Section ──────────────────────────────────────────────────────────

const PresetsSection = observer(function PresetsSection({onInsert}: {onInsert: (code: string) => void}) {
	const [open, setOpen] = useState(false);
	return (
		<div className={styles.section}>
			<button type="button" className={styles.sectionToggle} onClick={() => setOpen(o => !o)}>
				{open ? <CaretDownIcon size={14} /> : <CaretRightIcon size={14} />}
				<span>Presets</span>
			</button>
			{open && (
				<div className={styles.sectionContent}>
					<p className={styles.sectionDesc}>Click a preset to insert or replace it in your JS field.</p>
					<div className={styles.presetGrid}>
						{PRESETS.map(preset => (
							<button key={preset.label} type="button" className={styles.presetBtn} onClick={() => onInsert(preset.code)}>
								{preset.label}
							</button>
						))}
					</div>
				</div>
			)}
		</div>
	);
});

// ─── Main Tab ─────────────────────────────────────────────────────────────────

export const CustomJsTabContent: React.FC = observer(() => {
	const {t} = useLingui();
	const customJs = AccessibilityStore.customJs ?? '';
	const [importCode, setImportCode] = useState('');
	const [scanResult, setScanResult] = useState<ReturnType<typeof scanCustomJs> | null>(() => {
		const js = AccessibilityStore.customJs;
		return js ? scanCustomJs(js) : null;
	});

	const handleChange = useCallback((event: React.ChangeEvent<HTMLTextAreaElement>) => {
		const value = event.target.value;
		if (value.length > 0) {
			const scan = scanCustomJs(value);
			if (scan.blocked) {
				ToastActionCreators.error(t`Script blocked: ${scan.blockReason}`);
				return;
			}
			setScanResult(scan);
		} else {
			setScanResult(null);
		}
		AccessibilityActionCreators.update({customJs: value.length > 0 ? value : null});
	}, []);

	const handleClear = useCallback(() => {
		AccessibilityActionCreators.update({customJs: null});
	}, []);

	const handleInsert = useCallback((code: string) => {
		const current = AccessibilityStore.customJs ?? '';
		// Extract key from marker comment e.g. // [fluxoid-preset:click]
		const keyMatch = code.match(/\/\/ \[fluxoid-(?:preset|sound):([\w]+)\]/);
		const key = keyMatch?.[1];
		const newVal = key ? replaceOrAppend(current, key, code) : (current ? `${current}\n\n${code}` : code);
		AccessibilityActionCreators.update({customJs: newVal});
	}, []);

	const handleImport = useCallback(() => {
		if (!importCode.trim()) return;
		try {
			const decoded = decodeURIComponent(escape(atob(importCode.trim())));
			const scan = scanCustomJs(decoded);
			console.log('[Security] scan result:', JSON.stringify(scan));
			if (scan.blocked) {
				ToastActionCreators.error(t`Script blocked: ${scan.blockReason}`);
				return;
			}
			const permLines = scan.permissions.map(p => `${p.type === 'safe' ? '✓' : '⚠'} ${p.label}`);
			const warnLines = scan.warnings.map(w => `⚠ ${w}`);
			const allLines = [...permLines, ...warnLines];
			if (allLines.length > 0) {
			const proceed = window.confirm(`This script requests the following permissions:\n\n${allLines.join('\n')}\n\nImport anyway?`);
				if (!proceed) return;
			}
			AccessibilityActionCreators.update({customJs: decoded});
			setScanResult(scan);
			setImportCode('');
			ToastActionCreators.success(t`Script imported successfully.`);
		} catch {
			ToastActionCreators.error(t`Invalid script code. Make sure you copied it correctly.`);
		}
	}, [importCode]);

	const handleShare = useCallback(() => {
		if (!customJs.trim()) {
			ToastActionCreators.error(t`Nothing to share — your JS field is empty.`);
			return;
		}
		ModalActionCreators.push(ModalActionCreators.modal(() => <ShareJsModal js={customJs} />));
	}, [customJs]);

	return (
		<div className={styles.container}>
			<p className={styles.description}>
				<Trans>Write custom JavaScript that runs when the app loads. Use this to add custom animations, sounds, or any other client-side behaviour.</Trans>
			</p>
			<div className={styles.warning}>
				<Trans>⚠️ Custom JS runs with full access to the page. Only paste code you trust completely.</Trans>
			</div>
			<div className={styles.importRow}>
				<input
					type="text"
					className={styles.importInput}
					placeholder={t`Paste a shared script code to import...`}
					value={importCode}
					onChange={e => setImportCode(e.target.value)}
				/>
				<Button variant="secondary" fitContent onClick={handleImport} disabled={!importCode.trim()}>
					<Trans>Import</Trans>
				</Button>
			</div>
			<PresetsSection onInsert={handleInsert} />
			<SoundUploadSlots />
			<AnimationPresetsSection />
			<VideoBgSection />
			{scanResult && !scanResult.blocked && (
				<PermissionSummary permissions={scanResult.permissions} warnings={scanResult.warnings} />
			)}
			<Textarea
				label={t`Custom JavaScript`}
				placeholder={t`// Add custom animations, sounds, or other client-side behaviour here.`}
				minRows={6}
				maxRows={20}
				value={customJs}
				onChange={handleChange}
			/>
			<div className={styles.buttonGroup}>
				<Button variant="primary" fitContent leftIcon={<ShareNetworkIcon size={16} />} onClick={handleShare} disabled={customJs.length === 0}>
					<Trans>Share script</Trans>
				</Button>
				<Button variant="secondary" fitContent onClick={handleClear} disabled={customJs.length === 0}>
					<Trans>Clear custom JS</Trans>
				</Button>
			</div>
		</div>
	);
});
