const MIN_SELECTION = 2;
const MAX_SELECTION = 120;
const DEDUPE_MS = 1200;

function isInteractiveTarget(target) {
  return Boolean(target && target.closest && target.closest('input, textarea, select, button'));
}

function isValidSelection(text) {
  return text.length >= MIN_SELECTION && text.length <= MAX_SELECTION;
}

export function createTecaAssistant({ getUserName, isAdminMode, getPreferredModels }) {
  let lastSelection = '';
  let lastAt = 0;
  let listenersBound = false;
  let lastExplained = '';

  function setSidebarMessage(message) {
    const status = document.getElementById('ai-status');
    const side = document.getElementById('side-conteudo');
    if (status) {
      status.textContent = message.includes('Consultando') ? 'Consultando...' : 'Pronta para ajudar';
    }
    if (side) {
      side.textContent = message;
    }
  }

  async function falarComIA(prompt) {
    const status = document.getElementById('ai-status');
    const side = document.getElementById('side-conteudo');
    if (!side) {
      return;
    }

    if (status) {
      status.textContent = 'Consultando...';
    }
    side.textContent = 'Consultando...';

    try {
      const response = await fetch('/api/ai', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt,
          nome: getUserName?.() || '',
          preferredModels: typeof getPreferredModels === 'function' ? getPreferredModels() : [],
        }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        console.error('[Teca API erro]', response.status, data);
        side.textContent = 'A Teca encontrou uma estante trancada. Verifique a chave do laboratório.';
        return;
      }

      if (data?.result) {
        side.textContent = data.result;
        lastExplained = String(prompt || '').replace(/^\[SISTEMA_EXPLICACAO\]\s*/i, '').trim();
      } else {
        console.warn('[Teca sem result]', data);
        side.textContent = 'A Teca voltou sem cartão de resposta. Veja o console.';
      }
    } catch (error) {
      console.error('[Teca explicação erro]', error);
      side.textContent = 'A Teca tropeçou nos livros. Tente de novo em instantes.';
    } finally {
      if (status) {
        status.textContent = 'Pronta para ajudar';
      }
    }
  }

  function analisarSelecao(event) {
    if (typeof isAdminMode === 'function' && isAdminMode()) {
      return;
    }

    if (document.body?.dataset?.screen !== 'lab') {
      return;
    }

    if (event && isInteractiveTarget(event.target)) {
      return;
    }

    const selection = window.getSelection()?.toString().trim() || '';
    if (!isValidSelection(selection)) {
      return;
    }

    const now = Date.now();
    if (selection === lastSelection && now - lastAt < DEDUPE_MS) {
      return;
    }

    lastSelection = selection;
    lastAt = now;
    console.log('[Teca seleção]', selection);
    return explicarTextoTeca(selection);
  }

  async function explicarTextoTeca(texto) {
    const clean = String(texto || '').trim();
    if (clean.length < MIN_SELECTION || clean.length > MAX_SELECTION) {
      return;
    }
    lastSelection = clean;
    lastAt = Date.now();
    return falarComIA('[SISTEMA_EXPLICACAO] ' + clean);
  }

  function explainSelectionManually() {
    const text = window.getSelection()?.toString().trim() || lastSelection;
    console.log('[Teca seleção]', text);
    return explicarTextoTeca(text);
  }

  function initSelectionListeners() {
    if (listenersBound) {
      return;
    }
    listenersBound = true;
    document.addEventListener('mouseup', (event) => {
      setTimeout(() => analisarSelecao(event), 100);
    });
    document.addEventListener('dblclick', (event) => {
      setTimeout(() => analisarSelecao(event), 100);
    });
    document.addEventListener('touchend', () => {
      setTimeout(analisarSelecao, 400);
    });
  }

  function showSidebarIntro() {
    setSidebarMessage('Selecione uma palavra ou frase e eu explico.');
  }

  return {
    falarComIA,
    analisarSelecao,
    explicarTextoTeca,
    explainSelectionManually,
    initSelectionListeners,
    setSidebarMessage,
    showSidebarIntro,
  };
}
