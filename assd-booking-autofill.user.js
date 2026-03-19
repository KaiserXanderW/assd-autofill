// ==UserScript==
// @name         assd-booking-autofill
// @namespace    Violentmonkey Scripts
// @version      1.0.0
// @description  Autofills new booking form: arrival (today), departure (tomorrow), guests, user, regcode
// @match        https://*.assd.com/*
// @match        https://*.assd.com:9443/*
// @grant        none
// ==/UserScript==

(function () {
  'use strict';

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
      console.error(`[assd-booking-autofill] Datepicker trigger not found: ${triggerSelector}`);
      return;
    }
    trigger.click();
    setTimeout(() => {
      const picker = document.querySelector('#ui-datepicker-div');
      if (!picker) { console.error('[assd-booking-autofill] Datepicker div not found'); return; }

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
      if (!found) console.error(`[assd-booking-autofill] Day ${dayToSelect} not found in datepicker`);
    }, 62);
  }

  // ── Date autofill ─────────────────────────────────────────────────────────
  function autofillDates(activeTabDiv, callback) {
    if (!activeTabDiv) { console.error('[assd-booking-autofill] Active tab not found'); return; }

    const arrivalInput   = activeTabDiv.querySelector('input[id^="arrival_ds"]');
    const departureInput = activeTabDiv.querySelector('input[id^="departure_ds"]');
    const today          = getCurrentDay();
    const tomorrow       = getTomorrowDay();

    if (arrivalInput && !arrivalInput.value.trim()) {
      selectDateInDatepicker(activeTabDiv, '.ui-datepicker-trigger', today, () => {
        if (departureInput && !departureInput.value.trim()) {
          setTimeout(() => {
            selectDateInDatepicker(activeTabDiv, '#dep_date .ui-datepicker-trigger', tomorrow, callback);
          }, 150);
        } else {
          callback?.();
        }
      });
    } else if (departureInput && !departureInput.value.trim()) {
      selectDateInDatepicker(activeTabDiv, '#dep_date .ui-datepicker-trigger', tomorrow, callback);
    } else {
      callback?.();
    }
  }

  // ── Field autofill ────────────────────────────────────────────────────────
  function fillFormFields(activeTabDiv, callback) {
    if (!activeTabDiv) { console.error('[assd-booking-autofill] Active tab not found'); return; }

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
})();
