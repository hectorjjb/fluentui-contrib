import {
  FluentGPNShadowDOMAPI,
  WindowWithFluentGPNShadowDOMAPI,
} from '../types/FluentGPNShadowDOMAPI';
import { consolePrefix } from './Constants';

export type TimeoutId = number | undefined;
export type IntervalId = number | undefined;

export const shouldSubmitForm = (
  element: Element | null | undefined
): boolean =>
  element instanceof HTMLInputElement &&
  (element.type === 'password' ||
    element.type === 'text' ||
    element.type === 'email' ||
    element.type === 'tel');

export const isComboboxElement = (
  element: Element | null | undefined
): boolean => {
  return element?.getAttribute('role') === 'combobox';
};

export const isSliderElement = (
  element: Element | null | undefined
): element is HTMLInputElement => {
  return (
    element?.tagName === 'INPUT' && element.getAttribute('type') === 'range'
  );
};

export const isMenuItemElement = (
  element: Element | null | undefined
): boolean => {
  return element?.getAttribute('role') === 'menuitem';
};

export const isRadioElement = (
  element: Element | null | undefined
): element is HTMLInputElement => {
  return (
    element?.tagName === 'INPUT' && element.getAttribute('type') === 'radio'
  );
};

export const handlesDirectionalKeyboardEvents = (
  element: Element | null | undefined
): boolean => {
  if (!element) {
    return false;
  }

  const role = element.getAttribute('role');
  return (
    role === 'combobox' ||
    role === 'spinbutton' ||
    role === 'treeitem' ||
    element.closest('[role="toolbar"], [role="listbox"]') !== null
  );
};

export const getShadowDOMAPI = (
  targetDocument: Document | undefined
): FluentGPNShadowDOMAPI | undefined => {
  const defaultView = targetDocument?.defaultView;
  const shadowDOMAPI = (defaultView as WindowWithFluentGPNShadowDOMAPI)
    ?.__FluentGPNShadowDOMAPI;
  return shadowDOMAPI;
};

export const isGamepadAPISupported = (
  targetView: Window | null
): targetView is Window => {
  let api = null;
  try {
    if (
      targetView?.navigator &&
      typeof targetView.navigator.getGamepads === 'function'
    ) {
      api = targetView.navigator.getGamepads();
    }
  } catch {
    console.warn(
      consolePrefix,
      'Failed to execute "getGamepads" on "Navigator": Access to the feature "gamepad" is denied'
    );
  }

  return api !== null;
};
