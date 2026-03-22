const chatEl = document.getElementById('chat');
const form = document.getElementById('form');
const input = document.getElementById('input');
const personalityEl = document.getElementById('personality');
const sendBtn = document.getElementById('send-btn');
const welcomeEl = document.getElementById('welcome');
const newChatBtn = document.getElementById('new-chat-btn');
const sidebarHistory = document.getElementById('sidebar-history');
const sidebarToggle = document.getElementById('sidebar-toggle');
const sidebar = document.getElementById('sidebar');
const sidebarOverlay = document.getElementById('sidebar-overlay');
const themeToggle = document.getElementById('theme-toggle');
const featureBtn = document.getElementById('feature-btn');
const featureMenu = document.getElementById('feature-menu');
const micBtn = document.getElementById('mic-send');
const activeModeEl = document.getElementById('active-mode');
const activeModeLabel = document.getElementById('active-mode-label');
const clearModeBtn = document.getElementById('clear-mode');
const filesPreview = document.getElementById('files-preview');
const fileInput = document.getElementById('file-input');
const dropOverlay = document.getElementById('drop-overlay');
const searchInput = document.getElementById('search-chats');
const settingsBtn = document.getElementById('settings-btn');
const settingsOverlay = document.getElementById('settings-overlay');
const settingsClose = document.getElementById('settings-close');
const settingsNav = document.getElementById('settings-nav');
const settingsTitle = document.getElementById('settings-title');

const SERVER_URL = window.location.origin;
const STORAGE_KEY = 'chatbot_chats';
const SETTINGS_KEY = 'chatbot_settings';
const AUTH_TOKEN_KEY = 'chatbot_auth_token';
const RESPONSE_TIMEOUT = 90000;

// ===== Auth =====
function getAuthToken() { return localStorage.getItem(AUTH_TOKEN_KEY); }
function setAuthToken(token) { localStorage.setItem(AUTH_TOKEN_KEY, token); }
function clearAuthToken() { localStorage.removeItem(AUTH_TOKEN_KEY); }
function authHeaders() {
	const token = getAuthToken();
	const h = { 'Content-Type': 'application/json' };
	if (token) h['Authorization'] = 'Bearer ' + token;
	return h;
}

let currentUser = null;

async function checkAuth() {
	try {
		const res = await fetch(SERVER_URL + '/api/auth/status', { headers: authHeaders() });
		const data = await res.json();
		if (data.authRequired && !data.authenticated) {
			showAuthScreen('login');
			return false;
		}
		if (data.user) currentUser = data.user;
		updateUserUI();
	} catch (e) {}
	hideAuthScreen();
	return true;
}

function showAuthScreen(mode) {
	let overlay = document.getElementById('auth-overlay');
	if (overlay) overlay.remove();

	overlay = document.createElement('div');
	overlay.id = 'auth-overlay';
	overlay.className = 'auth-overlay';

	const isLogin = mode === 'login';
	overlay.innerHTML = `
		<div class="auth-box">
			<div class="auth-logo">
				<svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="1.5"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
			</div>
			<h2>${isLogin ? 'Welcome Back' : 'Create Account'}</h2>
			<p>${isLogin ? 'Sign in to continue to NexusAI.' : 'Join NexusAI and start chatting.'}</p>
			${!isLogin ? '<input type="text" id="auth-name" placeholder="Display name (optional)" autocomplete="name" />' : ''}
			<input type="email" id="auth-email" placeholder="Email address" autocomplete="email" />
			<input type="password" id="auth-password" placeholder="Password${!isLogin ? ' (min 6 characters)' : ''}" autocomplete="${isLogin ? 'current-password' : 'new-password'}" />
			<button id="auth-submit-btn">${isLogin ? 'Sign In' : 'Create Account'}</button>
			<div id="auth-error" class="auth-error hidden"></div>
			<div class="auth-switch">
				${isLogin
					? "Don't have an account? <a href=\"#\" id=\"auth-switch-link\">Sign up free</a>"
					: 'Already have an account? <a href="#" id=\"auth-switch-link\">Sign in</a>'}
			</div>
		</div>`;
	document.body.appendChild(overlay);

	const emailInput = document.getElementById('auth-email');
	const pwInput = document.getElementById('auth-password');
	const nameInput = document.getElementById('auth-name');
	const submitBtn = document.getElementById('auth-submit-btn');
	const errEl = document.getElementById('auth-error');
	const switchLink = document.getElementById('auth-switch-link');

	switchLink.addEventListener('click', (e) => {
		e.preventDefault();
		showAuthScreen(isLogin ? 'signup' : 'login');
	});

	async function doSubmit() {
		errEl.classList.add('hidden');
		submitBtn.disabled = true;
		submitBtn.textContent = isLogin ? 'Signing in...' : 'Creating account...';
		try {
			const endpoint = isLogin ? '/api/auth/login' : '/api/auth/signup';
			const body = { email: emailInput.value, password: pwInput.value };
			if (!isLogin && nameInput) body.name = nameInput.value;

			const res = await fetch(SERVER_URL + endpoint, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(body),
			});
			const data = await res.json();
			if (res.ok && data.token) {
				setAuthToken(data.token);
				currentUser = data.user;
				updateUserUI();
				hideAuthScreen();
				initApp();
			} else {
				errEl.textContent = data.error || 'Something went wrong';
				errEl.classList.remove('hidden');
			}
		} catch (e) {
			errEl.textContent = 'Connection error';
			errEl.classList.remove('hidden');
		}
		submitBtn.disabled = false;
		submitBtn.textContent = isLogin ? 'Sign In' : 'Sign Up';
	}

	submitBtn.addEventListener('click', doSubmit);
	pwInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') doSubmit(); });
	emailInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') pwInput.focus(); });
	if (nameInput) nameInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') emailInput.focus(); });
	(nameInput || emailInput).focus();
}

function hideAuthScreen() {
	const overlay = document.getElementById('auth-overlay');
	if (overlay) overlay.classList.add('hidden');
}

function updateUserUI() {
	let badge = document.getElementById('user-badge');
	if (!currentUser) {
		if (badge) badge.remove();
		return;
	}
	if (!badge) {
		badge = document.createElement('div');
		badge.id = 'user-badge';
		badge.className = 'user-badge';
		const bottom = document.querySelector('.sidebar-bottom');
		if (bottom) bottom.prepend(badge);
	}
	const displayName = currentUser.name || currentUser.email.split('@')[0];
	const initial = displayName.charAt(0).toUpperCase();
	badge.innerHTML = `
		<div class="user-avatar">${initial}</div>
		<div class="user-info">
			<div class="user-name">${displayName}</div>
			<div class="user-email">${currentUser.email}</div>
		</div>
		<button id="logout-btn" class="logout-btn" title="Sign out">
			<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
		</button>`;
	document.getElementById('logout-btn').addEventListener('click', async () => {
		await fetch(SERVER_URL + '/api/auth/logout', { method: 'POST', headers: authHeaders() }).catch(() => {});
		clearAuthToken();
		currentUser = null;
		updateUserUI();
		chats = {};
		chatOrder = [];
		chatEl.innerHTML = '';
		showAuthScreen('login');
	});
}

// small-talk starters used for initial message and dynamic placeholder
const smallTalkStarters = [
	"Ask me anything — I'm here to help...",
	"What's on your mind today?",
	"Need help with code, writing, or ideas?",
	"Ready to explore?",
	"What's something you're curious about?",
	"Want to learn something new?",
	"Generate an image, write code, or just chat...",
	"Let's create something together...",
	"Any topic, any question...",
	"What's the most interesting thing you've learned recently?",
];
// follow-up question templates for suggestions
const followUpQuestions = [
	"What genre are you in the mood for today?",
	"Want a recommendation based on a specific coffee shop vibe?",
	"Anything special you're celebrating or winding down from?",
];

// Rotating suggestion topics — 4 random ones are picked each time
const suggestionPool = [
	// Science & Tech
	{ icon: 'lightbulb', label: 'Explain quantum computing', prompt: 'Explain quantum computing in simple terms' },
	{ icon: 'globe', label: 'Latest trends in AI', prompt: 'What are the latest trends in AI and technology?' },
	{ icon: 'lightbulb', label: 'How does blockchain work?', prompt: 'How does blockchain technology work? Explain simply' },
	{ icon: 'lightbulb', label: 'What is machine learning?', prompt: 'What is machine learning and how is it different from AI?' },
	{ icon: 'globe', label: 'Future of space exploration', prompt: 'What is the future of space exploration? Latest missions and plans' },
	{ icon: 'lightbulb', label: 'How do black holes form?', prompt: 'How do black holes form and what happens inside them?' },
	// Studies & Education
	{ icon: 'book', label: 'Help me study for a math exam', prompt: 'Help me study for a math exam — give me practice problems' },
	{ icon: 'book', label: 'Explain photosynthesis', prompt: 'Explain the process of photosynthesis step by step' },
	{ icon: 'book', label: 'World War II key events', prompt: 'What were the key events and turning points of World War II?' },
	{ icon: 'book', label: 'How to write a great essay', prompt: 'Give me tips on how to write a great essay with structure and examples' },
	{ icon: 'book', label: 'Explain Newton\'s laws', prompt: 'Explain Newton\'s three laws of motion with real-world examples' },
	{ icon: 'book', label: 'Tips for learning a new language', prompt: 'What are the best strategies for learning a new language quickly?' },
	// Politics & Current Affairs
	{ icon: 'globe', label: 'How do elections work?', prompt: 'How do elections work in a democracy? Explain the process' },
	{ icon: 'globe', label: 'What is the United Nations?', prompt: 'What is the United Nations and what does it do?' },
	{ icon: 'globe', label: 'Climate change explained', prompt: 'Explain climate change — causes, effects, and what can be done' },
	{ icon: 'globe', label: 'World economy overview', prompt: 'Give me an overview of the current state of the world economy' },
	// Creative & Fun
	{ icon: 'pen', label: 'Write a poem about the ocean', prompt: 'Write a short poem about the ocean' },
	{ icon: 'pen', label: 'Write a short story', prompt: 'Write a short creative story about a time traveler' },
	{ icon: 'lightbulb', label: 'Fun facts about animals', prompt: 'Tell me 5 surprising fun facts about animals' },
	{ icon: 'pen', label: 'Create a workout plan', prompt: 'Create a beginner-friendly weekly workout plan' },
	// Life & Career
	{ icon: 'lightbulb', label: 'Interview tips', prompt: 'Give me the best tips to ace a job interview' },
	{ icon: 'book', label: 'How to manage time better', prompt: 'What are the best time management techniques for students?' },
	{ icon: 'lightbulb', label: 'Start a side hustle', prompt: 'What are some easy side hustle ideas I can start today?' },
	{ icon: 'globe', label: 'History of the internet', prompt: 'Give me a brief history of the internet and how it evolved' },
	// Image Generation
	{ icon: 'image', label: 'Generate an image', prompt: 'generate an image of a futuristic cyberpunk city at night with neon lights' },
	{ icon: 'code', label: 'Write JavaScript code', prompt: 'Write a JavaScript function that generates fibonacci numbers' },
];

const suggestionIcons = {
	lightbulb: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>',
	globe: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>',
	book: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>',
	pen: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 19l7-7 3 3-7 7-3-3z"/><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"/><path d="M2 2l7.586 7.586"/><circle cx="11" cy="11" r="2"/></svg>',
	code: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>',
	image: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>',
};

function renderSuggestions() {
	const container = document.getElementById('suggestions');
	if (!container) return;
	container.innerHTML = '';
	// Pick 4 random unique items
	const shuffled = [...suggestionPool].sort(() => Math.random() - 0.5);
	const picked = shuffled.slice(0, 4);
	picked.forEach(item => {
		const btn = document.createElement('button');
		btn.className = 'suggestion-card';
		btn.innerHTML = (suggestionIcons[item.icon] || '') + '<span>' + item.label + '</span>';
		btn.addEventListener('click', () => sendMessage(item.prompt));
		container.appendChild(btn);
	});
}
function randomItem(arr) {
	return arr[Math.floor(Math.random() * arr.length)];
}

let isSending = false;
let currentChatId = null;
let chats = {};
let chatOrder = [];
let activeMode = null;
let pendingImages = [];       // Array of { dataUrl, name }
let pendingDocText = null;    // Extracted text from PDF/PPTX
let pendingDocName = null;    // Filename of the attached document
let pendingDocExtracting = false; // True while extraction is in progress
let activeDocText = null;     // Persists document context for follow-up messages
let activeDocName = null;

// ===== Theme =====
function initTheme() {
	if (!appSettings.theme || appSettings.theme === 'system' || appSettings.theme === 'dark') {
		document.documentElement.setAttribute('data-theme', 'dark');
	} else {
		document.documentElement.removeAttribute('data-theme');
	}
}

function toggleTheme() {
	const current = document.documentElement.getAttribute('data-theme');
	const next = current === 'dark' ? 'light' : 'dark';
	if (next === 'dark') {
		document.documentElement.setAttribute('data-theme', 'dark');
	} else {
		document.documentElement.setAttribute('data-theme', 'light');
	}
	appSettings.theme = next;
	saveSettings();
	updateThemeButton(next);
}

function updateThemeButton(theme) {
	if (!themeToggle) return;
	const isDark = theme === 'dark';
	const span = themeToggle.querySelector('span');
	if (span) {
		span.textContent = isDark ? 'Dark mode' : 'Light mode';
	}
	themeToggle.title = isDark ? 'Switch to light mode' : 'Switch to dark mode';
}

// ===== Sidebar (mobile) =====
function openSidebar() {
	sidebar.classList.add('open');
	sidebarOverlay.classList.add('open');
}

function closeSidebar() {
	sidebar.classList.remove('open');
	sidebarOverlay.classList.remove('open');
}

// ===== Chat Storage =====
function saveChats() {
	try {
		const data = {};
		for (const [id, chat] of Object.entries(chats || {})) {
			if (!chat || !chat.messages) continue;
			data[id] = { title: chat.title, messages: chat.messages.slice(-50), memory: chat.memory || {} };
		}
		const validOrder = chatOrder.filter(id => id && chats[id]);
		const payload = { chats: data, order: validOrder };
		localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
	} catch (err) {
		console.warn('saveChats error, skipping persistence', err);
	}
}

// Save a single message to server DB
function saveMessageToServer(chatId, role, text, image, ts) {
	fetch(SERVER_URL + '/api/chats/' + chatId + '/messages', {
		method: 'POST',
		headers: authHeaders(),
		body: JSON.stringify({ role, text, image: image || undefined, ts }),
	}).catch(() => {});
}

// Create chat on server
function createChatOnServer(id, title) {
	fetch(SERVER_URL + '/api/chats', {
		method: 'POST',
		headers: authHeaders(),
		body: JSON.stringify({ id, title }),
	}).catch(() => {});
}

// Update chat title on server
function updateChatTitleOnServer(id, title) {
	fetch(SERVER_URL + '/api/chats/' + id, {
		method: 'PUT',
		headers: authHeaders(),
		body: JSON.stringify({ title }),
	}).catch(() => {});
}

// Delete chat on server
function deleteChatOnServer(id) {
	fetch(SERVER_URL + '/api/chats/' + id, {
		method: 'DELETE',
		headers: authHeaders(),
	}).catch(() => {});
}

async function loadChats() {
	// Try loading from server first
	try {
		const res = await fetch(SERVER_URL + '/api/chats', { headers: authHeaders() });
		if (res.ok) {
			const data = await res.json();
			if (data.chats && data.chats.length > 0) {
				chats = {};
				chatOrder = [];
				for (const c of data.chats) {
					// Load full chat with messages
					try {
						const chatRes = await fetch(SERVER_URL + '/api/chats/' + c.id, { headers: authHeaders() });
						if (chatRes.ok) {
							const chatData = await chatRes.json();
							chats[c.id] = {
								title: chatData.chat.title,
								messages: (chatData.chat.messages || []).map(m => ({ role: m.role, text: m.text, image: m.image, ts: m.ts })),
								memory: {},
							};
							chatOrder.push(c.id);
						}
					} catch (e) {}
				}
				renderSidebarHistory();
				saveChats();
				return;
			}
		}
	} catch (e) {}

	// Fallback to localStorage
	try {
		const raw = localStorage.getItem(STORAGE_KEY);
		if (raw) {
			const parsed = JSON.parse(raw);
			if (parsed && typeof parsed === 'object' && parsed.chats) {
				chats = parsed.chats || {};
				chatOrder = Array.isArray(parsed.order) ? parsed.order.filter(id => id && chats[id]) : Object.keys(chats);
			} else if (parsed && typeof parsed === 'object') {
				chats = parsed || {};
				chatOrder = Object.keys(chats);
			}
			for (const id of Object.keys(chats)) {
				if (chats[id] && !chats[id].memory) chats[id].memory = {};
			}
		}
	} catch (err) {
		console.warn('loadChats failed, resetting storage', err);
		chats = {};
		chatOrder = [];
	}
	renderSidebarHistory();
}

function generateId() {
	return 'chat_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
}

function createNewChat() {
	// Don't create the chat entry yet — just show the welcome screen.
	// The chat will be created in sendMessage when the user actually types something.
	currentChatId = null;
	activeDocText = null;
	activeDocName = null;

	chatEl.innerHTML = '';
	welcomeEl.classList.remove('hidden');
	chatEl.classList.remove('active');

	// refresh suggestion cards with new random topics
	renderSuggestions();
	// update input placeholder with a random starter as gentle prompt
	input.placeholder = randomItem(smallTalkStarters);

	renderSidebarHistory();
	closeSidebar();
	input.focus();
}

function switchChat(id) {
	if (!id || !chats[id]) return;
	currentChatId = id;
	activeDocText = null;
	activeDocName = null;
	chatEl.innerHTML = '';
	chats[id].messages.forEach(m => addMessage(m.role, m.text, true, m.image, m.ts));
	welcomeEl.classList.add('hidden');
	chatEl.classList.add('active');
	renderSidebarHistory();
	closeSidebar();
	chatEl.scrollTop = chatEl.scrollHeight;
}

function deleteChat(id) {
	if (!id) return;
	if (!chats[id]) {
		if (chatOrder.includes(id)) {
			const idx = chatOrder.indexOf(id);
			chatOrder.splice(idx, 1);
		}
		renderSidebarHistory();
		return;
	}
	delete chats[id];
	const idx = chatOrder.indexOf(id);
	if (idx !== -1) chatOrder.splice(idx, 1);
	if (currentChatId === id) {
		currentChatId = null;
		chatEl.innerHTML = '';
		welcomeEl.classList.remove('hidden');
		chatEl.classList.remove('active');
	}
	saveChats();
	deleteChatOnServer(id);
	renderSidebarHistory();
}

function renderSidebarHistory() {
	sidebarHistory.innerHTML = '';
  
	const ids = chatOrder.slice().reverse(); // show newest first
	if (ids.length > 0) {
		const labelEl = document.createElement('div');
		labelEl.className = 'sidebar-section-label';
		labelEl.textContent = 'Your chats';
		sidebarHistory.appendChild(labelEl);
	}

	ids.forEach((id) => {
		if (!id || !chats[id]) return;
		const btn = document.createElement('div');
		btn.className = 'chat-history-item' + (id === currentChatId ? ' active' : '');
		btn.dataset.id = id;

		const titleEl = document.createElement('span');
		titleEl.textContent = chats[id].title || 'New chat';
		titleEl.className = 'chat-title';
		titleEl.onclick = () => switchChat(id);
		btn.appendChild(titleEl);

		btn.addEventListener('contextmenu', (e) => {
			e.preventDefault();
			showChatContextMenu(id, e.clientX, e.clientY);
		});

		// Action buttons container
		const actionsEl = document.createElement('div');
		actionsEl.className = 'chat-item-actions';

		// Rename button
		const renameBtn = document.createElement('button');
		renameBtn.className = 'chat-item-btn';
		renameBtn.title = 'Rename';
		renameBtn.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>';
		renameBtn.onclick = (e) => {
			e.stopPropagation();
			startRenameChat(id, btn, titleEl);
		};
		actionsEl.appendChild(renameBtn);

		// Delete button
		const del = document.createElement('button');
		del.className = 'chat-item-btn delete';
		del.title = 'Delete';
		del.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>';
		del.onclick = (e) => {
			e.stopPropagation();
			deleteChat(id);
		};
		actionsEl.appendChild(del);

		btn.appendChild(actionsEl);
		sidebarHistory.appendChild(btn);
	});
}

function startRenameChat(id, itemEl, titleEl) {
	const currentTitle = chats[id].title || 'New chat';
	const renameInput = document.createElement('input');
	renameInput.className = 'chat-rename-input';
	renameInput.value = currentTitle;
	renameInput.type = 'text';

	// Replace title with input
	titleEl.style.display = 'none';
	itemEl.insertBefore(renameInput, titleEl.nextSibling);
	renameInput.focus();
	renameInput.select();

	function finishRename() {
		const newTitle = renameInput.value.trim() || currentTitle;
		chats[id].title = newTitle;
		saveChats();
		renameInput.remove();
		titleEl.textContent = newTitle;
		titleEl.style.display = '';
	}

	renameInput.addEventListener('blur', finishRename);
	renameInput.addEventListener('keydown', (e) => {
		if (e.key === 'Enter') { e.preventDefault(); renameInput.blur(); }
		if (e.key === 'Escape') { renameInput.value = currentTitle; renameInput.blur(); }
	});
}

function updateChatTitle(message) {
	if (!currentChatId || !chats[currentChatId]) return;
	if (chats[currentChatId].title === 'New chat') {
		const newTitle = message.slice(0, 40) + (message.length > 40 ? '...' : '');
		chats[currentChatId].title = newTitle;
		saveChats();
		updateChatTitleOnServer(currentChatId, newTitle);
		renderSidebarHistory();
	}
}

// ===== Scroll to Bottom =====
let isNearBottom = true;
let hasUnreadMessages = false;

function scrollToBottom(smooth = true) {
  if (!chatEl) return;
  chatEl.scrollTo({ top: chatEl.scrollHeight, behavior: smooth ? 'smooth' : 'instant' });
  hasUnreadMessages = false;
  const btn = document.getElementById('scroll-bottom-btn');
  if (btn) btn.classList.add('hidden');
}

function checkScrollPosition() {
  if (!chatEl) return;
  const threshold = 150;
  isNearBottom = (chatEl.scrollHeight - chatEl.scrollTop - chatEl.clientHeight) < threshold;
  const btn = document.getElementById('scroll-bottom-btn');
  if (btn) {
    if (!isNearBottom && chatEl.scrollHeight > chatEl.clientHeight) {
      btn.classList.remove('hidden');
    } else {
      btn.classList.add('hidden');
    }
  }
}

chatEl?.addEventListener('scroll', checkScrollPosition);

// ===== Messages =====

function formatTime(date) {
	return new Date(date || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function createMsgEl(role, timestamp) {
	const msg = document.createElement('div');
	msg.className = 'msg ' + role;
	const inner = document.createElement('div');
	inner.className = 'msg-inner';
	const avatar = document.createElement('div');
	avatar.className = 'msg-avatar';
	avatar.textContent = role === 'user' ? 'Y' : 'B';
	const body = document.createElement('div');
	body.className = 'msg-body';
	const header = document.createElement('div');
	header.className = 'msg-header';
	const name = document.createElement('div');
	name.className = 'msg-name';
	name.textContent = role === 'user' ? 'You' : 'NexusAI';
	const time = document.createElement('span');
	time.className = 'msg-time';
	time.textContent = formatTime(timestamp);
	header.appendChild(name);
	header.appendChild(time);
	body.appendChild(header);
	inner.appendChild(avatar);
	inner.appendChild(body);
	msg.appendChild(inner);
	return { msg, body };
}

function renderMarkdown(text) {
	if (!text) return '';
	let html = text
		.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
		.replace(/```(\w*)\n([\s\S]*?)```/g, '<pre><code class="lang-$1">$2</code></pre>')
		.replace(/`([^`]+)`/g, '<code>$1</code>')
		.replace(/^### (.+)$/gm, '<h4>$1</h4>')
		.replace(/^## (.+)$/gm, '<h3>$1</h3>')
		.replace(/^# (.+)$/gm, '<h2>$1</h2>')
		.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
		.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
		.replace(/\*(.+?)\*/g, '<em>$1</em>')
		.replace(/^---$/gm, '<hr>')
		.replace(/^[\*\-] (.+)$/gm, '<li>$1</li>')
		.replace(/^\d+\. (.+)$/gm, '<li>$1</li>');

	// Tables
	html = html.replace(/^\|(.+)\|\s*\n\|[-:\s|]+\|\s*\n((?:\|.+\|\s*\n?)+)/gm, (match, header, body) => {
		const ths = header.split('|').filter(c => c.trim()).map(c => `<th>${c.trim()}</th>`).join('');
		const rows = body.trim().split('\n').map(row => {
			const cells = row.split('|').filter(c => c !== undefined).map(c => `<td>${c.trim()}</td>`).join('');
			return `<tr>${cells}</tr>`;
		}).join('');
		return `<table><thead><tr>${ths}</tr></thead><tbody>${rows}</tbody></table>`;
	});

	html = html.replace(/((?:<li>.*<\/li>\n?)+)/g, (match) => '<ul>' + match + '</ul>');

	html = html.split('\n').map(line => {
		const trimmed = line.trim();
		if (!trimmed) return '';
		if (/^<(h[2-4]|ul|ol|li|pre|hr|table|blockquote)/.test(trimmed)) return trimmed;
		if (/<\/(h[2-4]|ul|ol|pre|table|blockquote)>$/.test(trimmed)) return trimmed;
		if (trimmed.startsWith('<')) return trimmed;
		return '<p>' + trimmed + '</p>';
	}).join('\n');

	html = html.replace(/<p><\/p>/g, '').replace(/<p>(<ul>)/g, '$1').replace(/(<\/ul>)<\/p>/g, '$1');

	return html;
}

function addMessage(role, text, skipSave, imageData, timestamp) {
	const ts = timestamp || Date.now();
	const { msg, body } = createMsgEl(role, ts);

	// Show attached image(s) in user message
	if (role === 'user' && imageData) {
		const images = Array.isArray(imageData) ? imageData : [imageData];
		images.forEach(src => {
			const imgWrap = document.createElement('div');
			imgWrap.className = 'msg-image';
			const img = document.createElement('img');
			img.src = typeof src === 'object' ? src.dataUrl : src;
			img.alt = 'Uploaded image';
			imgWrap.appendChild(img);
			body.appendChild(imgWrap);
		});
	}
	// Show document indicator in user message
	if (role === 'user' && pendingDocName && pendingDocText) {
		const docWrap = document.createElement('div');
		docWrap.className = 'msg-pdf-badge';
		docWrap.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg> ' + pendingDocName;
		body.appendChild(docWrap);
	}

	const content = document.createElement('div');
	content.className = 'msg-text';
	if (role === 'bot') {
		content.innerHTML = renderMarkdown(text);
	} else {
		content.textContent = text;
	}
	body.appendChild(content);

	// Edit button for user messages
	if (role === 'user') {
		const actions = document.createElement('div');
		actions.className = 'msg-actions';
		const editBtn = document.createElement('button');
		editBtn.className = 'msg-action-btn';
		editBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg> Edit';
		editBtn.onclick = () => {
			if (isSending) return;
			const editArea = document.createElement('textarea');
			editArea.className = 'msg-edit-input';
			editArea.value = text;
			editArea.rows = 2;
			const btnRow = document.createElement('div');
			btnRow.className = 'msg-edit-btns';
			const saveBtn = document.createElement('button');
			saveBtn.className = 'msg-edit-save';
			saveBtn.textContent = 'Send';
			const cancelBtn = document.createElement('button');
			cancelBtn.className = 'msg-edit-cancel';
			cancelBtn.textContent = 'Cancel';
			btnRow.appendChild(saveBtn);
			btnRow.appendChild(cancelBtn);
			content.style.display = 'none';
			actions.style.display = 'none';
			body.appendChild(editArea);
			body.appendChild(btnRow);
			editArea.focus();
			editArea.setSelectionRange(editArea.value.length, editArea.value.length);

			cancelBtn.onclick = () => {
				editArea.remove();
				btnRow.remove();
				content.style.display = '';
				actions.style.display = '';
			};
			saveBtn.onclick = () => {
				const newText = editArea.value.trim();
				if (!newText || newText === text) {
					cancelBtn.click();
					return;
				}
				// Remove this message and all messages after it from data and DOM
				const msgs = chats[currentChatId]?.messages;
				if (!msgs) return;
				// Find this message index by matching text and timestamp
				let idx = -1;
				for (let i = msgs.length - 1; i >= 0; i--) {
					if (msgs[i].role === 'user' && msgs[i].text === text) { idx = i; break; }
				}
				if (idx === -1) { cancelBtn.click(); return; }
				// Remove from idx onward
				msgs.splice(idx);
				saveChats();
				// Remove DOM elements from this msg onward
				let sibling = msg;
				while (sibling) {
					const next = sibling.nextElementSibling;
					sibling.remove();
					sibling = next;
				}
				// Re-send with edited text
				sendMessage(newText);
			};
			editArea.addEventListener('keydown', (e) => {
				if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); saveBtn.click(); }
				if (e.key === 'Escape') cancelBtn.click();
			});
		};
		actions.appendChild(editBtn);
		body.appendChild(actions);
	}

	// Copy & Regenerate action buttons for bot messages
	if (role === 'bot') {
		const actions = document.createElement('div');
		actions.className = 'msg-actions';

		// Copy button
		const copyBtn = document.createElement('button');
		copyBtn.className = 'msg-action-btn';
		copyBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg> Copy';
		copyBtn.onclick = () => {
			navigator.clipboard.writeText(text).then(() => {
				copyBtn.classList.add('copied');
				copyBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg> Copied';
				setTimeout(() => {
					copyBtn.classList.remove('copied');
					copyBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg> Copy';
				}, 2000);
			});
		};
		actions.appendChild(copyBtn);

		// Speaker button (TTS)
		const speakBtn = document.createElement('button');
		speakBtn.className = 'msg-action-btn';
		speakBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/></svg> Speak';
		speakBtn.onclick = () => {
			if (speechSynthesis.speaking) {
				speechSynthesis.cancel();
				speakBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/></svg> Speak';
				return;
			}
			speakBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg> Stop';
			const prevTts = appSettings.ttsEnabled;
			appSettings.ttsEnabled = true;
			speakText(text);
			appSettings.ttsEnabled = prevTts;
			const onEnd = () => {
				speakBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/></svg> Speak';
			};
			// Listen for end of speech
			const checkDone = setInterval(() => {
				if (!speechSynthesis.speaking) { clearInterval(checkDone); onEnd(); }
			}, 300);
		};
		actions.appendChild(speakBtn);

		// Regenerate button (only on the last bot message, not on history reload)
		if (!skipSave) {
			const regenBtn = document.createElement('button');
			regenBtn.className = 'msg-action-btn';
			regenBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg> Regenerate';
			regenBtn.onclick = () => {
				if (isSending) return;
				// Find the last user message to regenerate from
				const msgs = chats[currentChatId]?.messages;
				if (!msgs) return;
				let lastUserMsg = '';
				for (let i = msgs.length - 1; i >= 0; i--) {
					if (msgs[i].role === 'user') { lastUserMsg = msgs[i].text; break; }
				}
				if (!lastUserMsg) return;
				// Remove the last bot message from data and DOM
				msgs.pop();
				msg.remove();
				saveChats();
				sendMessage(lastUserMsg);
			};
			actions.appendChild(regenBtn);
		}

		body.appendChild(actions);
		// Auto-speak new bot messages
		if (!skipSave && appSettings.ttsEnabled) {
			speakText(text);
		}
	}

	chatEl.appendChild(msg);
	chatEl.scrollTop = chatEl.scrollHeight;

	if (!skipSave && currentChatId && chats[currentChatId]) {
		chats[currentChatId].messages.push({ role, text, image: imageData || undefined, ts });
		saveChats();
		saveMessageToServer(currentChatId, role, text, imageData, ts);
	}
}

function showTypingIndicator(thinkingText) {
	removeTypingIndicator();
	const { msg, body } = createMsgEl('bot');
	msg.id = 'typing-indicator';
	const indicator = document.createElement('div');
	indicator.className = 'thinking-indicator';
	const label = document.createElement('span');
	label.className = 'thinking-label';
	label.textContent = thinkingText || 'Thinking';
	indicator.appendChild(label);
	body.appendChild(indicator);
	chatEl.appendChild(msg);
	chatEl.scrollTop = chatEl.scrollHeight;
}

function removeTypingIndicator() {
	const el = document.getElementById('typing-indicator');
	if (el) el.remove();
}

function updateThinkingText(text) {
	const el = document.querySelector('.thinking-label');
	if (el) el.textContent = text;
}

function setInputEnabled(enabled) {
	isSending = !enabled;
	input.disabled = !enabled;
	sendBtn.disabled = !enabled;
	if (enabled) input.focus();
}

function autoResizeTextarea() {
	input.style.height = 'auto';
	const lineHeight = parseInt(getComputedStyle(input).lineHeight) || 22;
	const maxHeight = lineHeight * 5;
	input.style.height = Math.min(input.scrollHeight, maxHeight) + 'px';
}

function getRecentHistory() {
	if (!currentChatId || !chats[currentChatId]) return [];
	return chats[currentChatId].messages.slice(-10);
}

// ===== Send Message =====
async function sendMessage(message) {
	if (!message || !message.trim()) return;

	// Ensure we have a chat — create it on first message
	if (!currentChatId || !chats[currentChatId]) {
		currentChatId = generateId();
		chats[currentChatId] = { title: 'New chat', messages: [], memory: {} };
		chatOrder.unshift(currentChatId);
		createChatOnServer(currentChatId, 'New chat');
		renderSidebarHistory();
	}

	// Hide welcome, show chat
	welcomeEl.classList.add('hidden');
	chatEl.classList.add('active');

	const personality = personalityEl.value || 'Friendly';
	const sentImages = pendingImages.length > 0 ? [...pendingImages] : null;
	addMessage('user', message, false, sentImages);
	updateChatTitle(message);

	input.value = '';
	autoResizeTextarea();
	setInputEnabled(false);
	showTypingIndicator();

	// Wait for document extraction to finish before sending
	if (pendingDocExtracting) {
		await new Promise(resolve => {
			const check = setInterval(() => {
				if (!pendingDocExtracting) { clearInterval(check); resolve(); }
			}, 200);
		});
	}

	try {
		const controller = new AbortController();
		const timeout = (activeMode === 'deep-research' || activeMode === 'thinking') ? 120000 : RESPONSE_TIMEOUT;
		const timeoutId = setTimeout(() => controller.abort(), timeout);

		// Persist document context for follow-up messages
		if (pendingDocText) {
			activeDocText = pendingDocText;
			activeDocName = pendingDocName;
		}
		const docSource = activeDocText || pendingDocText;
		const docLabel = activeDocName || pendingDocName;
		const docCtx = docSource ? `[Document: ${docLabel || 'uploaded file'}]\n\n${docSource}` : undefined;
		const firstImage = pendingImages.length > 0 ? pendingImages[0].dataUrl : undefined;
		const res = await fetch(SERVER_URL + '/api/chat/stream', {
			method: 'POST',
			headers: authHeaders(),
			body: JSON.stringify({ 
				message, 
				personality, 
				history: getRecentHistory(),
				mode: activeMode || 'default',
				image: firstImage,
				pdfContext: docCtx,
				customInstructions: appSettings.customInstructions || undefined,
				nickname: appSettings.nickname || undefined,
				occupation: appSettings.occupation || undefined,
			}),
			signal: controller.signal
		});

		if (pendingImages.length > 0 || pendingDocName) {
			pendingImages = [];
			pendingDocText = null;
			pendingDocName = null;
			pendingDocExtracting = false;
			renderFilesPreview();
		}

		removeTypingIndicator();

		if (!res.ok) {
			clearTimeout(timeoutId);
			if (res.status === 401) {
				addMessage('bot', 'Session expired. Please refresh and log in again.');
				clearAuthToken();
			} else {
				addMessage('bot', 'Error: Server returned ' + res.status);
			}
			return;
		}

		// Stream the response
		const { msg, body } = createMsgEl('bot');
		const content = document.createElement('div');
		content.className = 'msg-text';
		body.appendChild(content);
		chatEl.appendChild(msg);

		let fullText = '';
		let thinkingState = null;
		const reader = res.body.getReader();
		const decoder = new TextDecoder();
		let buffer = '';
		let lastChunkTime = Date.now();
		let streamingCursor = null;

		while (true) {
			const { done, value } = await reader.read();
			if (done) break;
			buffer += decoder.decode(value, { stream: true });
			const lines = buffer.split('\n');
			buffer = lines.pop() || '';
			for (const line of lines) {
				if (!line.startsWith('data: ')) continue;
				const payload = line.slice(6).trim();
				if (payload === '[DONE]') continue;
				try {
					const data = JSON.parse(payload);
					if (data.thinking) {
						if (!thinkingState) {
							showTypingIndicator(data.thinking);
							thinkingState = data.thinking;
						} else {
							updateThinkingText(data.thinking);
						}
					}
					if (data.chunk) {
						if (thinkingState) {
							removeTypingIndicator();
							thinkingState = null;
						}
						fullText += data.chunk;
						content.innerHTML = renderMarkdown(fullText);

						// Add streaming cursor if response is slow
						if (!streamingCursor && Date.now() - lastChunkTime > 1500) {
							streamingCursor = document.createElement('span');
							streamingCursor.className = 'streaming-cursor';
							content.appendChild(streamingCursor);
						}
						lastChunkTime = Date.now();

						chatEl.scrollTop = chatEl.scrollHeight;
					}
					if (data.error) {
						if (thinkingState) {
							removeTypingIndicator();
							thinkingState = null;
						}
						fullText += '\n\nError: ' + data.error;
						content.innerHTML = renderMarkdown(fullText);
					}
				} catch (e) {}
			}
		}

		clearTimeout(timeoutId);

		// Remove streaming cursor
		if (streamingCursor && streamingCursor.parentNode) {
			streamingCursor.remove();
		}

		// Setup code execution for new code blocks
		setupCodeExecution();

		// Add action buttons to the streamed message
		if (fullText) {
			const actions = document.createElement('div');
			actions.className = 'msg-actions';
			const copyBtn = document.createElement('button');
			copyBtn.className = 'msg-action-btn';
			copyBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg> Copy';
			copyBtn.onclick = () => {
				navigator.clipboard.writeText(fullText).then(() => {
					copyBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg> Copied';
					setTimeout(() => {
						copyBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg> Copy';
					}, 2000);
				});
			};
			actions.appendChild(copyBtn);

			// Speaker button for streamed message
			const speakBtn = document.createElement('button');
			speakBtn.className = 'msg-action-btn';
			speakBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/></svg> Speak';
			speakBtn.onclick = () => {
				if (speechSynthesis.speaking) {
					speechSynthesis.cancel();
					speakBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/></svg> Speak';
					return;
				}
				speakBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg> Stop';
				const prevTts = appSettings.ttsEnabled;
				appSettings.ttsEnabled = true;
				speakText(fullText);
				appSettings.ttsEnabled = prevTts;
				const checkDone = setInterval(() => {
					if (!speechSynthesis.speaking) {
						clearInterval(checkDone);
						speakBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/></svg> Speak';
					}
				}, 300);
			};
			actions.appendChild(speakBtn);
			body.appendChild(actions);

			// Auto-speak streamed response
			if (appSettings.ttsEnabled) {
				speakText(fullText);
			}

			// Save the bot response
			const ts = Date.now();
			if (currentChatId && chats[currentChatId]) {
				chats[currentChatId].messages.push({ role: 'bot', text: fullText, ts });
				saveChats();
				saveMessageToServer(currentChatId, 'bot', fullText, null, ts);
			}
		}
	} catch (err) {
		removeTypingIndicator();
		if (err.name === 'AbortError') {
			addMessage('bot', 'Request timed out. Please try again.');
		} else {
			addMessage('bot', 'Error: ' + err.message);
		}
	} finally {
		setInputEnabled(true);
	}
}

// ===== Event Listeners =====
form.addEventListener('submit', (e) => {
	e.preventDefault();
	const text = input.value.trim();
	if (!text || isSending) return;
	sendMessage(text);
});

input.addEventListener('keydown', (e) => {
	if (e.key === 'Enter' && !e.shiftKey && appSettings.enterSend) {
		e.preventDefault();
		form.dispatchEvent(new Event('submit'));
	}
});

input.addEventListener('input', autoResizeTextarea);
// randomize placeholder each time input gains focus
input.addEventListener('focus', () => {
	input.placeholder = smallTalkStarters[Math.floor(Math.random() * smallTalkStarters.length)];
});
newChatBtn.addEventListener('click', createNewChat);
// toolbar new-chat removed; sidebar New chat handles creation
themeToggle.addEventListener('click', toggleTheme);
sidebarToggle.addEventListener('click', openSidebar);
sidebarOverlay.addEventListener('click', closeSidebar);

// ===== Feature Menu =====
featureBtn.addEventListener('click', (e) => {
	e.stopPropagation();
	featureMenu.classList.toggle('hidden');
	const expanded = !featureMenu.classList.contains('hidden');
	featureBtn.setAttribute('aria-expanded', String(expanded));
});

document.addEventListener('click', (e) => {
	if (!featureMenu.contains(e.target) && e.target !== featureBtn) {
		featureMenu.classList.add('hidden');
		featureBtn.setAttribute('aria-expanded', 'false');
	}
});

document.querySelectorAll('.feature-menu-item').forEach(item => {
	item.addEventListener('click', () => {
		const mode = item.dataset.mode;
		const action = item.dataset.action;
		featureMenu.classList.add('hidden');
		featureBtn.setAttribute('aria-expanded', 'false');

		if (mode === 'image') {
			fileInput.click();
			return;
		}

		if (action === 'generate-image') {
			showImageGenDialog();
			return;
		}

		activeMode = mode;
		const modeLabels = {
			'web-search': 'Web search',
			'thinking': 'Thinking',
			'deep-research': 'Deep research',
			'study': 'Study and learn',
			'quiz': 'Quizzes',
			'voice': 'Voice mode',
		};

		if (mode === 'voice') {
			openVoicePanel();
			activeModeEl.classList.add('hidden');
			return;
		}

		activeModeLabel.textContent = modeLabels[mode] || mode;
		activeModeEl.classList.remove('hidden');
		input.focus();
	});
});

clearModeBtn.addEventListener('click', () => {
	activeMode = null;
	activeModeEl.classList.add('hidden');
});

// ===== File Handling (Images, PDFs, PPTs — multi-file & drag-drop) =====

function isImageFile(file) {
	return file.type.startsWith('image/');
}
function isPdfFile(file) {
	return file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
}
function isPptFile(file) {
	return file.type === 'application/vnd.ms-powerpoint' ||
		file.type === 'application/vnd.openxmlformats-officedocument.presentationml.presentation' ||
		/\.pptx?$/i.test(file.name);
}

function renderFilesPreview() {
	filesPreview.innerHTML = '';
	const hasFiles = pendingImages.length > 0 || pendingDocName;
	filesPreview.classList.toggle('hidden', !hasFiles);
	if (!hasFiles) return;

	// Render image thumbnails
	pendingImages.forEach((img, idx) => {
		const item = document.createElement('div');
		item.className = 'file-preview-item';
		item.innerHTML = `<img src="${img.dataUrl}" alt="${img.name}" /><button class="file-preview-remove" data-type="image" data-idx="${idx}">×</button>`;
		filesPreview.appendChild(item);
	});

	// Render document badge
	if (pendingDocName) {
		const item = document.createElement('div');
		item.className = 'file-preview-item file-preview-doc';
		const icon = pendingDocName.match(/\.pptx?$/i)
			? '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#f97316" stroke-width="2"><rect x="2" y="3" width="20" height="18" rx="2"/><path d="M8 12h8M8 16h5"/></svg>'
			: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>';
		const statusId = 'doc-status-' + Date.now();
		item.innerHTML = `${icon}<div class="file-preview-doc-info"><span class="pdf-name">${pendingDocName}</span><span class="pdf-status" id="${statusId}">${pendingDocText ? 'Ready' : 'Extracting...'}</span></div><button class="file-preview-remove" data-type="doc">×</button>`;
		filesPreview.appendChild(item);
	}

	// Attach remove handlers
	filesPreview.querySelectorAll('.file-preview-remove').forEach(btn => {
		btn.addEventListener('click', () => {
			if (btn.dataset.type === 'image') {
				pendingImages.splice(parseInt(btn.dataset.idx), 1);
			} else {
				pendingDocText = null;
				pendingDocName = null;
				pendingDocExtracting = false;
			}
			renderFilesPreview();
		});
	});
}

async function handleFiles(files) {
	for (const file of files) {
		if (isImageFile(file)) {
			await new Promise(resolve => {
				const reader = new FileReader();
				reader.onload = (ev) => {
					pendingImages.push({ dataUrl: ev.target.result, name: file.name });
					renderFilesPreview();
					resolve();
				};
				reader.readAsDataURL(file);
			});
		} else if (isPdfFile(file)) {
			pendingDocName = file.name;
			pendingDocText = null;
			pendingDocExtracting = true;
			renderFilesPreview();
			const reader = new FileReader();
			reader.onload = async (ev) => {
				try {
					const res = await fetch(SERVER_URL + '/api/upload/pdf', {
						method: 'POST',
						headers: authHeaders(),
						body: JSON.stringify({ pdf: ev.target.result }),
					});
					const data = await res.json();
					if (res.ok && data.text) {
						pendingDocText = data.text;
					} else {
						pendingDocText = null;
					}
				} catch (err) {
					pendingDocText = null;
				}
				pendingDocExtracting = false;
				renderFilesPreview();
			};
			reader.readAsDataURL(file);
		} else if (isPptFile(file)) {
			pendingDocName = file.name;
			pendingDocText = null;
			pendingDocExtracting = true;
			renderFilesPreview();
			const reader = new FileReader();
			reader.onload = async (ev) => {
				try {
					const res = await fetch(SERVER_URL + '/api/upload/pptx', {
						method: 'POST',
						headers: authHeaders(),
						body: JSON.stringify({ file: ev.target.result, filename: file.name }),
					});
					const data = await res.json();
					if (res.ok && data.text) {
						pendingDocText = data.text;
					} else {
						pendingDocText = null;
					}
				} catch (err) {
					pendingDocText = null;
				}
				pendingDocExtracting = false;
				renderFilesPreview();
			};
			reader.readAsDataURL(file);
		}
	}
}

fileInput?.addEventListener('change', (e) => {
	if (e.target.files.length > 0) {
		handleFiles(Array.from(e.target.files));
	}
	fileInput.value = '';
});

// ===== Drag & Drop =====
let dragCounter = 0;
const mainEl = document.querySelector('.main');

mainEl.addEventListener('dragenter', (e) => {
	e.preventDefault();
	dragCounter++;
	dropOverlay.classList.remove('hidden');
});

mainEl.addEventListener('dragleave', (e) => {
	e.preventDefault();
	dragCounter--;
	if (dragCounter <= 0) {
		dragCounter = 0;
		dropOverlay.classList.add('hidden');
	}
});

mainEl.addEventListener('dragover', (e) => {
	e.preventDefault();
});

mainEl.addEventListener('drop', (e) => {
	e.preventDefault();
	dragCounter = 0;
	dropOverlay.classList.add('hidden');
	if (e.dataTransfer.files.length > 0) {
		handleFiles(Array.from(e.dataTransfer.files));
	}
});

// ===== Voice Input =====
let recognition = null;
if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
	const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
	recognition = new SpeechRecognition();
	recognition.continuous = false;
	recognition.interimResults = false;
	recognition.lang = 'en-US';

	recognition.onresult = (event) => {
		const transcript = event.results[0][0].transcript;
		input.value += transcript;
		autoResizeTextarea();
	};

	recognition.onend = () => {
		micBtn.classList.remove('listening');
	};

	recognition.onerror = () => {
		micBtn.classList.remove('listening');
	};
}

micBtn.addEventListener('click', () => {
	if (!recognition) {
		alert('Voice input is not supported in your browser.');
		return;
	}

	if (micBtn.classList.contains('listening')) {
		recognition.stop();
		micBtn.classList.remove('listening');
	} else {
		recognition.start();
		micBtn.classList.add('listening');
	}
});

// ===== Search Chats =====
searchInput.addEventListener('input', () => {
	const query = searchInput.value.toLowerCase().trim();
	const items = sidebarHistory.querySelectorAll('.chat-history-item');
	items.forEach(item => {
		if (!query || item.textContent.toLowerCase().includes(query)) {
			item.style.display = '';
		} else {
			item.style.display = 'none';
		}
	});
});

// suggestion cards on welcome screen
function initSuggestions() {
	renderSuggestions();
}

// ===== Keyboard Shortcuts =====
document.addEventListener('keydown', (e) => {
	// Ctrl+Shift+N — New chat
	if (e.ctrlKey && e.shiftKey && e.key === 'N') {
		e.preventDefault();
		createNewChat();
	}
	// Ctrl+/ — Toggle sidebar
	if (e.ctrlKey && e.key === '/') {
		e.preventDefault();
		if (sidebar.classList.contains('open')) closeSidebar();
		else openSidebar();
	}
	// Escape — Close menus/modes
	if (e.key === 'Escape') {
		if (!featureMenu.classList.contains('hidden')) {
			featureMenu.classList.add('hidden');
		} else if (activeMode) {
			activeMode = null;
			activeModeEl.classList.add('hidden');
		} else if (pendingImages.length > 0 || pendingDocText) {
			pendingImages = [];
			pendingDocText = null;
			pendingDocName = null;
			renderFilesPreview();
		}
	}
});

// Scroll to bottom button
document.getElementById('scroll-bottom-btn')?.addEventListener('click', () => scrollToBottom(true));

// ===== Slash Commands =====
input.addEventListener('keydown', (e) => {
	if (e.key === 'Enter' && !e.shiftKey) {
		const val = input.value.trim();
		if (val === '/new' || val === '/n') {
			e.preventDefault();
			input.value = '';
			createNewChat();
			return;
		}
		if (val === '/search' || val === '/s') {
			e.preventDefault();
			input.value = '';
			searchInput.focus();
			openSidebar();
			return;
		}
		if (val === '/clear' || val === '/c') {
			e.preventDefault();
			input.value = '';
			if (currentChatId && chats[currentChatId]) {
				chats[currentChatId].messages = chats[currentChatId].messages.filter(m => m.role !== 'bot');
				chatEl.querySelectorAll('.msg.bot').forEach(el => el.remove());
			}
			return;
		}
		if (val === '/theme' || val === '/t') {
			e.preventDefault();
			input.value = '';
			toggleTheme();
			return;
		}
		if (val === '/help' || val === '/h') {
			e.preventDefault();
			input.value = '';
			showHelpMessage();
			return;
		}
	}
});

function showHelpMessage() {
	const helpText = `**Slash Commands:**
- \`/new\` or \`/n\` — Start a new chat
- \`/search\` or \`/s\` — Focus chat search
- \`/clear\` or \`/c\` — Clear bot messages
- \`/theme\` or \`/t\` — Toggle dark/light mode
- \`/help\` or \`/h\` — Show this help
- \`Ctrl+Shift+N\` — New chat
- \`Ctrl+/\` — Toggle sidebar
- \`Esc\` — Close menus`;

	if (!currentChatId || !chats[currentChatId]) {
		currentChatId = generateId();
		chats[currentChatId] = { title: 'Help', messages: [], memory: {} };
		chatOrder.unshift(currentChatId);
		createChatOnServer(currentChatId, 'Help');
		renderSidebarHistory();
	}
	addMessage('bot', helpText);
}

// ===== Settings Panel =====
const SETTINGS_DEFAULTS = {
	theme: 'dark',
	language: 'en',
	voiceLang: 'en-US',
	enterSend: true,
	personality: 'Friendly',
	emoji: 'default',
	responseLength: 'default',
	customInstructions: '',
	nickname: '',
	occupation: '',
	saveHistory: true,
	ttsEnabled: false,
	ttsVoice: '',
	ttsSpeed: 1,
	ttsPitch: 1,
};

let appSettings = { ...SETTINGS_DEFAULTS };

function loadSettings() {
	try {
		const raw = localStorage.getItem(SETTINGS_KEY);
		if (raw) {
			const parsed = JSON.parse(raw);
			appSettings = { ...SETTINGS_DEFAULTS, ...parsed };
		}
	} catch (e) {}
}

function saveSettings() {
	localStorage.setItem(SETTINGS_KEY, JSON.stringify(appSettings));
}

function applySettings() {
	// Theme
	if (appSettings.theme === 'system') {
		document.documentElement.removeAttribute('data-theme');
		localStorage.removeItem('chatbot_theme');
		updateThemeButton('dark');
	} else {
		document.documentElement.setAttribute('data-theme', appSettings.theme);
		localStorage.setItem('chatbot_theme', appSettings.theme);
		updateThemeButton(appSettings.theme);
	}

	// Personality sync
	if (personalityEl) {
		personalityEl.value = appSettings.personality;
	}

	// Voice language
	if (recognition) {
		recognition.lang = appSettings.voiceLang;
	}
}

function openSettings() {
	settingsOverlay.classList.remove('hidden');
	populateSettingsUI();
}

function closeSettings() {
	settingsOverlay.classList.add('hidden');
	saveSettings();
	applySettings();
}

function populateSettingsUI() {
	// General
	const themeSelect = document.getElementById('setting-theme');
	const langSelect = document.getElementById('setting-language');
	const voiceLangSelect = document.getElementById('setting-voice-lang');
	const enterSend = document.getElementById('setting-enter-send');

	if (themeSelect) themeSelect.value = appSettings.theme;
	if (langSelect) langSelect.value = appSettings.language;
	if (voiceLangSelect) voiceLangSelect.value = appSettings.voiceLang;
	if (enterSend) enterSend.checked = appSettings.enterSend;

	// Personalization
	const personalitySelect = document.getElementById('setting-personality');
	const emojiSelect = document.getElementById('setting-emoji');
	const respLength = document.getElementById('setting-response-length');
	const customInstr = document.getElementById('setting-custom-instructions');
	const nickname = document.getElementById('setting-nickname');
	const occupation = document.getElementById('setting-occupation');

	if (personalitySelect) personalitySelect.value = appSettings.personality;
	if (emojiSelect) emojiSelect.value = appSettings.emoji;
	if (respLength) respLength.value = appSettings.responseLength;
	if (customInstr) customInstr.value = appSettings.customInstructions;
	if (nickname) nickname.value = appSettings.nickname;
	if (occupation) occupation.value = appSettings.occupation;

	// Voice Assistant (TTS)
	const ttsEnabled = document.getElementById('setting-tts-enabled');
	const ttsVoiceSelect = document.getElementById('setting-tts-voice');
	const ttsSpeed = document.getElementById('setting-tts-speed');
	const ttsPitch = document.getElementById('setting-tts-pitch');

	if (ttsEnabled) ttsEnabled.checked = appSettings.ttsEnabled;
	if (ttsSpeed) ttsSpeed.value = String(appSettings.ttsSpeed);
	if (ttsPitch) ttsPitch.value = String(appSettings.ttsPitch);

	// Populate TTS voice list from browser
	if (ttsVoiceSelect) {
		const populateVoices = () => {
			const voices = speechSynthesis.getVoices();
			ttsVoiceSelect.innerHTML = '<option value="">Default</option>';
			voices.forEach(v => {
				const opt = document.createElement('option');
				opt.value = v.name;
				opt.textContent = v.name + ' (' + v.lang + ')';
				if (v.name === appSettings.ttsVoice) opt.selected = true;
				ttsVoiceSelect.appendChild(opt);
			});
		};
		populateVoices();
		if (speechSynthesis.getVoices().length === 0) {
			speechSynthesis.addEventListener('voiceschanged', populateVoices, { once: true });
		}
	}

	// Data controls
	const saveHistory = document.getElementById('setting-save-history');
	if (saveHistory) saveHistory.checked = appSettings.saveHistory;

	// Account
	if (currentUser) {
		const acctName = document.getElementById('setting-acct-name');
		const acctEmail = document.getElementById('setting-acct-email');
		const acctAvatar = document.getElementById('settings-acct-avatar');
		const displayName = currentUser.name || currentUser.email.split('@')[0];
		const initial = displayName.charAt(0).toUpperCase();
		if (acctName) acctName.textContent = displayName;
		if (acctEmail) acctEmail.textContent = currentUser.email;
		if (acctAvatar) acctAvatar.textContent = initial;
	}
}

function switchSettingsSection(section) {
	// Update nav
	settingsNav.querySelectorAll('.settings-nav-item').forEach(btn => {
		btn.classList.toggle('active', btn.dataset.section === section);
	});
	// Update title
	const titles = { general: 'General', personalization: 'Personalization', data: 'Data controls', security: 'Security', account: 'Account' };
	settingsTitle.textContent = titles[section] || section;
	// Show section
	document.querySelectorAll('.settings-section').forEach(s => s.classList.remove('active'));
	const target = document.getElementById('section-' + section);
	if (target) target.classList.add('active');
}

// Settings event listeners
settingsBtn.addEventListener('click', openSettings);
settingsClose.addEventListener('click', closeSettings);
settingsOverlay.addEventListener('click', (e) => {
	if (e.target === settingsOverlay) closeSettings();
});

settingsNav.querySelectorAll('.settings-nav-item').forEach(btn => {
	btn.addEventListener('click', () => switchSettingsSection(btn.dataset.section));
});

// Setting value change handlers
document.getElementById('setting-theme')?.addEventListener('change', (e) => {
	appSettings.theme = e.target.value;
	saveSettings();
	applySettings();
});
document.getElementById('setting-language')?.addEventListener('change', (e) => {
	appSettings.language = e.target.value;
	saveSettings();
});
document.getElementById('setting-voice-lang')?.addEventListener('change', (e) => {
	appSettings.voiceLang = e.target.value;
	saveSettings();
	applySettings();
});
document.getElementById('setting-enter-send')?.addEventListener('change', (e) => {
	appSettings.enterSend = e.target.checked;
	saveSettings();
});
document.getElementById('setting-personality')?.addEventListener('change', (e) => {
	appSettings.personality = e.target.value;
	if (personalityEl) personalityEl.value = e.target.value;
	saveSettings();
});
document.getElementById('setting-emoji')?.addEventListener('change', (e) => {
	appSettings.emoji = e.target.value;
	saveSettings();
});
document.getElementById('setting-response-length')?.addEventListener('change', (e) => {
	appSettings.responseLength = e.target.value;
	saveSettings();
});
document.getElementById('setting-custom-instructions')?.addEventListener('input', (e) => {
	appSettings.customInstructions = e.target.value;
	saveSettings();
});
document.getElementById('setting-nickname')?.addEventListener('input', (e) => {
	appSettings.nickname = e.target.value;
	saveSettings();
});
document.getElementById('setting-occupation')?.addEventListener('input', (e) => {
	appSettings.occupation = e.target.value;
	saveSettings();
});
document.getElementById('setting-save-history')?.addEventListener('change', (e) => {
	appSettings.saveHistory = e.target.checked;
	saveSettings();
});

// TTS settings handlers
document.getElementById('setting-tts-enabled')?.addEventListener('change', (e) => {
	appSettings.ttsEnabled = e.target.checked;
	saveSettings();
});
document.getElementById('setting-tts-voice')?.addEventListener('change', (e) => {
	appSettings.ttsVoice = e.target.value;
	saveSettings();
});
document.getElementById('setting-tts-speed')?.addEventListener('change', (e) => {
	appSettings.ttsSpeed = parseFloat(e.target.value);
	saveSettings();
});
document.getElementById('setting-tts-pitch')?.addEventListener('change', (e) => {
	appSettings.ttsPitch = parseFloat(e.target.value);
	saveSettings();
});

// ===== Text-to-Speech (Voice Assistant) =====
function speakText(text) {
	if (!appSettings.ttsEnabled || !('speechSynthesis' in window)) return;
	speechSynthesis.cancel();
	// Strip markdown for cleaner speech
	const clean = text
		.replace(/```[\s\S]*?```/g, ' code block ')
		.replace(/`([^`]+)`/g, '$1')
		.replace(/\*\*(.+?)\*\*/g, '$1')
		.replace(/\*(.+?)\*/g, '$1')
		.replace(/^#{1,4}\s+/gm, '')
		.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
		.replace(/[-*] /g, '')
		.replace(/\n+/g, '. ')
		.trim();
	if (!clean) return;
	const utter = new SpeechSynthesisUtterance(clean);
	utter.rate = appSettings.ttsSpeed;
	utter.pitch = appSettings.ttsPitch;
	utter.lang = appSettings.voiceLang;
	if (appSettings.ttsVoice) {
		const voices = speechSynthesis.getVoices();
		const match = voices.find(v => v.name === appSettings.ttsVoice);
		if (match) utter.voice = match;
	}
	speechSynthesis.speak(utter);
}

function stopSpeaking() {
	if ('speechSynthesis' in window) speechSynthesis.cancel();
}

// Data control actions
document.getElementById('setting-delete-all')?.addEventListener('click', () => {
	if (!confirm('Are you sure you want to delete all chats? This cannot be undone.')) return;
	for (const id of Object.keys(chats)) {
		deleteChatOnServer(id);
	}
	chats = {};
	chatOrder = [];
	saveChats();
	currentChatId = null;
	chatEl.innerHTML = '';
	welcomeEl.classList.remove('hidden');
	chatEl.classList.remove('active');
	renderSidebarHistory();
	closeSettings();
});

document.getElementById('setting-export')?.addEventListener('click', () => {
	const exportData = {
		exported_at: new Date().toISOString(),
		settings: appSettings,
		chats: chats,
		chatOrder: chatOrder,
	};
	const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
	const url = URL.createObjectURL(blob);
	const a = document.createElement('a');
	a.href = url;
	a.download = 'chatbot-export-' + new Date().toISOString().slice(0, 10) + '.json';
	a.click();
	URL.revokeObjectURL(url);

	setTimeout(() => {
		if (currentChatId && chats[currentChatId] && chats[currentChatId].messages.length > 0) {
			if (confirm('Also export current chat as Markdown?')) {
				exportChatAsMarkdown(currentChatId);
			}
		}
	}, 300);
});

function exportChatAsMarkdown(chatId) {
	const chat = chats[chatId];
	if (!chat || !chat.messages.length) return;
	const lines = [`# ${chat.title || 'Chat Export'}\n`, `*Exported on ${new Date().toLocaleString()}*\n\n`];
	chat.messages.forEach(m => {
		const role = m.role === 'user' ? '**You**' : '**Chatbot**';
		const time = new Date(m.ts || Date.now()).toLocaleString();
		lines.push(`### ${role}  \n*${time}*\n\n${m.text}\n\n---\n`);
	});
	const blob = new Blob([lines.join('')], { type: 'text/markdown' });
	const url = URL.createObjectURL(blob);
	const a = document.createElement('a');
	a.href = url;
	a.download = (chat.title || 'chat').replace(/[^a-z0-9]/gi, '_') + '-export.md';
	a.click();
	URL.revokeObjectURL(url);
}

document.getElementById('setting-archive-all')?.addEventListener('click', () => {
	alert('All chats have been archived.');
});

document.getElementById('setting-change-password')?.addEventListener('click', () => {
	alert('Password change is not yet implemented. Please contact support.');
});

document.getElementById('setting-logout')?.addEventListener('click', async () => {
	await fetch(SERVER_URL + '/api/auth/logout', { method: 'POST', headers: authHeaders() }).catch(() => {});
	clearAuthToken();
	currentUser = null;
	updateUserUI();
	chats = {};
	chatOrder = [];
	chatEl.innerHTML = '';
	closeSettings();
	showAuthScreen('login');
});

// Also sync personality dropdown changes to settings
personalityEl.addEventListener('change', () => {
	appSettings.personality = personalityEl.value;
	saveSettings();
});

// Keyboard shortcut to close settings
document.addEventListener('keydown', (e) => {
	if (e.key === 'Escape' && !settingsOverlay.classList.contains('hidden')) {
		closeSettings();
		e.stopPropagation();
	}
});

// ===== Init =====
loadSettings();
applySettings();
initSuggestions();

async function checkLLMStatus() {
	const statusEl = document.getElementById('llm-status');
	const statusText = document.getElementById('llm-status-text');
	if (!statusEl || !statusText) return;
	try {
		const res = await fetch(SERVER_URL + '/api/health');
		if (res.ok) {
			const data = await res.json();
			if (data.llmAvailable) {
				statusEl.className = 'llm-status online';
				statusText.textContent = 'AI Ready';
				statusEl.title = 'AI model is available and ready';
			} else {
				statusEl.className = 'llm-status offline';
				statusText.textContent = 'Template Mode';
				statusEl.title = 'No AI key set. Using template responses.';
			}
		}
	} catch (e) {
		statusEl.className = 'llm-status offline';
		statusText.textContent = 'Offline';
		statusEl.title = 'Cannot connect to server';
	}
}

async function initApp() {
	const authed = await checkAuth();
	if (!authed) return;
	await loadChats();
	await checkLLMStatus();
	const ids = chatOrder.length > 0 ? chatOrder : Object.keys(chats);
	if (ids.length > 0) {
		switchChat(ids[0]);
	} else {
		createNewChat();
	}

	// First-run onboarding
	if (!localStorage.getItem('onboarding_done') && chatOrder.length === 0) {
		setTimeout(showOnboarding, 500);
	}
}

// ===== ONBOARDING WIZARD =====
function showOnboarding() {
	let overlay = document.getElementById('onboarding-overlay');
	if (overlay) overlay.remove();

	overlay = document.createElement('div');
	overlay.id = 'onboarding-overlay';
	overlay.className = 'onboarding-overlay';

	let step = 0;
	const steps = [
		{
			icon: '👋',
			title: 'Welcome to NexusAI!',
			desc: 'Your intelligent AI companion with customizable personalities, voice conversation, image generation, and a powerful plugin system.',
			action: null,
		},
		{
			icon: '🤖',
			title: 'Connect an AI Model',
			desc: 'For the best experience, add your free Gemini API key. The chatbot works without it too using template responses.',
			action: 'api-key',
		},
		{
			icon: '⚡',
			title: 'Try the Modes',
			desc: 'Click the + button to access Web Search, Thinking, Deep Research, Study, Quiz, Voice, and Image Generation modes.',
			action: null,
		},
		{
			icon: '🎨',
			title: "You're all set!",
			desc: 'Pick a personality, start a voice conversation, generate images, and enjoy the full power of NexusAI.',
			action: null,
		},
	];

	function renderStep() {
		const s = steps[step];
		overlay.innerHTML = `
			<div class="onboarding-card">
				<div class="onboarding-step-num">${step + 1} / ${steps.length}</div>
				<div class="onboarding-icon">${s.icon}</div>
				<h2>${s.title}</h2>
				<p>${s.desc}</p>
				${s.action === 'api-key' ? `
					<div class="onboarding-api-section">
						<input type="text" id="onboard-api-key" placeholder="GEMINI_API_KEY (optional)" class="onboarding-input" />
						<a href="https://aistudio.google.com/apikey" target="_blank" class="onboarding-link">Get free key →</a>
					</div>
				` : ''}
				<div class="onboarding-actions">
					${step > 0 ? '<button id="onboard-back" class="onboard-btn-secondary">Back</button>' : '<div></div>'}
					<button id="onboard-next" class="onboard-btn-primary">${step === steps.length - 1 ? 'Get Started' : 'Next'}</button>
				</div>
			</div>`;

		document.getElementById('onboard-next').addEventListener('click', () => {
			if (step === 1) {
				const apiKey = document.getElementById('onboard-api-key')?.value.trim();
				if (apiKey) {
					localStorage.setItem('onboard_api_key', apiKey);
				}
			}
			step++;
			if (step >= steps.length) {
				localStorage.setItem('onboarding_done', '1');
				overlay.remove();
			} else {
				renderStep();
			}
		});

		document.getElementById('onboard-back')?.addEventListener('click', () => {
			step--;
			renderStep();
		});
	}

	renderStep();
	document.body.appendChild(overlay);
}

// ===== SEMANTIC CHAT SEARCH =====
let chatSearchResults = [];
let chatSearchMode = false;

searchInput.addEventListener('input', async () => {
	const query = searchInput.value.trim();

	if (!query) {
		chatSearchResults = [];
		chatSearchMode = false;
		renderSidebarHistory();
		return;
	}

	// If keyword match first, do instant filter
	const items = sidebarHistory.querySelectorAll('.chat-history-item');
	let hasExact = false;
	items.forEach(item => {
		const match = item.textContent.toLowerCase().includes(query.toLowerCase());
		item.style.display = match ? '' : 'none';
		if (match) hasExact = true;
	});

	// If no exact match, do semantic search
	if (!hasExact && query.length >= 2) {
		chatSearchMode = true;
		try {
			const res = await fetch(SERVER_URL + '/api/chats/search', {
				method: 'POST',
				headers: authHeaders(),
				body: JSON.stringify({ query, topK: 10 }),
			});
			if (res.ok) {
				const data = await res.json();
				chatSearchResults = data.results || [];
				renderSemanticSearchResults(query);
			}
		} catch (e) {}
	}
});

searchInput.addEventListener('focus', () => {
	if (chatSearchMode) {
		renderSemanticSearchResults(searchInput.value);
	}
});

function renderSemanticSearchResults(query) {
	sidebarHistory.innerHTML = '';
	const label = document.createElement('div');
	label.className = 'sidebar-section-label';
	label.textContent = 'Semantic matches for "' + query + '"';
	sidebarHistory.appendChild(label);

	if (chatSearchResults.length === 0) {
		const empty = document.createElement('div');
		empty.className = 'chat-history-item';
		empty.textContent = 'No similar conversations found';
		empty.style.color = 'var(--text-muted)';
		empty.style.cursor = 'default';
		sidebarHistory.appendChild(empty);
		return;
	}

	chatSearchResults.forEach(result => {
		const btn = document.createElement('div');
		btn.className = 'chat-history-item semantic-result';
		btn.innerHTML = `<span class="chat-title">${result.title}</span><span class="semantic-score">${Math.round(result.score * 100)}%</span>`;
		btn.querySelector('.chat-title').onclick = () => switchChat(result.chatId);
		sidebarHistory.appendChild(btn);
	});

	// Back to normal
	const backBtn = document.createElement('button');
	backBtn.className = 'sidebar-btn';
	backBtn.style.marginTop = '8px';
	backBtn.textContent = '← Back to all chats';
	backBtn.onclick = () => {
		searchInput.value = '';
		chatSearchResults = [];
		chatSearchMode = false;
		renderSidebarHistory();
	};
	sidebarHistory.appendChild(backBtn);
}

// ===== CONVERSATION BRANCHING =====
function branchChat(id) {
	const sourceChat = chats[id];
	if (!sourceChat) return;
	const newId = generateId();
	const branchTitle = (sourceChat.title || 'Chat') + ' (branch)';
	chats[newId] = {
		title: branchTitle,
		messages: JSON.parse(JSON.stringify(sourceChat.messages)),
		memory: {},
	};
	chatOrder.unshift(newId);
	createChatOnServer(newId, branchTitle);

	// Copy messages to server
	chats[newId].messages.forEach(m => {
		saveMessageToServer(newId, m.role, m.text, m.image, m.ts);
	});

	renderSidebarHistory();
	switchChat(newId);
}

// ===== MEMORY SNAPSHOT =====
async function saveMemorySnapshot(chatId) {
	if (!chatId) return;
	try {
		const res = await fetch(SERVER_URL + '/api/memory/snapshot', {
			method: 'POST',
			headers: authHeaders(),
			body: JSON.stringify({ chatId }),
		});
		if (res.ok) {
			const data = await res.json();
			showToast('Memory saved: ' + data.summary.slice(0, 80) + '...');
		}
	} catch (e) {}
}

// ===== CODE EXECUTION UI =====
function setupCodeExecution() {
	document.querySelectorAll('.msg-text pre code').forEach(block => {
		const pre = block.parentElement;
		if (pre.dataset.codeSetup) return;
		pre.dataset.codeSetup = '1';

		const runBtn = document.createElement('button');
		runBtn.className = 'code-run-btn';
		runBtn.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg> Run';
		runBtn.title = 'Run this code';
		pre.style.position = 'relative';
		pre.appendChild(runBtn);

		runBtn.addEventListener('click', async () => {
			const code = block.textContent;
			runBtn.disabled = true;
			runBtn.textContent = 'Running...';

			// Check if we should create a visual output container
			let outputEl = pre.nextElementSibling;
			if (!outputEl || !outputEl.classList.contains('code-output')) {
				outputEl = document.createElement('div');
				outputEl.className = 'code-output';
				pre.parentElement.insertBefore(outputEl, pre.nextSibling);
			}
			outputEl.innerHTML = '<span class="code-output-running">Running...</span>';

			try {
				const res = await fetch(SERVER_URL + '/api/code/execute', {
					method: 'POST',
					headers: authHeaders(),
					body: JSON.stringify({ code, language: 'javascript' }),
				});
				const data = await res.json();
				if (data.success) {
					outputEl.innerHTML = `<pre class="code-output-result">${data.output || '(no output)'}</pre>`;
				} else {
					outputEl.innerHTML = `<pre class="code-output-error">${data.error || 'Execution failed'}</pre>`;
				}
			} catch (e) {
				outputEl.innerHTML = `<pre class="code-output-error">Error: ${e.message}</pre>`;
			}

			runBtn.disabled = false;
			runBtn.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg> Run';
		});
	});
}

// ===== TOAST NOTIFICATIONS =====
function showToast(message, duration = 4000) {
	let toast = document.getElementById('toast-container');
	if (!toast) {
		toast = document.createElement('div');
		toast.id = 'toast-container';
		toast.style.cssText = 'position:fixed;bottom:90px;left:50%;transform:translateX(-50%);z-index:99999;display:flex;flex-direction:column;gap:8px;align-items:center;pointer-events:none;';
		document.body.appendChild(toast);
	}
	const el = document.createElement('div');
	el.style.cssText = 'background:var(--bg-secondary);border:1px solid var(--border);border-radius:10px;padding:10px 16px;font-size:13px;color:var(--text-primary);box-shadow:0 4px 20px rgba(0,0,0,0.25);pointer-events:auto;animation:toastIn 0.2s ease;max-width:360px;text-align:center;';
	el.textContent = message;
	toast.appendChild(el);
	setTimeout(() => {
		el.style.opacity = '0';
		el.style.transition = 'opacity 0.3s';
		setTimeout(() => el.remove(), 300);
	}, duration);
}

// ===== BRANCH BUTTON IN CHAT CONTEXT MENU =====
function showChatContextMenu(id, x, y) {
	const existing = document.getElementById('chat-context-menu');
	if (existing) existing.remove();

	const menu = document.createElement('div');
	menu.id = 'chat-context-menu';
	menu.style.cssText = `position:fixed;left:${x}px;top:${y}px;background:var(--bg-secondary);border:1px solid var(--border);border-radius:10px;padding:6px;z-index:9999;min-width:160px;box-shadow:0 4px 20px rgba(0,0,0,0.2);`;
	menu.innerHTML = `
		<button class="ctx-btn" data-action="rename">Rename</button>
		<button class="ctx-btn" data-action="branch">Fork this chat</button>
		<button class="ctx-btn" data-action="snapshot">Save memory</button>
		<button class="ctx-btn danger" data-action="delete">Delete</button>`;

	document.body.appendChild(menu);

	menu.querySelectorAll('.ctx-btn').forEach(btn => {
		btn.style.cssText = 'display:block;width:100%;padding:8px 12px;background:none;border:none;border-radius:6px;color:var(--text-primary);font-size:13px;cursor:pointer;text-align:left;';
		btn.addEventListener('mouseover', () => { btn.style.background = 'rgba(255,255,255,0.06)'; });
		btn.addEventListener('mouseout', () => { btn.style.background = 'none'; });
		btn.addEventListener('click', () => {
			const action = btn.dataset.action;
			menu.remove();
			if (action === 'rename') {
				const item = sidebarHistory.querySelector(`.chat-history-item[data-id="${id}"]`);
				if (item) startRenameChat(id, item, item.querySelector('.chat-title'));
			} else if (action === 'branch') {
				branchChat(id);
				showToast('Chat forked successfully');
			} else if (action === 'snapshot') {
				saveMemorySnapshot(id);
			} else if (action === 'delete') {
				if (confirm('Delete this chat?')) deleteChat(id);
			}
		});
	});

	setTimeout(() => {
		document.addEventListener('click', () => menu.remove(), { once: true });
	}, 0);
}

// ===== IMAGE GENERATION DIALOG =====
function showImageGenDialog() {
	let overlay = document.getElementById('imagegen-overlay');
	if (overlay) overlay.remove();

	overlay = document.createElement('div');
	overlay.id = 'imagegen-overlay';
	overlay.className = 'onboarding-overlay';

	overlay.innerHTML = `
		<div class="onboarding-card" style="max-width:480px">
			<div class="onboarding-step-num">Image Generation</div>
			<h2>Generate an Image</h2>
			<p style="color:var(--text-secondary);font-size:14px;margin-bottom:20px">Describe the image you want to create. Powered by DALL-E or Leonardo.ai.</p>
			<div class="onboarding-api-section">
				<input type="text" id="img-gen-prompt" placeholder="A futuristic city at sunset with flying cars" class="onboarding-input" style="width:100%" />
				<div style="display:flex;gap:8px;margin-top:8px">
					<select id="img-gen-style" class="settings-select" style="flex:1">
						<option value="vivid">Vivid / Artistic</option>
						<option value="natural">Natural / Photorealistic</option>
					</select>
				</div>
			</div>
			<div id="img-gen-preview" class="img-gen-preview-area" style="display:none;margin-bottom:16px">
				<img id="img-gen-result" src="" alt="Generated image" style="max-width:100%;border-radius:10px;border:1px solid var(--border)" />
			</div>
			<div id="img-gen-status" style="text-align:center;font-size:13px;color:var(--text-muted);margin-bottom:16px;display:none"></div>
			<div class="onboarding-actions">
				<div></div>
				<button id="img-gen-submit" class="onboard-btn-primary">Generate</button>
			</div>
		</div>`;

	document.body.appendChild(overlay);

	document.getElementById('img-gen-submit').addEventListener('click', async () => {
		const prompt = document.getElementById('img-gen-prompt')?.value.trim();
		const style = document.getElementById('img-gen-style')?.value || 'vivid';
		const status = document.getElementById('img-gen-status');
		const preview = document.getElementById('img-gen-preview');
		const btn = document.getElementById('img-gen-submit');

		if (!prompt) {
			showToast('Please enter a description');
			return;
		}

		btn.disabled = true;
		btn.textContent = 'Generating...';
		status.style.display = 'block';
		status.textContent = 'Generating image, please wait...';
		preview.style.display = 'none';

		try {
			const res = await fetch(SERVER_URL + '/api/image/generate', {
				method: 'POST',
				headers: authHeaders(),
				body: JSON.stringify({ prompt, style }),
			});
			const data = await res.json();
			if (data.success && data.image) {
				document.getElementById('img-gen-result').src = data.image;
				preview.style.display = 'block';
				status.textContent = 'Image generated successfully!';
				status.style.color = '#19c37d';
			} else {
				status.textContent = data.error || 'Image generation failed.';
				status.style.color = '#ef4444';
			}
		} catch (e) {
			status.textContent = 'Error: ' + e.message;
			status.style.color = '#ef4444';
		}

		btn.disabled = false;
		btn.textContent = 'Generate';
	});

	document.getElementById('img-gen-prompt')?.focus();
	overlay.addEventListener('click', (e) => {
		if (e.target === overlay) overlay.remove();
	});
}

// ===== VOICE CONVERSATION MODE =====
let voicePanelOpen = false;
let voiceRecognition = null;
let voiceSynth = window.speechSynthesis;
let voiceModeActive = false;
let voiceConversations = [];
let voiceAnalyzer = null;
let voiceAnalyserNode = null;
let voiceCanvas = null;
let voiceAnimationId = null;

function openVoicePanel() {
	const panel = document.getElementById('voice-panel');
	if (!panel) return;
	panel.classList.remove('hidden');
	voicePanelOpen = true;
	voiceModeActive = true;
	voiceFab.classList.remove('visible');
	document.getElementById('voice-mic')?.classList.add('listening');
	setVoiceStatus('listening', 'Tap to speak');
	setVoiceTranscript('');

	// Setup waveform
	voiceCanvas = document.getElementById('waveform-canvas');
	if (voiceCanvas) {
		const ctx = voiceCanvas.getContext('2d');
		drawIdleWaveform(ctx);
	}
}

function closeVoicePanel() {
	const panel = document.getElementById('voice-panel');
	if (panel) panel.classList.add('hidden');
	voicePanelOpen = false;
	voiceModeActive = false;
	if (voiceRecognition && voiceRecognition.listening) {
		voiceRecognition.stop();
	}
	if (voiceSynth.speaking) voiceSynth.cancel();
	cancelAnimationFrame(voiceAnimationId);
	if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
		voiceFab.classList.add('visible');
	}
}

function setVoiceStatus(state, text) {
	const status = document.getElementById('voice-status');
	if (!status) return;
	status.className = 'voice-status ' + state;
	const textEl = status.querySelector('.voice-status-text');
	if (textEl) textEl.textContent = text;
}

function setVoiceTranscript(html) {
	const el = document.getElementById('voice-transcript');
	if (!el) return;
	el.innerHTML = html || '<p class="voice-placeholder">Tap the microphone and start speaking...</p>';
}

function appendVoiceTranscript(role, text) {
	const el = document.getElementById('voice-transcript');
	if (!el) return;
	const placeholder = el.querySelector('.voice-placeholder');
	if (placeholder) placeholder.remove();
	const p = document.createElement('p');
	p.className = role === 'user' ? 'voice-user' : 'voice-bot';
	p.textContent = (role === 'user' ? 'You: ' : 'Bot: ') + text;
	el.appendChild(p);
	el.scrollTop = el.scrollHeight;
}

function drawIdleWaveform(ctx) {
	const w = ctx.canvas.width;
	const h = ctx.canvas.height;
	ctx.clearRect(0, 0, w, h);
	ctx.strokeStyle = 'rgba(142,142,160,0.3)';
	ctx.lineWidth = 2;
	ctx.beginPath();
	const cx = w / 2;
	for (let x = 0; x <= w; x++) {
		const y = h / 2 + Math.sin(x * 0.05) * 3;
		x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
	}
	ctx.stroke();
}

function drawActiveWaveform(ctx, dataArray) {
	const w = ctx.canvas.width;
	const h = ctx.canvas.height;
	ctx.clearRect(0, 0, w, h);
	ctx.fillStyle = 'rgba(91,141,239,0.1)';
	ctx.fillRect(0, 0, w, h);
	ctx.strokeStyle = '#5b8def';
	ctx.lineWidth = 2;
	ctx.beginPath();
	const sliceWidth = w / dataArray.length;
	let x = 0;
	for (let i = 0; i < dataArray.length; i++) {
		const v = dataArray[i] / 128.0;
		const y = (v * h) / 2;
		i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
		x += sliceWidth;
	}
	ctx.stroke();
}

async function startVoiceConversation() {
	if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
		showToast('Voice input not supported in this browser');
		return;
	}

	const micBtn = document.getElementById('voice-mic');
	micBtn.classList.remove('listening');
	micBtn.classList.add('speaking');

	setVoiceStatus('speaking', 'Listening...');
	appendVoiceTranscript('user', '...');

	if (!voiceRecognition) {
		const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
		voiceRecognition = new SR();
		voiceRecognition.continuous = false;
		voiceRecognition.interimResults = true;
		voiceRecognition.lang = appSettings.voiceLang || 'en-US';
	}

	voiceRecognition.onresult = async (event) => {
		let transcript = '';
		for (let i = event.resultIndex; i < event.results.length; i++) {
			transcript += event.results[i][0].transcript;
		}

		// Update last user transcript
		const msgs = document.querySelectorAll('#voice-transcript p.voice-user');
		if (msgs.length > 0) {
			msgs[msgs.length - 1].textContent = 'You: ' + transcript;
		} else {
			appendVoiceTranscript('user', transcript);
		}

		if (event.results[0].isFinal) {
			const finalText = transcript.trim();
			if (!finalText) return;

			// Check for exit keywords
			if (/^(bye|goodbye|exit|quit|stop|that's all|done|thanks|thank you)/i.test(finalText)) {
				setVoiceStatus('listening', 'Goodbye!');
				setTimeout(() => {
					closeVoicePanel();
					showToast('Voice conversation ended');
				}, 1000);
				return;
			}

			setVoiceStatus('thinking', 'Thinking...');
			voiceCanvas = document.getElementById('waveform-canvas');

			try {
				const result = await voiceChat(finalText);
				if (result) {
					appendVoiceTranscript('bot', result);
					await speakText(result);
				}
			} catch (e) {
				appendVoiceTranscript('bot', 'Sorry, I had trouble processing that.');
			}

			setVoiceStatus('listening', 'Tap to speak');
			micBtn.classList.remove('speaking');
			micBtn.classList.add('listening');
		}
	};

	voiceRecognition.onerror = (event) => {
		if (event.error === 'no-speech') {
			setVoiceStatus('listening', 'No speech detected. Try again.');
			micBtn.classList.remove('speaking');
			micBtn.classList.add('listening');
			return;
		}
		setVoiceStatus('listening', 'Error: ' + event.error);
		micBtn.classList.remove('speaking');
		micBtn.classList.add('listening');
	};

	voiceRecognition.onend = () => {
		if (voiceModeActive && voicePanelOpen) {
			setTimeout(() => startVoiceConversation(), 500);
		}
	};

	voiceRecognition.start();
}

async function voiceChat(text) {
	try {
		const controller = new AbortController();
		const timeoutId = setTimeout(() => controller.abort(), 90000);

		const personality = personalityEl?.value || 'Friendly';
		const res = await fetch(SERVER_URL + '/api/chat/stream', {
			method: 'POST',
			headers: authHeaders(),
			body: JSON.stringify({
				message: text,
				personality,
				history: voiceConversations.slice(-6),
				mode: 'default',
			}),
			signal: controller.signal,
		});
		clearTimeout(timeoutId);

		if (!res.ok) return null;

		let fullText = '';
		const reader = res.body.getReader();
		const decoder = new TextDecoder();
		let buffer = '';

		while (true) {
			const { done, value } = await reader.read();
			if (done) break;
			buffer += decoder.decode(value, { stream: true });
			const lines = buffer.split('\n');
			buffer = lines.pop() || '';
			for (const line of lines) {
				if (!line.startsWith('data: ')) continue;
				const payload = line.slice(6).trim();
				if (payload === '[DONE]') continue;
				try {
					const data = JSON.parse(payload);
					if (data.chunk) fullText += data.chunk;
				} catch (e) {}
			}
		}

		voiceConversations.push({ role: 'user', text });
		voiceConversations.push({ role: 'bot', text: fullText });

		return fullText;
	} catch (e) {
		return null;
	}
}

async function speakText(text) {
	if (!('speechSynthesis' in window)) return;

	voiceSynth.cancel();

	const clean = text
		.replace(/```[\s\S]*?```/g, ' code block omitted ')
		.replace(/`([^`]+)`/g, '$1')
		.replace(/\*\*\*(.+?)\*\*\*/g, '$1')
		.replace(/\*\*(.+?)\*\*/g, '$1')
		.replace(/\*(.+?)\*/g, '$1')
		.replace(/^#{1,4}\s+/gm, '')
		.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
		.replace(/[-*]\s/g, '')
		.replace(/\n+/g, '. ')
		.trim();

	if (!clean) return;

	const utter = new SpeechSynthesisUtterance(clean);
	utter.rate = appSettings.ttsSpeed || 1;
	utter.pitch = appSettings.ttsPitch || 1;
	utter.lang = appSettings.voiceLang || 'en-US';

	if (appSettings.ttsVoice) {
		const voices = speechSynthesis.getVoices();
		const match = voices.find(v => v.name === appSettings.ttsVoice);
		if (match) utter.voice = match;
	}

	return new Promise((resolve) => {
		utter.onend = resolve;
		utter.onerror = resolve;
		voiceSynth.speak(utter);
	});
}

// Voice panel event listeners
document.getElementById('voice-close')?.addEventListener('click', closeVoicePanel);
document.getElementById('voice-mic')?.addEventListener('click', () => {
	if (voiceRecognition && voiceRecognition.listening) {
		voiceRecognition.stop();
		document.getElementById('voice-mic')?.classList.remove('listening');
		return;
	}
	startVoiceConversation();
});

// Floating voice FAB button
const voiceFab = document.createElement('button');
voiceFab.id = 'voice-fab';
voiceFab.className = 'voice-fab';
voiceFab.setAttribute('aria-label', 'Voice conversation');
voiceFab.innerHTML = '<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M12 1a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 11v1a7 7 0 0 1-14 0v-1M12 19v4M8 23h8" stroke="currentColor" stroke-width="2" fill="none"/></svg>';
document.body.appendChild(voiceFab);

if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
	voiceFab.classList.add('visible');
}

voiceFab.addEventListener('click', () => {
	if (voicePanelOpen) {
		closeVoicePanel();
	} else {
		openVoicePanel();
	}
});

// Register service worker for PWA
if ('serviceWorker' in navigator) {
	window.addEventListener('load', () => {
		navigator.serviceWorker.register('/sw.js').catch(() => {});
	});
}

// Initialize the app
initApp();

initApp();
