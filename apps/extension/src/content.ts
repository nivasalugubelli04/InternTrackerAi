// Content Script for form detection and filling

function getUniqueSelector(el: HTMLElement): string {
  if (el.id) return `#${el.id}`;
  if (el.name) return `input[name="${el.name}"]`;
  
  const path: string[] = [];
  let current: HTMLElement | null = el;
  while (current && current.nodeType === Node.ELEMENT_NODE) {
    let selector = current.nodeName.toLowerCase();
    if (current.id) {
      selector += `#${current.id}`;
      path.unshift(selector);
      break;
    } else {
      const sib = current.previousElementSibling;
      let nth = 1;
      let temp = sib;
      while (temp) {
        if (temp.nodeName === current.nodeName) {
          nth++;
        }
        temp = temp.previousElementSibling;
      }
      selector += `:nth-of-type(${nth})`;
    }
    path.unshift(selector);
    current = current.parentElement;
  }
  return path.join(' > ');
}

function scanFormFields() {
  const inputs = document.querySelectorAll('input, select, textarea');
  const detected: any[] = [];

  inputs.forEach((input: any) => {
    if (
      input.type === 'hidden' ||
      input.type === 'submit' ||
      input.type === 'button' ||
      input.type === 'image' ||
      input.type === 'radio'
    ) {
      return;
    }

    let labelText = '';

    if (input.getAttribute('aria-label')) {
      labelText = input.getAttribute('aria-label');
    } else if (input.placeholder) {
      labelText = input.placeholder;
    } else if (input.name) {
      labelText = input.name;
    }

    if (!labelText || labelText.length < 3) {
      if (input.id) {
        const label = document.querySelector(`label[for="${input.id}"]`);
        if (label) {
          labelText = label.textContent || '';
        }
      }
      if (!labelText) {
        const parentLabel = input.closest('label');
        if (parentLabel) {
          labelText = parentLabel.textContent || '';
        }
      }
    }

    labelText = labelText.trim().replace(/\s+/g, ' ');

    if (labelText && labelText.length > 1) {
      detected.push({
        fieldName: labelText,
        fieldType: input.type || 'text',
        selector: getUniqueSelector(input),
      });
    }
  });

  return detected.slice(0, 30); // Cap at 30 fields to reduce payload
}

function fillFields(fieldsToFill: Array<{ selector: string; value: string }>) {
  let fillCount = 0;
  fieldsToFill.forEach((f) => {
    try {
      const input = document.querySelector(f.selector) as any;
      if (input) {
        input.value = f.value;
        // Trigger React/Angular state bindings
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
        fillCount++;
      }
    } catch (e) {
      // Ignore invalid selectors
    }
  });
  return fillCount;
}

// Message Listener
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'content_scan_page') {
    const fields = scanFormFields();
    const isApplicationPage = fields.length >= 3; // heuristic check
    sendResponse({ success: true, fields, isApplicationPage, url: window.location.href });
  } else if (request.type === 'content_fill_fields') {
    const count = fillFields(request.payload.fields);
    sendResponse({ success: true, fillCount: count });
  }
  return true;
});
