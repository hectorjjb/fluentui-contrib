import { MoverKeys } from '../types/Keys';
import { emitSyntheticMoverMoveFocusEvent } from './GamepadEvents';

describe('emitSyntheticMoverMoveFocusEvent', () => {
  afterEach(() => {
    document.body.replaceChildren();
  });

  it('selects and focuses the next radio', () => {
    const group = document.createElement('div');
    group.setAttribute('role', 'radiogroup');
    const firstRadio = document.createElement('input');
    firstRadio.type = 'radio';
    firstRadio.name = 'group';
    const secondRadio = document.createElement('input');
    secondRadio.type = 'radio';
    secondRadio.name = 'group';
    group.append(firstRadio, secondRadio);
    document.body.append(group);
    firstRadio.focus();

    emitSyntheticMoverMoveFocusEvent(MoverKeys.ArrowRight, document);

    expect(document.activeElement).toBe(secondRadio);
    expect(secondRadio.checked).toBe(true);
  });

  it('steps a slider and emits an input event', () => {
    const slider = document.createElement('input');
    slider.type = 'range';
    slider.min = '0';
    slider.max = '10';
    slider.step = '2';
    slider.value = '4';
    const onInput = jest.fn();
    const onChange = jest.fn();
    slider.addEventListener('input', onInput);
    slider.addEventListener('change', onChange);
    document.body.append(slider);
    slider.focus();

    emitSyntheticMoverMoveFocusEvent(MoverKeys.ArrowUp, document);

    expect(slider.value).toBe('6');
    expect(onInput).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it.each([
    ['spinbutton', 'spinbutton'],
    ['tree item', 'treeitem'],
  ])('emits arrow keyboard events for a %s', (_, role) => {
    const element = document.createElement('div');
    element.setAttribute('role', role);
    element.tabIndex = 0;
    const onKeyDown = jest.fn();
    const onKeyUp = jest.fn();
    element.addEventListener('keydown', onKeyDown);
    element.addEventListener('keyup', onKeyUp);
    document.body.append(element);
    element.focus();

    emitSyntheticMoverMoveFocusEvent(MoverKeys.ArrowDown, document);

    expect(onKeyDown).toHaveBeenCalledWith(
      expect.objectContaining({ key: 'ArrowDown' })
    );
    expect(onKeyUp).toHaveBeenCalledWith(
      expect.objectContaining({ key: 'ArrowDown' })
    );
  });

  it.each(['toolbar', 'listbox'])(
    'emits bubbling arrow keyboard events within a %s',
    (role) => {
      const container = document.createElement('div');
      container.setAttribute('role', role);
      const button = document.createElement('button');
      const onKeyDown = jest.fn();
      container.addEventListener('keydown', onKeyDown);
      container.append(button);
      document.body.append(container);
      button.focus();

      emitSyntheticMoverMoveFocusEvent(MoverKeys.ArrowRight, document);

      expect(onKeyDown).toHaveBeenCalledWith(
        expect.objectContaining({ key: 'ArrowRight' })
      );
    }
  );
});
