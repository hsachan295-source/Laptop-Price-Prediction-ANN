document.addEventListener('DOMContentLoaded', () => {
  // ── DOM References ──────────────────────────────────────────────────────
  const form       = document.getElementById('predictor-form');
  const btnSubmit  = document.getElementById('btn-submit');
  const btnReset   = document.getElementById('btn-reset');

  const stateIdle    = document.getElementById('state-idle');
  const stateLoading = document.getElementById('state-loading');
  const stateResult  = document.getElementById('state-result');

  const priceDisplay = document.getElementById('price-display');
  const usdVal       = document.getElementById('usd-val');
  const inrVal       = document.getElementById('inr-val');
  const metaInches   = document.getElementById('meta-inches');
  const metaRam      = document.getElementById('meta-ram');

  const currTabs  = document.querySelectorAll('.curr-tab');

  // Step elements
  const steps  = document.querySelectorAll('.step');   // 3 step indicators
  const panels = document.querySelectorAll('.panel');  // 3 form panels

  // ── State ───────────────────────────────────────────────────────────────
  let currentStep       = 1;
  let cachedPredictions = null;
  let activeCurrency    = 'EUR';
  let countTimer        = null;

  const currencySymbols = { EUR: '€', USD: '$', INR: '₹' };
  const currencyKeys    = { EUR: 'EUR', USD: 'USD', INR: 'INR' };

  // ── Step Navigation ─────────────────────────────────────────────────────
  function goToStep(n, markDone = false) {
    currentStep = n;

    steps.forEach((step, i) => {
      const num = i + 1;
      step.classList.remove('active', 'done');
      if (num === n) step.classList.add('active');
      else if (num < n) step.classList.add('done');
    });

    panels.forEach((panel, i) => {
      panel.classList.toggle('active', i + 1 === n);
    });
  }

  // Wire up the step header click (allow back-navigation)
  steps.forEach((step, i) => {
    step.addEventListener('click', () => {
      if (i + 1 <= currentStep) goToStep(i + 1);
    });
  });

  // Next / Prev buttons wiring
  document.querySelectorAll('[data-next]').forEach(btn => {
    btn.addEventListener('click', () => {
      const targetPanel = parseInt(btn.getAttribute('data-next'));
      const currentPanel = document.getElementById(`panel-${currentStep}`);
      const inputs = currentPanel.querySelectorAll('input, select');
      let allValid = true;

      inputs.forEach(input => {
        if (!input.checkValidity()) { input.reportValidity(); allValid = false; }
      });

      if (allValid) goToStep(targetPanel);
    });
  });

  document.querySelectorAll('[data-prev]').forEach(btn => {
    btn.addEventListener('click', () => {
      goToStep(parseInt(btn.getAttribute('data-prev')));
    });
  });

  // ── Load Categories ─────────────────────────────────────────────────────
  async function loadCategories() {
    try {
      const res  = await fetch('/api/categories');
      if (!res.ok) {
        throw new Error(`Server returned HTTP ${res.status}`);
      }
      const data = await res.json();
      if (!data || !data.Company) {
        throw new Error("Invalid or empty category metadata received from server");
      }

      fill('Company',          data.Company,          'HP');
      fill('TypeName',         data.TypeName,          'Notebook');
      fill('Cpu',              data.Cpu,               'Intel Core i5 7200U 2.5GHz');
      fill('Gpu',              data.Gpu,               'Intel HD Graphics 620');
      fill('ScreenResolution', data.ScreenResolution,  'Full HD 1920x1080');
      fill('Memory',           data.Memory,            '256GB SSD');
      fill('OpSys',            data.OpSys,             'Windows 10');
    } catch (e) {
      console.error('Failed to load categories:', e);
    }
  }

  function fill(id, values, defaultVal) {
    const el = document.getElementById(id);
    if (!el) return;
    el.innerHTML = '';
    values.forEach(v => {
      const opt = document.createElement('option');
      opt.value = v;
      opt.textContent = v;
      if (v === defaultVal) opt.selected = true;
      el.appendChild(opt);
    });
  }

  // ── UI State Switcher ───────────────────────────────────────────────────
  function showState(state) {
    stateIdle.style.display    = state === 'idle'    ? 'flex' : 'none';
    stateLoading.style.display = state === 'loading' ? 'flex' : 'none';
    stateResult.style.display  = state === 'result'  ? 'flex' : 'none';
  }

  // ── Loading Steps Animation ─────────────────────────────────────────────
  function animateLoadSteps() {
    const ls1 = document.getElementById('ls-1');
    const ls2 = document.getElementById('ls-2');
    const ls3 = document.getElementById('ls-3');

    ls1.className = 'load-step';
    ls2.className = 'load-step';
    ls3.className = 'load-step';

    // Step 1: done immediately (preprocessing already happened client-side)
    setTimeout(() => { ls1.className = 'load-step done'; }, 100);
    // Step 2: active after 200ms, done at 600ms
    setTimeout(() => { ls2.className = 'load-step active'; }, 200);
    setTimeout(() => { ls2.className = 'load-step done'; }, 700);
    // Step 3: active after 700ms
    setTimeout(() => { ls3.className = 'load-step active'; }, 750);
  }

  // ── Price Counter Animation ─────────────────────────────────────────────
  function animateTo(target, symbol) {
    if (countTimer) clearInterval(countTimer);
    const dur   = 900;  // ms
    const fps   = 60;
    const total = Math.round(dur / 1000 * fps);
    let frame   = 0;

    countTimer = setInterval(() => {
      frame++;
      const t = frame / total;
      const ease = 1 - Math.pow(1 - t, 3);           // ease-out cubic
      const val  = target * ease;

      priceDisplay.textContent = `${symbol}${val.toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      })}`;

      if (frame >= total) {
        clearInterval(countTimer);
        priceDisplay.textContent = `${symbol}${target.toLocaleString(undefined, {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2
        })}`;
      }
    }, 1000 / fps);
  }

  function renderPrice() {
    if (!cachedPredictions) return;
    const sym = currencySymbols[activeCurrency];
    const val = cachedPredictions[activeCurrency];
    animateTo(val, sym);
  }

  // ── Currency Tabs ───────────────────────────────────────────────────────
  currTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const curr = tab.getAttribute('data-curr');
      if (curr === activeCurrency) return;
      currTabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      activeCurrency = curr;
      renderPrice();
    });
  });

  // ── Form Submit ─────────────────────────────────────────────────────────
  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const fd = new FormData(form);
    const payload = {
      Inches:           parseFloat(fd.get('Inches')),
      Ram:              parseInt(fd.get('Ram')),
      Weight:           parseFloat(fd.get('Weight')),
      Company:          fd.get('Company'),
      TypeName:         fd.get('TypeName'),
      ScreenResolution: fd.get('ScreenResolution'),
      Cpu:              fd.get('Cpu'),
      Memory:           fd.get('Memory'),
      Gpu:              fd.get('Gpu'),
      OpSys:            fd.get('OpSys')
    };

    // UI → Loading
    showState('loading');
    animateLoadSteps();
    btnSubmit.classList.add('loading');

    try {
      const res  = await fetch('/predict', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(payload)
      });

      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Inference failed');

      cachedPredictions = data.predictions;
      const proc        = data.inputs_processed;

      // Populate side metric cards
      usdVal.textContent     = `$${data.predictions.USD.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      inrVal.textContent     = `₹${data.predictions.INR.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      metaInches.textContent = `${proc.Inches_int}" (→ ${proc.Inches_scaled.toFixed(3)})`;
      metaRam.textContent    = `${proc.Ram_int}GB (→ ${proc.Ram_scaled.toFixed(3)})`;

      // Reset currency to EUR on new prediction
      activeCurrency = 'EUR';
      currTabs.forEach(t => t.classList.toggle('active', t.getAttribute('data-curr') === 'EUR'));

      // UI → Result
      showState('result');
      renderPrice();

    } catch (err) {
      console.error(err);
      showState('idle');
      alert(`⚠️ Prediction failed: ${err.message}`);
    } finally {
      btnSubmit.classList.remove('loading');
    }
  });

  // ── Reset ────────────────────────────────────────────────────────────────
  btnReset.addEventListener('click', () => {
    form.reset();
    cachedPredictions = null;
    activeCurrency    = 'EUR';
    goToStep(1);
    showState('idle');
    loadCategories(); // Repopulate defaults
  });

  // ── Input Guards ─────────────────────────────────────────────────────────
  const guard = (id, min, max) => {
    document.getElementById(id)?.addEventListener('change', function () {
      const v = parseFloat(this.value);
      if (isNaN(v) || v < min) this.value = min;
      if (v > max) this.value = max;
    });
  };
  guard('Inches', 10, 21);
  guard('Ram', 2, 64);
  guard('Weight', 0.5, 6);

  // ── Boot ──────────────────────────────────────────────────────────────────
  showState('idle');
  loadCategories();

  // ── AI Model Status Polling ───────────────────────────────────────────────
  const warmupOverlay = document.getElementById('ai-warmup-overlay');
  const warmupStatus  = document.getElementById('warmup-status-text');

  async function checkAIStatus() {
    try {
      const res = await fetch('/api/status');
      if (res.ok) {
        const data = await res.json();
        if (data.ready) {
          // Model is fully loaded and ready! Animate the overlay out smoothly
          if (warmupOverlay) {
            warmupOverlay.classList.add('fade-out');
            setTimeout(() => {
              warmupOverlay.remove();
            }, 600);
          }
          return;
        } else {
          // Still loading in the background thread
          if (warmupStatus) {
            warmupStatus.textContent = "AI Neural Network model is loading... Warmup in progress (TensorFlow environment initialization).";
          }
        }
      }
    } catch (e) {
      console.error("Error checking AI status:", e);
    }

    // Poll again in 2 seconds
    setTimeout(checkAIStatus, 2000);
  }

  // Start checking status on load
  checkAIStatus();
});
