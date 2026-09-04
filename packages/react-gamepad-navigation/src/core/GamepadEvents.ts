import { MoverMoveFocusEvent } from '@fluentui/react-tabster';
import {
  handlesDirectionalKeyboardEvents,
  isComboboxElement,
  isMenuItemElement,
  isRadioElement,
  isSliderElement,
  shouldSubmitForm,
} from './GamepadUtils';
import { getMoverKeyToKeyboardKeyMapping } from './GamepadMappings';
import { KeyboardKey, MoverKey } from '../types/Keys';

/*
    Synthetic Events
*/
const syntheticKey = Symbol('synthetic');

export type MouseSyntheticEvent = MouseEvent & {
  [syntheticKey]?: boolean;
};

export const isSyntheticMouseEvent = (
  evt: MouseEvent | React.MouseEvent<unknown, MouseEvent>
): boolean => {
  return evt instanceof MouseEvent
    ? !!(evt as MouseSyntheticEvent)?.[syntheticKey]
    : !!(evt.nativeEvent as MouseSyntheticEvent)?.[syntheticKey];
};

export const emitSyntheticKeyboardEvent = (
  event: 'keydown' | 'keyup',
  key: KeyboardKey,
  bubbles: boolean,
  targetDocument: Document
): void => {
  const activeElement = targetDocument.activeElement;
  const keyboardEvent = new KeyboardEvent(event, {
    key: key,
    bubbles,
    cancelable: true,
    view: targetDocument.defaultView,
    detail: 0,
    ctrlKey: false,
    altKey: false,
    shiftKey: false,
    metaKey: false,
  });
  Object.defineProperty(keyboardEvent, syntheticKey, {
    value: true,
    writable: false,
    enumerable: false,
  });
  activeElement?.dispatchEvent(keyboardEvent);
};

const emitSyntheticDirectionalKeyboardEvent = (
  key: KeyboardKey,
  targetDocument: Document
): void => {
  emitSyntheticKeyboardEvent('keydown', key, true, targetDocument);
  emitSyntheticKeyboardEvent('keyup', key, true, targetDocument);
};

const moveRadioSelection = (
  radio: HTMLInputElement,
  key: KeyboardKey
): boolean => {
  const radioGroup = radio.closest('[role="radiogroup"]');
  if (!radioGroup) {
    return false;
  }

  const radios = Array.from(
    radioGroup.querySelectorAll<HTMLInputElement>('input[type="radio"]')
  ).filter((item) => !item.disabled);
  const currentIndex = radios.indexOf(radio);
  if (currentIndex === -1 || radios.length < 2) {
    return false;
  }

  const offset =
    key === KeyboardKey.ArrowLeft || key === KeyboardKey.ArrowUp ? -1 : 1;
  const nextIndex = (currentIndex + offset + radios.length) % radios.length;
  const nextRadio = radios[nextIndex];

  nextRadio.focus();
  nextRadio.click();
  return true;
};

const stepSlider = (
  slider: HTMLInputElement,
  key: KeyboardKey
): boolean => {
  const shouldIncrement =
    key === KeyboardKey.ArrowRight || key === KeyboardKey.ArrowUp;

  if (slider.step === 'any') {
    const currentValue = Number(slider.value);
    const min = slider.min === '' ? 0 : Number(slider.min);
    const max = slider.max === '' ? 100 : Number(slider.max);
    slider.value = String(
      Math.min(max, Math.max(min, currentValue + (shouldIncrement ? 1 : -1)))
    );
  } else if (shouldIncrement) {
    slider.stepUp();
  } else {
    slider.stepDown();
  }

  slider.dispatchEvent(new Event('input', { bubbles: true }));
  slider.dispatchEvent(new Event('change', { bubbles: true }));
  return true;
};

export const emitSyntheticMouseEvent = (
  event: 'mousedown' | 'mouseup' | 'click',
  bubbles: boolean,
  targetDocument: Document
): void => {
  const activeElement = targetDocument.activeElement;
  const mouseEvent = new MouseEvent(event, {
    bubbles,
    cancelable: true,
    view: targetDocument.defaultView,
    detail: 0,
    screenX: undefined,
    screenY: undefined,
    clientX: undefined,
    clientY: undefined,
    ctrlKey: false,
    altKey: false,
    shiftKey: false,
    metaKey: false,
    button: 0,
    buttons: 0,
    relatedTarget: null,
  });
  Object.defineProperty(mouseEvent, syntheticKey, {
    value: true,
    writable: false,
    enumerable: false,
  });
  activeElement?.dispatchEvent(mouseEvent);
};

export const emitSyntheticMoverMoveFocusEvent = (
  key: MoverKey,
  targetDocument: Document
): void => {
  const activeElement = targetDocument.activeElement;
  const keyboardKey = getMoverKeyToKeyboardKeyMapping(key);

  if (isRadioElement(activeElement)) {
    if (moveRadioSelection(activeElement, keyboardKey)) {
      return;
    }
  } else if (isSliderElement(activeElement)) {
    if (stepSlider(activeElement, keyboardKey)) {
      return;
    }
  } else if (handlesDirectionalKeyboardEvents(activeElement)) {
    emitSyntheticDirectionalKeyboardEvent(keyboardKey, targetDocument);
    return;
  }

  activeElement?.dispatchEvent(new MoverMoveFocusEvent({ key }));
};

export const emitSyntheticGroupperMoveFocusEvent = (
  action: KeyboardKey,
  targetDocument: Document
): void => {
  const activeElement = targetDocument.activeElement;
  if (action === KeyboardKey.Enter) {
    // Note: GroupperMoveFocusActions.Enter has no effect on components
    // activeElement?.dispatchEvent(new GroupperMoveFocusEvent({ action: GroupperMoveFocusActions.Enter }));

    if (isComboboxElement(activeElement)) {
      emitSyntheticKeyboardEvent('keydown', action, true, targetDocument);
    } else {
      emitSyntheticMouseEvent('click', true, targetDocument);
    }
    if (shouldSubmitForm(activeElement)) {
      activeElement?.closest('form')?.requestSubmit?.();
    }
  } else {
    if (
      isComboboxElement(activeElement) &&
      activeElement?.getAttribute('aria-expanded') === 'true'
    ) {
      emitSyntheticMouseEvent('click', true, targetDocument);
    } else {
      const shouldBubble = isMenuItemElement(activeElement);
      emitSyntheticKeyboardEvent(
        'keydown',
        action,
        shouldBubble,
        targetDocument
      );
    }
  }
};
