// ==UserScript==
// @name         assd-autofill
// @namespace    Violentmonkey Scripts
// @version      1.2.2
// @description  Autofills new booking form: arrival (today), departure (tomorrow), guests, user, regcode. Also autofills customer mask.
// @match        https://*.assd.com/*
// @match        https://*.assd.com:9443/*
// @grant        none
// @updateURL    https://raw.githubusercontent.com/KaiserXanderW/assd-autofill/main/assd-autofill.user.js
// @downloadURL  https://raw.githubusercontent.com/KaiserXanderW/assd-autofill/main/assd-autofill.user.js
// ==/UserScript==

(function () {
  'use strict';

  // ── Config ────────────────────────────────────────────────────────────────
  const USER = 'WEGENSTEI3';

  // ── Date helpers ─────────────────────────────────────────────────────────
  function getCurrentDay()  { return String(new Date().getDate()); }
  function getTomorrowDay() { const d = new Date(); d.setDate(d.getDate() + 1); return String(d.getDate()); }

  // ── DOM helpers ──────────────────────────────────────────────────────────
  // The booking form opens inside a dialog tab; find the active one.
  function findActiveTab() {
    const titlebar = document.querySelector(
      '.ui-dialog-titlebar.ui-widget-header.ui-corner-all.ui-helper-clearfix.selected.tabbed.maximize.active'
    );
    if (!titlebar) return null;
    const span = titlebar.querySelector('span[id^="ui-id-"]');
    if (!span) return null;
    const num = span.id.match(/\d+/)[0];
    return document.querySelector(`div.ui-dialog[aria-labelledby="ui-id-${num}"]`);
  }

  // ── Datepicker ───────────────────────────────────────────────────────────
  function selectDateInDatepicker(activeTabDiv, triggerSelector, dayToSelect, callback) {
    const trigger = activeTabDiv.querySelector(triggerSelector);
    if (!trigger) {
      console.error(`[assd-autofill] Datepicker trigger not found: ${triggerSelector}`);
      return;
    }
    trigger.click();
    setTimeout(() => {
      const picker = document.querySelector('#ui-datepicker-div');
      if (!picker) { console.error('[assd-autofill] Datepicker div not found'); return; }

      let found = false;
      picker.querySelectorAll('.ui-datepicker-calendar tbody a.ui-state-default').forEach((a) => {
        if (a.textContent.trim() === dayToSelect) {
          a.click();
          found = true;
          setTimeout(() => {
            document.activeElement.blur();
            callback?.();
          }, 62);
        }
      });
      if (!found) console.error(`[assd-autofill] Day ${dayToSelect} not found in datepicker`);
    }, 62);
  }

  // ── Date autofill ─────────────────────────────────────────────────────────
  function autofillDates(activeTabDiv, callback) {
    if (!activeTabDiv) { console.error('[assd-autofill] Active tab not found'); return; }

    const arrivalInput    = activeTabDiv.querySelector('input[id^="arrival_ds"]');
    const departureInput  = activeTabDiv.querySelector('input[id^="departure_ds"]');
    const arrivalHidden   = activeTabDiv.querySelector('input[id^="arrival_dp"]');
    const departureHidden = activeTabDiv.querySelector('input[id^="departure_dp"]');
    const today           = getCurrentDay();
    const tomorrow        = getTomorrowDay();

    const arrivalEmpty   = arrivalInput  && !arrivalInput.value.trim()  && !arrivalHidden?.value.trim();
    const departureEmpty = departureInput && !departureInput.value.trim() && !departureHidden?.value.trim();

    console.log('[assd-autofill] autofillDates', {
      today, tomorrow,
      arrivalVisible:    arrivalInput?.value   ?? '(no element)',
      arrivalHidden:     arrivalHidden?.value  ?? '(no element)',
      departureVisible:  departureInput?.value ?? '(no element)',
      departureHidden:   departureHidden?.value ?? '(no element)',
      arrivalEmpty, departureEmpty,
    });

    if (arrivalEmpty) {
      console.log('[assd-autofill] filling arrival →', today);
      selectDateInDatepicker(activeTabDiv, '.ui-datepicker-trigger', today, () => {
        if (departureEmpty) {
          console.log('[assd-autofill] filling departure →', tomorrow);
          setTimeout(() => {
            selectDateInDatepicker(activeTabDiv, '#dep_date .ui-datepicker-trigger', tomorrow, callback);
          }, 150);
        } else {
          console.log('[assd-autofill] departure already set, skipping');
          callback?.();
        }
      });
    } else if (departureEmpty) {
      console.log('[assd-autofill] arrival already set, filling departure →', tomorrow);
      selectDateInDatepicker(activeTabDiv, '#dep_date .ui-datepicker-trigger', tomorrow, callback);
    } else {
      console.log('[assd-autofill] both dates already set, skipping');
      callback?.();
    }
  }

  // ── Field autofill ────────────────────────────────────────────────────────
  function fillFormFields(activeTabDiv, callback) {
    if (!activeTabDiv) { console.error('[assd-autofill] Active tab not found'); return; }

    setTimeout(() => {
      const guestBox = activeTabDiv.querySelector('#guest_r');
      if (guestBox) {
        guestBox.value = '1';
        guestBox.dispatchEvent(new Event('change', { bubbles: true }));
      }

      const userBox = activeTabDiv.querySelector('#ruser04');
      if (userBox) {
        userBox.value = '01';
        userBox.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'Tab' }));
      }

      const regcodeButton = activeTabDiv.querySelector('#regcode');
      if (regcodeButton) {
        regcodeButton.click();
        setTimeout(() => {
          const option = activeTabDiv.querySelector('.dropdown-menu.scrollable-menu li a[val="28"]');
          option?.click();
          callback?.();
        }, 62);
      }
    }, 125);
  }

  // ── Customer mask autofill ────────────────────────────────────────────────
  const CUSTOMER_FILLED = 'assd-customer-filled';

  function selectDropdownOption(dialog, buttonId, val) {
    const btn = dialog.querySelector(`#${buttonId}`);
    if (!btn || btn.value === val) return;
    btn.click();
    setTimeout(() => {
      btn.closest('.btn-group').querySelector(`.dropdown-menu a[val="${val}"]`)?.click();
    }, 62);
  }

  function autofillCustomerMask(dialog) {
    if (dialog.classList.contains(CUSTOMER_FILLED)) return;
    dialog.classList.add(CUSTOMER_FILLED);

    setTimeout(() => {
      selectDropdownOption(dialog, 'nation2', 'DE');
      selectDropdownOption(dialog, 'guestcode', '01');

      const lastname  = dialog.querySelector('#lastname')?.value?.trim()  ?? '';
      const firstname = dialog.querySelector('#firstname')?.value?.trim() ?? '';
      const matchInput = dialog.querySelector('#match1');

      if (matchInput && (lastname || firstname)) {
        const query = [lastname, firstname].filter(Boolean).join(', ').toUpperCase();
        matchInput.value = query;
        matchInput.dispatchEvent(new Event('input',  { bubbles: true }));
        matchInput.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true }));

        // Wait for autocomplete to populate, then pick the 3rd item
        setTimeout(() => {
          const items = document.querySelectorAll('.ui-autocomplete:not([style*="display: none"]) .ui-menu-item');
          if (items.length >= 3)      items[2].click();
          else if (items.length > 0)  items[items.length - 1].click();
          else console.warn('[assd-autofill] Matchcode autocomplete produced no items');
        }, 350);
      }
    }, 200);
  }

  function watchForCustomerMaskDialog() {
    new MutationObserver(() => {
      document.querySelectorAll(`.ui-dialog:not(.${CUSTOMER_FILLED})`).forEach((dialog) => {
        if (dialog.querySelector('.guestName')) autofillCustomerMask(dialog);
      });
    }).observe(document.body, { childList: true, subtree: true });
  }

  // ── Memo buttons ─────────────────────────────────────────────────────────
  function getMemoTimestamp() {
    const now = new Date();
    const dd  = String(now.getDate()).padStart(2, '0');
    const mm  = String(now.getMonth() + 1).padStart(2, '0');
    const yy  = String(now.getFullYear()).slice(-2);
    return `${dd}.${mm}.${yy} -  - ${USER}`;
  }

  function insertAtCursor(textarea, text) {
    const start = textarea.selectionStart;
    const end   = textarea.selectionEnd;
    textarea.value = textarea.value.slice(0, start) + text + textarea.value.slice(end);
    textarea.setSelectionRange(start + text.length, start + text.length);
    textarea.focus();
    textarea.dispatchEvent(new Event('input', { bubbles: true }));
  }

  function insertMemoTimestamp(textarea) {
    const stamp = getMemoTimestamp() + '\n';
    textarea.value = stamp + textarea.value;
    // Place cursor between the two dashes: "DD.MM.YY - " = 11 chars
    const cursorPos = stamp.indexOf(' -  - ') + ' - '.length;
    textarea.setSelectionRange(cursorPos, cursorPos);
    textarea.focus();
    textarea.dispatchEvent(new Event('input', { bubbles: true }));
  }

  function injectMemoButtons(dialog) {
    const memo = dialog.querySelector('#memo');
    if (!memo || dialog.querySelector('.assd-memo-injected')) return;

    const pickerBtn = dialog.querySelector('a.cmd_button.picker[field="memo"]');
    if (!pickerBtn) return;

    const parkingBtn = document.createElement('a');
    parkingBtn.className  = 'cmd_button picker assd-memo-injected';
    parkingBtn.title      = 'Parking added as per sender';
    parkingBtn.textContent = 'P';
    parkingBtn.style.cssText = 'cursor:pointer; margin-left:4px;';
    parkingBtn.addEventListener('click', (e) => {
      e.preventDefault();
      insertAtCursor(memo, 'Parking added as per sender');
    });

    const timestampBtn = document.createElement('a');
    timestampBtn.className  = 'cmd_button picker assd-memo-injected';
    timestampBtn.title      = 'Datum + Kürzel einfügen';
    timestampBtn.textContent = 'T';
    timestampBtn.style.cssText = 'cursor:pointer; margin-left:4px;';
    timestampBtn.addEventListener('click', (e) => {
      e.preventDefault();
      insertMemoTimestamp(memo);
    });

    pickerBtn.after(parkingBtn);
    parkingBtn.after(timestampBtn);
  }

  function watchForMemoField() {
    new MutationObserver(() => {
      document.querySelectorAll('.ui-dialog').forEach((dialog) => {
        if (dialog.querySelector('#memo') && !dialog.querySelector('.assd-memo-injected')) {
          injectMemoButtons(dialog);
        }
      });
    }).observe(document.body, { childList: true, subtree: true });
  }

  // ── Main flow ─────────────────────────────────────────────────────────────
  function autofillForm() {
    const activeTabDiv = findActiveTab();
    autofillDates(activeTabDiv, () => {
      fillFormFields(activeTabDiv, () => {
        watchForCmdGuestButton();
      });
    });
  }

  // Polls for the "new booking" button, then triggers autofill when clicked.
  function watchForCmdGuestButton() {
    const scanInterval = setInterval(() => {
      const btn = document.querySelector('#cmdguest3');
      if (btn) {
        btn.click();
        clearInterval(scanInterval);
        setTimeout(autofillForm, 125);
      }
    }, 200);
  }

  watchForCmdGuestButton();
  watchForCustomerMaskDialog();
  watchForMemoField();
})();
