/* eslint-disable no-restricted-globals */

import { InputMode } from '../types/InputMode';
import { GamepadState } from '../types/Keys';
import { getGamepadMappings } from './GamepadMappings';
import { IntervalId } from './GamepadUtils';
import {
  isPollingEnabled,
  setDefaultInputMode,
  setInputMode,
  setPollingEnabled,
} from './InputManager';
import { handleGamepadInput } from './InputProcessor';

export const consolePrefix = '[GamepadNavigation]';

/*
    Synthetic Events
*/

const syntheticKey = Symbol('synthetic');

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace React {
    interface KeyboardEvent {
      readonly [syntheticKey]?: boolean;
    }
  }
  interface KeyboardEvent {
    readonly [syntheticKey]?: boolean;
  }
}

// export const isSyntheticMouseEvent = (
//   evt: React.MouseEvent<unknown, MouseEvent> | MouseEvent
// ): boolean => {
//   // TODO: Why does this get triggered twice when checking in an event callback?
//   return evt instanceof MouseEvent
//     ? !!evt?.[syntheticKey]
//     : !!evt.nativeEvent?.[syntheticKey];
// };

export const emitSyntheticKeyboardEvent = (
  event: 'keydown' | 'keyup',
  key: string
) => {
  const keyboardEvent = new KeyboardEvent(event, {
    key: key,
  });

  Object.defineProperty(keyboardEvent, syntheticKey, {
    value: true,
    writable: false,
    enumerable: false,
  });
  console.log(consolePrefix, `${key} ${event} triggered`);
  document.activeElement?.dispatchEvent(keyboardEvent);
};

/*
    Gamepad State & Polling
*/

// Gamepads & their state
const gamepads = new Map<number, Gamepad>();
let gamepadStates = new Map<number, GamepadState>();
export const getGamepadStates = (): Map<number, GamepadState> => gamepadStates;

// Gamepad polling
const updateGamepadState = () => {
  let nextGamepads: (Gamepad | null)[] = [];
  if (window.navigator && window.navigator.getGamepads) {
    nextGamepads = window.navigator.getGamepads();
  }
  const nextGamepadStates = new Map<number, GamepadState>();

  for (const gamepad of nextGamepads) {
    if (gamepad && gamepads.has(gamepad.index)) {
      gamepads.set(gamepad.index, gamepad);

      const previousState = gamepadStates.get(gamepad.index);
      if (previousState) {
        nextGamepadStates.set(gamepad.index, previousState);
      } else {
        nextGamepadStates.set(gamepad.index, {
          A: 0,
          B: 0,
          X: 0,
          Y: 0,
          LB: 0,
          RB: 0,
          DpadUp: 0,
          DpadDown: 0,
          DpadLeft: 0,
          DpadRight: 0,
          timestamp: gamepad.timestamp - 1,
        });
      }
    }
  }
  gamepadStates = nextGamepadStates;
};

let windowFocused = true;
export const shouldPollGamepads = () => windowFocused && isPollingEnabled();

let scanInterval: IntervalId;

const pollGamepads = () => {
  if (!shouldPollGamepads()) {
    stopGamepadPolling();
    return;
  }

  const gamepadMappings = getGamepadMappings();
  if (!gamepadMappings) {
    stopGamepadPolling();
    return;
  }

  updateGamepadState();

  if (gamepads.size === 0) {
    stopGamepadPolling();
    return;
  }

  for (const gamepadId of gamepads.keys()) {
    const gamepadState = gamepadStates.get(gamepadId);
    const gamepad = gamepads.get(gamepadId);

    if (!gamepad || !gamepadState) {
      continue;
    }

    if (gamepad.timestamp !== gamepadState.timestamp) {
      gamepadState.timestamp = gamepad.timestamp;

      handleGamepadInput(gamepad, gamepadId, gamepadMappings, gamepadState);
    }
  }
};

export const startGamepadPolling = (): void => {
  if (!scanInterval) {
    scanInterval = setInterval(pollGamepads, 50);
  }
};

export const stopGamepadPolling = (): void => {
  if (scanInterval) {
    clearInterval(scanInterval);
    scanInterval = undefined;
  }
};

const onGamepadConnect = (evt: GamepadEvent) => {
  gamepads.set(evt.gamepad.index, evt.gamepad);
  startGamepadPolling();
};

const onGamepadDisconnect = (evt: GamepadEvent) => {
  gamepads.delete(evt.gamepad.index);
  if (gamepads.size === 0) {
    stopGamepadPolling();
  }
};

/*
    General Events
*/

const onWindowBlur = (): void => {
  windowFocused = false;
  stopGamepadPolling();
};

const onWindowFocus = (): void => {
  windowFocused = true;
  if (isPollingEnabled()) {
    startGamepadPolling();
  }
};

/*
    Library Initialization/Deinitialization
*/

export interface GamepadNavigationProps {
  pollingEnabled?: boolean;
  defaultInputMode?: InputMode;
}

let gamepadInitialized = false;
// let gamepadScanInterval: number;

export const initGamepadNavigation = async (
  props?: GamepadNavigationProps
): Promise<void> => {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    console.warn(
      consolePrefix,
      'Unable to initialize gamepad navigation in a non-browser environment'
    );
    return;
  }

  // Don't try to initialize multiple times
  if (gamepadInitialized) {
    return;
  }
  gamepadInitialized = true;

  try {
    if (props) {
      if (props.defaultInputMode) {
        setDefaultInputMode(props.defaultInputMode);
        setInputMode(props.defaultInputMode);
      }
    }

    console.log(consolePrefix, 'Initializing gamepad navigation');

    /**
     * Add an initial list of gamepads. For platforms like smart TV,
     * if the user connects their controller before they open the Xbox app and
     * gamepad navigation is initialized, we never see a 'gamepadconnected' event in the app
     * and we never add the gamepad to our list. To fix this, on gamepad navigation initialization,
     * we look through the window.navigator's current gamepads and add those to our list to start.
     */
    if (window.navigator && window.navigator.getGamepads) {
      const gamepadsList = window.navigator.getGamepads();

      for (const gamepad of gamepadsList) {
        // Make sure the gamepad is connected and matches our provided filter before adding it
        if (gamepad && gamepad.connected) {
          gamepads.set(gamepad.index, gamepad);
        }
      }

      if (gamepads.size) {
        startGamepadPolling();
      }
    }

    const haveEvents = 'GamepadEvent' in window;
    const haveWebkitEvents = 'WebKitGamepadEvent' in window;

    if (haveEvents) {
      window.addEventListener('gamepadconnected', onGamepadConnect);
      window.addEventListener('gamepaddisconnected', onGamepadDisconnect);
    } else if (haveWebkitEvents) {
      window.addEventListener(
        'webkitgamepadconnected',
        onGamepadConnect as EventListener
      );
      window.addEventListener(
        'webkitgamepaddisconnected',
        onGamepadDisconnect as EventListener
      );
    }

    window.addEventListener('blur', onWindowBlur);
    window.addEventListener('focus', onWindowFocus);

    setPollingEnabled(props?.pollingEnabled ?? true);
  } catch (error) {
    console.error(
      consolePrefix,
      'Encountered error while initializing gamepad navigation',
      error
    );

    deinitGamepadNavigation();
  }
};

export const deinitGamepadNavigation = (): void => {
  if (!gamepadInitialized) {
    return;
  }
  gamepadInitialized = false;

  console.log(consolePrefix, 'Deinitializing gamepad navigation');

  setPollingEnabled(false);

  window.removeEventListener(
    'webkitgamepadconnected',
    onGamepadConnect as EventListener
  );
  window.removeEventListener(
    'webkitgamepaddisconnected',
    onGamepadDisconnect as EventListener
  );
  window.removeEventListener('gamepadconnected', onGamepadConnect);
  window.removeEventListener('gamepaddisconnected', onGamepadDisconnect);

  // clearInterval(gamepadScanInterval);
};