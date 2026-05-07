import { THEMES, buildQuestionsPrompt, normalizeQuestionList, emptyProtocolState, buildAnalysisPrompt } from './protocol.js';
import { createTecaAssistant } from './teca.js';
import { queueForSupabase, saveLocalAnswer } from './supabase.js';

function getSessionStorageValue(key) {
  try {
    return typeof sessionStorage !== 'undefined' ? sessionStorage.getItem(key) || '' : '';
  } catch (_) {
    return '';
  }
}

const state = {
  user: getSessionStorageValue('paia-user'),
  protocol: emptyProtocolState(),
  loading: false,
};

const dom = {};
let teca = null;
const THEME_STORAGE_KEY = 'paia_theme';

function qs(selector) {
  return document.querySelector(selector);
}

function cacheDom() {
  dom.home = qs('#home-screen');
  dom.lab = qs('#lab-screen');
  dom.btnIsis = qs('#btn-isis');
  dom.btnMaya = qs('#btn-maya');
  dom.userLabel = qs('#user-label');
  dom.themeLabel = qs('#theme-label');
  dom.progressLabel = qs('#progress-label');
  dom.themeList = qs('#theme-list');
  dom.questionText = qs('#question-text');
  dom.answerBox = qs('#answer-box');
  dom.nextBtn = qs('#next-btn');
  dom.restartBtn = qs('#restart-btn');
  dom.completeState = qs('#complete-state');
  dom.questionState = qs('#question-state');
  dom.explainBtn = qs('#explain-btn');
  dom.themeToggle = qs('#theme-toggle-btn');
  dom.backHome = qs('#back-home-btn');
  dom.sideContent = qs('#side-conteudo');
}

function isAdminMode() {
  return new URLSearchParams(window.location.search).get('mode') === 'admin';
}

function getPreferredModels() {
  return [];
}

function setScreen(name) {
  if (dom.home) {
    dom.home.classList.toggle('is-active', name === 'home');
  }
  if (dom.lab) {
    dom.lab.classList.toggle('is-active', name === 'lab');
  }
  if (dom.backHome) {
    dom.backHome.classList.toggle('hidden', name !== 'lab');
  }
  document.body.classList.toggle('sidebar-visible', name === 'lab');
  document.body.dataset.screen = name;
}

function getSavedTheme() {
  try {
    return localStorage.getItem(THEME_STORAGE_KEY) || 'light';
  } catch (_) {
    return 'light';
  }
}

function applyTheme(theme) {
  const next = theme === 'dark' ? 'dark' : 'light';
  document.body.classList.toggle('dark-mode', next === 'dark');
  try {
    localStorage.setItem(THEME_STORAGE_KEY, next);
  } catch (_) {}
  if (dom.themeToggle) {
    dom.themeToggle.textContent = next === 'dark' ? 'Tema claro' : 'Tema escuro';
  }
  return next;
}

function toggleTheme() {
  return applyTheme(getSavedTheme() === 'dark' ? 'light' : 'dark');
}

function voltarInicio() {
  sessionStorage.removeItem('nomeTeca');
  sessionStorage.removeItem('paia-user');
  document.body.classList.remove('sidebar-visible');
  state.user = '';
  state.protocol = emptyProtocolState();
  if (dom.answerBox) dom.answerBox.value = '';
  if (dom.themeLabel) dom.themeLabel.textContent = 'Escolha um tema para iniciar o protocolo.';
  if (dom.progressLabel) dom.progressLabel.textContent = '0/4 perguntas';
  if (dom.questionText) dom.questionText.textContent = 'Selecione um tema para a Professora Teca gerar as perguntas.';
  if (dom.completeState) dom.completeState.classList.add('hidden');
  if (dom.questionState) dom.questionState.classList.remove('hidden');
  if (dom.sideContent) dom.sideContent.textContent = 'Selecione uma palavra ou frase e eu explico.';
  setScreen('home');
}

function renderThemeButtons() {
  if (!dom.themeList) {
    return;
  }

  dom.themeList.innerHTML = '';
  THEMES.forEach((theme) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'theme-btn';
    button.textContent = theme;
    button.addEventListener('click', () => selectTheme(theme));
    dom.themeList.appendChild(button);
  });
}

function setThemeActive(theme) {
  [...dom.themeList.querySelectorAll('.theme-btn')].forEach((button) => {
    button.classList.toggle('is-active', button.textContent === theme);
  });
}

function renderCurrentQuestion() {
  if (!state.protocol.questions.length) {
    dom.questionText.textContent = 'Selecione um tema para a Professora Teca gerar as perguntas.';
    dom.progressLabel.textContent = '0/4 perguntas';
    dom.answerBox.value = '';
    dom.completeState.classList.add('hidden');
    dom.questionState.classList.remove('hidden');
    return;
  }

  const current = state.protocol.questions[state.protocol.index];
  dom.questionText.textContent = current;
  dom.progressLabel.textContent = `${Math.min(state.protocol.index + 1, state.protocol.questions.length)}/${state.protocol.questions.length} perguntas`;
  dom.answerBox.value = state.protocol.answers[state.protocol.index]?.answer || '';
  dom.completeState.classList.add('hidden');
  dom.questionState.classList.remove('hidden');
  dom.answerBox.focus();
}

function renderCompletion() {
  const analysisPrompt = buildAnalysisPrompt(state.protocol.theme, state.protocol.answers);
  dom.questionState.classList.add('hidden');
  dom.completeState.classList.remove('hidden');
  dom.completeState.textContent = 'Protocolo concluído. Suas respostas foram salvas localmente e preparadas para sincronização.';

  queueForSupabase({
    user: state.user,
    theme: state.protocol.theme,
    answers: [...state.protocol.answers],
    mode: 'local-queue',
    analysisPrompt,
  });
}

function resetProtocol(theme) {
  state.protocol = {
    theme,
    questions: [],
    index: 0,
    answers: [],
  };
  dom.themeLabel.textContent = `Tema atual: ${theme}`;
  dom.progressLabel.textContent = 'Gerando perguntas...';
  dom.questionText.textContent = 'Aguarde um instante enquanto a Teca monta as perguntas.';
  dom.answerBox.value = '';
}

async function selectTheme(theme) {
  if (!state.user || state.loading) {
    return;
  }

  state.loading = true;
  resetProtocol(theme);
  setThemeActive(theme);
  teca.setSidebarMessage('Consultando...');

  try {
    const response = await fetch('/api/ai', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt: buildQuestionsPrompt(theme),
        nome: state.user,
        preferredModels: getPreferredModels(),
      }),
    });

    const data = await response.json();
    const parsed = normalizeQuestionList(data?.result);
    state.protocol.questions = parsed.length ? parsed : [
      `O que você percebe primeiro em ${theme.toLowerCase()}?`,
      `Que dúvida valeria investigar melhor em ${theme.toLowerCase()}?`,
      `Qual exemplo simples ajuda a entender esse tema?`,
      `O que você concluiria depois de observar esse assunto?`,
    ];
    state.protocol.index = 0;
    state.protocol.answers = [];
    dom.progressLabel.textContent = `${state.protocol.index + 1}/${state.protocol.questions.length} perguntas`;
    renderCurrentQuestion();
  } catch (error) {
    dom.questionText.textContent = 'Não foi possível gerar as perguntas agora. Tente novamente.';
    dom.progressLabel.textContent = '0/4 perguntas';
  } finally {
    state.loading = false;
  }
}

function saveCurrentAnswer() {
  const current = state.protocol.questions[state.protocol.index];
  const answer = dom.answerBox.value.trim();
  const record = {
    user: state.user,
    theme: state.protocol.theme,
    question: current,
    answer,
    index: state.protocol.index,
  };

  state.protocol.answers[state.protocol.index] = record;
  saveLocalAnswer(record);
}

function nextQuestion() {
  if (!state.protocol.questions.length) {
    return;
  }

  saveCurrentAnswer();

  if (state.protocol.index < state.protocol.questions.length - 1) {
    state.protocol.index += 1;
    renderCurrentQuestion();
    return;
  }

  renderCompletion();
}

function chooseUser(user) {
  state.user = user;
  sessionStorage.setItem('paia-user', user);
  sessionStorage.setItem('nomeTeca', user);
  dom.userLabel.textContent = `Bem-vinda, ${user}`;
  setScreen('lab');
  teca.showSidebarIntro();
}

function initHomeButtons() {
  if (dom.btnIsis && !dom.btnIsis.dataset.bound) {
    dom.btnIsis.addEventListener('click', () => chooseUser('Isis'));
    dom.btnIsis.dataset.bound = '1';
  }
  if (dom.btnMaya && !dom.btnMaya.dataset.bound) {
    dom.btnMaya.addEventListener('click', () => chooseUser('Maya'));
    dom.btnMaya.dataset.bound = '1';
  }
}

function initSelectionListeners() {
  teca.initSelectionListeners();
}

function attachEvents() {
  dom.nextBtn.addEventListener('click', nextQuestion);
  dom.restartBtn.addEventListener('click', () => {
    state.protocol = emptyProtocolState();
    dom.themeLabel.textContent = 'Escolha um tema para iniciar o protocolo.';
    dom.progressLabel.textContent = '0/4 perguntas';
    dom.questionText.textContent = 'Selecione um tema para a Professora Teca gerar as perguntas.';
    dom.answerBox.value = '';
    dom.completeState.classList.add('hidden');
    dom.questionState.classList.remove('hidden');
  });
  dom.explainBtn?.addEventListener('click', () => teca.explainSelectionManually());
  dom.themeToggle?.addEventListener('click', toggleTheme);
  dom.backHome?.addEventListener('click', voltarInicio);
}

function exposeGlobals() {
  window.falarComIA = teca.falarComIA;
  window.analisarSelecao = teca.analisarSelecao;
  window.explicarTextoTeca = teca.explicarTextoTeca;
  window.initHomeButtons = initHomeButtons;
  window.initSelectionListeners = initSelectionListeners;
  window.applyTheme = applyTheme;
  window.getSavedTheme = getSavedTheme;
  window.toggleTheme = toggleTheme;
  window.voltarInicio = voltarInicio;
}

function boot() {
  if (isAdminMode()) {
    window.location.replace('/admin.html?mode=admin');
    return;
  }
  cacheDom();
  teca = createTecaAssistant({
    getUserName: () => state.user || sessionStorage.getItem('nomeTeca') || '',
    isAdminMode,
    getPreferredModels,
  });
  exposeGlobals();
  renderThemeButtons();
  attachEvents();
  initHomeButtons();
  initSelectionListeners();
  applyTheme(getSavedTheme());
  setScreen(state.user ? 'lab' : 'home');
  if (state.user) {
    dom.userLabel.textContent = `Bem-vinda, ${state.user}`;
    teca.showSidebarIntro();
  }
}

if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', boot);
}
